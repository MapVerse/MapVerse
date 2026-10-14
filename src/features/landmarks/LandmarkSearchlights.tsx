import { Layer } from '@vis.gl/react-maplibre'
import type { CustomLayerInterface, Map as MapLibreMap } from 'maplibre-gl'
import { useTheme } from '../../theme/theme.ts'
import { LANDMARKS } from './catalog.ts'
import { offset } from './geometry.ts'
import { TONES, aim, mercator, pose, project } from './searchlights.ts'

/** Every searchlight, where it stands and in which colour. */
const LIGHTS = LANDMARKS.flatMap(({ near, searchlights = [] }) =>
  searchlights.map(({ at, tone }) => ({
    at: offset(near, at),
    color: TONES[tone],
  })),
)

/** How far a beam reaches before it has faded out, in metres. */
const REACH = 520
/** How wide a beam looks at its foot and at its tip, in CSS pixels. */
const WIDTH: [number, number] = [3, 40]
const BRIGHTNESS = 0.55
/** The zooms over which the beams come into view. */
const FADE_IN: [number, number] = [13.5, 15]

/*
 * Each beam is drawn as a strip facing the camera from its foot to its tip,
 * its ends worked out here in double precision: the map's world is too big
 * for the GPU's single precision to place it steadily. Its light is added
 * to what is behind it, brightest down its middle and fading along it.
 */
const VERTEX = `#version 300 es
in vec2 a_pos;
uniform vec4 u_foot;
uniform vec4 u_tip;
uniform vec2 u_viewport;
uniform vec2 u_width;
out vec2 v_pos;
void main() {
  vec4 foot = u_foot;
  vec4 tip = u_tip;
  // Cut the beam off where it passes behind the camera
  float near = 0.0001;
  float reach = 1.0;
  if (tip.w < near) {
    reach = (foot.w - near) / (foot.w - tip.w);
    tip = mix(foot, tip, reach);
  }
  vec4 p = mix(foot, tip, a_pos.x);
  vec2 along = (tip.xy / tip.w - foot.xy / foot.w) * u_viewport;
  vec2 dir = length(along) > 0.001 ? normalize(along) : vec2(0.0, 1.0);
  float width = mix(u_width.x, u_width.y, a_pos.x * reach);
  p.xy += vec2(-dir.y, dir.x) * a_pos.y * width / u_viewport * p.w;
  gl_Position = p;
  v_pos = vec2(a_pos.x * reach, a_pos.y);
}`

const FRAGMENT = `#version 300 es
precision mediump float;
in vec2 v_pos;
uniform vec3 u_color;
uniform float u_alpha;
out vec4 color;
void main() {
  float across = 0.6 * exp(-4.0 * v_pos.y * v_pos.y)
    + 0.4 * exp(-40.0 * v_pos.y * v_pos.y);
  float along = pow(1.0 - v_pos.x, 1.2) * smoothstep(0.0, 0.015, v_pos.x);
  float a = u_alpha * across * along;
  color = vec4(u_color * a, a);
}`

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'shader failed')
  }
  return shader
}

const smoothstep = (from: number, to: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)))
  return t * t * (3 - 2 * t)
}

/** Whether a light stands within (or near) the map's view. */
function inView(map: MapLibreMap) {
  const bounds = map.getBounds()
  const margin = 0.02
  return LIGHTS.some(
    ({ at: [lng, lat] }) =>
      lng > bounds.getWest() - margin &&
      lng < bounds.getEast() + margin &&
      lat > bounds.getSouth() - margin &&
      lat < bounds.getNorth() + margin,
  )
}

/**
 * The searchlights as a layer drawn straight onto the map's GL canvas:
 * beams of light leaning out and sweeping round the sky, crossing one
 * another. They keep still for those who would rather not have motion,
 * and stop drawing where none is in view.
 */
function searchlightLayer(): CustomLayerInterface {
  let state:
    | {
        map: MapLibreMap
        program: WebGLProgram
        vao: WebGLVertexArrayObject
        buffer: WebGLBuffer
        uniforms: Record<string, WebGLUniformLocation | null>
        ground: number[]
        groundAt: number
        still: boolean
      }
    | undefined

  return {
    id: 'landmark-searchlights',
    type: 'custom',
    renderingMode: '3d',
    onAdd(map, gl) {
      const program = gl.createProgram()!
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX))
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT))
      gl.linkProgram(program)
      const vao = gl.createVertexArray()!
      gl.bindVertexArray(vao)
      const buffer = gl.createBuffer()!
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      // Along the beam (0 at its foot, 1 at its tip) and across it
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([0, -1, 0, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      )
      const position = gl.getAttribLocation(program, 'a_pos')
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
      gl.bindVertexArray(null)
      const uniforms = Object.fromEntries(
        ['u_foot', 'u_tip', 'u_viewport', 'u_width', 'u_color', 'u_alpha'].map(
          (name) => [name, gl.getUniformLocation(program, name)],
        ),
      )
      state = {
        map,
        program,
        vao,
        buffer,
        uniforms,
        ground: LIGHTS.map(() => 0),
        groundAt: 0,
        still: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      }
    },
    onRemove(_map, gl) {
      if (!state) return
      gl.deleteProgram(state.program)
      gl.deleteVertexArray(state.vao)
      gl.deleteBuffer(state.buffer)
      state = undefined
    },
    render(gl, { defaultProjectionData }) {
      if (!state) return
      const { map, program, vao, uniforms } = state
      const fade = smoothstep(...FADE_IN, map.getZoom())
      if (fade <= 0 || !inView(map)) return
      const now = performance.now()
      // The ground under each light, with the 3D terrain on: now and then
      if (now - state.groundAt > 1000) {
        state.groundAt = now
        state.ground = LIGHTS.map(
          ({ at }) => map.queryTerrainElevation(at) ?? 0,
        )
      }
      const seconds = state.still ? 0 : now / 1000
      const matrix = defaultProjectionData.mainMatrix
      const ratio = gl.drawingBufferWidth / map.getCanvas().clientWidth

      gl.useProgram(program)
      gl.bindVertexArray(vao)
      gl.uniform2f(
        uniforms.u_viewport,
        gl.drawingBufferWidth,
        gl.drawingBufferHeight,
      )
      gl.uniform2f(uniforms.u_width, WIDTH[0] * ratio, WIDTH[1] * ratio)
      gl.enable(gl.BLEND)
      // Light adds to what is behind it
      gl.blendFunc(gl.ONE, gl.ONE)
      gl.depthMask(false)
      LIGHTS.forEach(({ at, color }, i) => {
        const { x, y, z, metre } = mercator(at, state!.ground[i] + 1)
        const { azimuth, tilt, brightness } = pose(i, LIGHTS.length, seconds)
        const [east, north, up] = aim(tilt, azimuth)
        const length = REACH * metre
        const foot = project(matrix, [x, y, z])
        if (foot[3] <= 0) return
        const tip = project(matrix, [
          x + east * length,
          // The map's square runs north to south
          y - north * length,
          z + up * length,
        ])
        gl.uniform4f(uniforms.u_foot, ...foot)
        gl.uniform4f(uniforms.u_tip, ...tip)
        gl.uniform3f(uniforms.u_color, ...color)
        gl.uniform1f(uniforms.u_alpha, BRIGHTNESS * brightness * fade)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      })
      gl.depthMask(true)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.bindVertexArray(null)
      if (!state.still) map.triggerRepaint()
    },
  }
}

const SEARCHLIGHTS = searchlightLayer()

/** Searchlights sweeping the sky over the landmarks that have them, at night. */
export default function LandmarkSearchlights({
  beforeId,
}: {
  beforeId?: string
}) {
  const theme = useTheme()
  if (theme !== 'dark' || !LIGHTS.length) return null
  return <Layer {...SEARCHLIGHTS} beforeId={beforeId} />
}
