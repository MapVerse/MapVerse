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
/** How long between frames as the beams sweep, in ms: about 30 a second. */
const FRAME_MS = 1000 / 30
/** How long the beams sweep on with nothing done on the map, in ms. */
const IDLE_MS = 60_000
/** What on the map, done by the user, keeps the beams sweeping. */
const ACTIVITY = [
  'movestart',
  'move',
  'mousedown',
  'mousemove',
  'touchstart',
  'wheel',
] as const

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

/** A shader compiled from its source, or null (logged) if it won't compile. */
function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('Searchlight shader:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/**
 * The beams' program, or null (logged) if it can't be built: the map then
 * goes on without them. Its shaders are let go once it is linked.
 */
function link(gl: WebGL2RenderingContext) {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT)
  const program = vertex && fragment ? gl.createProgram() : null
  if (program) {
    gl.attachShader(program, vertex!)
    gl.attachShader(program, fragment!)
    gl.linkProgram(program)
    gl.detachShader(program, vertex!)
    gl.detachShader(program, fragment!)
  }
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (program && !gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('Searchlight program:', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  return program
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
        /** How far the sweep has gone, in ms: only on while it is animated */
        clock: number
        lastFrame: number
        /** When the user last did something on the map */
        activeAt: number
        /** The next frame asked for, waiting for its time */
        frame?: ReturnType<typeof setTimeout>
        reducedMotion: MediaQueryList
        onMotionChange: () => void
        onActivity: () => void
      }
    | undefined

  return {
    id: 'landmark-searchlights',
    type: 'custom',
    renderingMode: '3d',
    onAdd(map, gl) {
      const program = link(gl)
      if (!program) return
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
      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      )
      // Paused for a while with nothing done, the beams sweep on from where
      // they stopped once something is
      const onActivity = () => {
        if (!state) return
        const paused = performance.now() - state.activeAt > IDLE_MS
        state.activeAt = performance.now()
        if (paused) map.triggerRepaint()
      }
      const onMotionChange = () => {
        if (!state) return
        state.still = reducedMotion.matches
        map.triggerRepaint()
      }
      const now = performance.now()
      state = {
        map,
        program,
        vao,
        buffer,
        uniforms,
        ground: LIGHTS.map(() => 0),
        groundAt: 0,
        still: reducedMotion.matches,
        clock: 0,
        lastFrame: now,
        activeAt: now,
        reducedMotion,
        onMotionChange,
        onActivity,
      }
      reducedMotion.addEventListener('change', onMotionChange)
      for (const type of ACTIVITY) map.on(type, onActivity)
    },
    onRemove(map, gl) {
      if (!state) return
      clearTimeout(state.frame)
      state.reducedMotion.removeEventListener('change', state.onMotionChange)
      for (const type of ACTIVITY) map.off(type, state.onActivity)
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
      // The sweep goes on only while it is animated, and at most a tenth of
      // a second a frame, so it carries on from where it stopped
      const animated = !state.still && now - state.activeAt <= IDLE_MS
      if (animated) state.clock += Math.min(now - state.lastFrame, 100)
      state.lastFrame = now
      const seconds = state.still ? 0 : state.clock / 1000
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
      // The next frame of the sweep, not sooner than its time: the whole
      // map is drawn again for it
      if (animated && state.frame === undefined) {
        const wait = Math.max(0, FRAME_MS - (performance.now() - now))
        state.frame = setTimeout(() => {
          if (!state) return
          state.frame = undefined
          map.triggerRepaint()
        }, wait)
      }
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
