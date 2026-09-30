import type { FeatureCollection, Point, Polygon } from 'geojson'
import type { ExpressionSpecification } from 'maplibre-gl'
import type { Theme } from '../../theme/theme.ts'
import type { Deck } from './decks.ts'
import { offset, type XY } from './geometry.ts'

export type { XY } from './geometry.ts'

/** A point on an outline: its radius at a height, both in metres. */
export type ProfilePoint = [radius: number, height: number]

export type Material =
  | 'concrete'
  | 'stone'
  | 'andesite'
  | 'shade'
  | 'ochre'
  | 'whitewash'
  | 'steel'
  | 'glass'
  | 'tint'
  | 'windows'
  | 'lead'
  | 'roof'
  | 'rock'
  | 'paving'
  | 'asphalt'
  | 'leaf'
  | 'flag'
  | 'lamp'
  | 'cable'
  | 'sign'
  | 'green'
  | 'red'
  | 'water'

/**
 * A piece of a landmark, in metres round its centre: either turned round
 * a point from an outline, or a footprint raised between two heights.
 */
export type Part =
  | {
      kind: 'round'
      /** From the bottom up */
      outline: ProfilePoint[]
      material: Material
      /** Faces round the axis; 8 makes an octagon */
      sides?: number
      /** Off the centre, like a column or a minaret */
      at?: XY
    }
  | {
      kind: 'block'
      footprint: XY[]
      /** Courtyards within it */
      holes?: XY[][]
      base: number
      top: number
      material: Material
    }

/**
 * A landmark drawn in 3D where it stands, in place of the map's own
 * plain buildings for it.
 */
export type Landmark = {
  id: string
  name: string
  /** Its centre, as OpenStreetMap has it */
  near: [number, number]
  /**
   * The map's buildings it replaces: those taller than `tallerThan` that
   * come within `within` metres of a point (in metres from its centre).
   * A point inside a building clears it (and its parts) with `within: 1`.
   */
  hide: { at?: XY; within: number; tallerThan: number }[]
  parts: Part[]
  /** Where its floodlights and lamps light the ground, at night */
  lights?: XY[]
  /**
   * How it sits on the 3D terrain: level on the ground at its centre (by
   * default), each piece on the ground under it (walls up a hill), or
   * measured from the sea (a bridge)
   */
  terrain?: 'level' | 'follow' | 'sea'
  /** A road raised across it, for routes to run on */
  deck?: Deck
}

export const MATERIAL_COLORS: Record<Theme, Record<Material, string>> = {
  light: {
    concrete: '#e4e0d9',
    stone: '#d6c7ab',
    andesite: '#b9ad9c',
    shade: '#b9a98c',
    ochre: '#d9b99d',
    whitewash: '#f3f0ea',
    steel: '#d3d8dd',
    glass: '#7fa2bf',
    tint: '#56758f',
    windows: '#56758f',
    lead: '#7c8993',
    roof: '#a3abb3',
    rock: '#c8c0b1',
    paving: '#e6e1d7',
    asphalt: '#9ba1a8',
    leaf: '#8dbb77',
    flag: '#e30a17',
    lamp: '#ece8dc',
    cable: '#c4cad1',
    sign: '#1f5fc4',
    green: '#79a37e',
    red: '#b8483d',
    water: '#9ccbe8',
  },
  // At night: stone and plaster floodlit in warm light, windows lit from
  // inside, lamps and the bridge's cables glowing
  dark: {
    concrete: '#8f8c86',
    stone: '#9c8360',
    andesite: '#8a7862',
    shade: '#4a3d2e',
    ochre: '#9a6e55',
    whitewash: '#b8b3a8',
    steel: '#7d8896',
    glass: '#34506c',
    tint: '#2c4258',
    windows: '#d7ad5f',
    lead: '#56606c',
    roof: '#4b525c',
    rock: '#3d3a35',
    paving: '#4f4c47',
    asphalt: '#2c3137',
    leaf: '#2c4a38',
    flag: '#c8141f',
    lamp: '#ffd98a',
    cable: '#b8d3ff',
    sign: '#5a9bff',
    green: '#2d4636',
    red: '#7a2b24',
    water: '#1f4466',
  },
}

/** Materials lit by floodlights from the ground at night. */
const FLOODLIT: ReadonlySet<Material> = new Set([
  'concrete',
  'stone',
  'andesite',
  'ochre',
  'whitewash',
])
/** How high floodlights reach before the light fades, in metres. */
const FLOOD_REACH = 24
const FLOOD_COLOR = '#ffe7bf'

/** A colour part way (`t`, from 0 to 1) towards another. */
export function mix(from: string, to: string, t: number): string {
  const channel = (hex: string, i: number) =>
    parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16)
  return `#${[0, 1, 2]
    .map((i) =>
      Math.round(channel(from, i) + (channel(to, i) - channel(from, i)) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

/** A floodlit wall's colour at a height: brightest at its foot. */
const floodlit = (color: string, height: number) =>
  mix(color, FLOOD_COLOR, 0.45 * Math.max(0, 1 - height / FLOOD_REACH))

/** Which way a ring winds: 1 anticlockwise, -1 clockwise. */
function winding(ring: XY[]): number {
  let area = 0
  ring.forEach(([x0, y0], i) => {
    const [x1, y1] = ring[(i + 1) % ring.length]
    area += x0 * y1 - x1 * y0
  })
  return Math.sign(area)
}

function ring(center: [number, number], radius: number, sides: number) {
  const points: [number, number][] = []
  for (let i = 0; i <= sides; i++) {
    const a = (i / sides) * 2 * Math.PI
    points.push(offset(center, [radius * Math.cos(a), radius * Math.sin(a)]))
  }
  return points
}

/**
 * Landmarks as the map's own 3D extrusions: blocks as they are, and round
 * parts as stacked rings, sloped ones (roofs, domes) narrowing ring by
 * ring.
 */
export function landmarkExtrusions(
  landmarks: Landmark[],
  theme: Theme,
): FeatureCollection<Polygon> {
  const colors = MATERIAL_COLORS[theme]
  const features: FeatureCollection<Polygon>['features'] = []
  // How the landmark being drawn sits on the terrain: level on the ground
  // at this point, level on the sea (null), or following the ground
  let ground: [number, number] | null | 'follow' = null
  const push = (
    rings: [number, number][][],
    base: number,
    height: number,
    color: string,
  ) =>
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: rings },
      properties: { base, height, color, ground },
    })
  const add = (
    rings: [number, number][][],
    base: number,
    height: number,
    material: Material,
  ) => {
    const color = colors[material]
    if (theme === 'light' || !FLOODLIT.has(material)) {
      return push(rings, base, height, color)
    }
    // Floodlit from the ground: in bands, brighter towards the foot
    const top = Math.min(height, FLOOD_REACH)
    const bands = Math.max(1, Math.ceil((top - base) / 3))
    for (let i = 0; i < bands && base < top; i++) {
      const [b, t] = [
        base + ((top - base) * i) / bands,
        base + ((top - base) * (i + 1)) / bands,
      ]
      push(rings, b, t, floodlit(color, (b + t) / 2))
    }
    if (height > Math.max(base, FLOOD_REACH)) {
      const b = Math.max(base, FLOOD_REACH)
      push(rings, b, height, floodlit(color, (b + height) / 2))
    }
  }
  for (const { near, parts, terrain = 'level' } of landmarks) {
    ground = { level: near, sea: null, follow: 'follow' as const }[terrain]
    const closed = (footprint: XY[]) => {
      const points = footprint.map((p) => offset(near, p))
      return [...points, points[0]]
    }
    for (const part of parts) {
      if (part.kind === 'block') {
        // Holes wound against the outline, or the map fills them in
        const outline = winding(part.footprint)
        const holes = (part.holes ?? []).map((hole) =>
          winding(hole) === outline ? [...hole].reverse() : hole,
        )
        const rings = [part.footprint, ...holes].map(closed)
        add(rings, part.base, part.top, part.material)
        continue
      }
      const { outline, sides = 48 } = part
      const center = part.at ? offset(near, part.at) : near
      for (let i = 0; i < outline.length - 1; i++) {
        const [r0, h0] = outline[i]
        const [r1, h1] = outline[i + 1]
        // Flat steps (ledges) have no height to show
        if (h1 - h0 < 0.05) continue
        const steps = Math.max(1, Math.ceil(Math.abs(r1 - r0) / 0.6))
        for (let j = 0; j < steps; j++) {
          const radius = r0 + ((r1 - r0) * (j + 0.5)) / steps
          if (radius < 0.05) continue
          add(
            [ring(center, radius, sides)],
            h0 + ((h1 - h0) * j) / steps,
            h0 + ((h1 - h0) * (j + 1)) / steps,
            part.material,
          )
        }
      }
    }
  }
  return { type: 'FeatureCollection', features }
}

/**
 * Landmarks' pieces set on the 3D terrain. The map raises each piece by
 * the ground's height at the piece's own centre, which on a slope would
 * leave the pieces of a landmark at odds with each other. This takes the
 * difference back off, so each landmark stands level on the ground at its
 * centre (a bridge on the sea), while the pieces that reach down to the
 * ground still reach it wherever they stand.
 */
export function onTerrain(
  { features }: FeatureCollection<Polygon>,
  elevation: (at: [number, number]) => number,
): FeatureCollection<Polygon> {
  const grounds = new Map<string, number>()
  const groundAt = (at: [number, number] | null) => {
    if (!at) return 0
    const key = at.join()
    if (!grounds.has(key)) grounds.set(key, elevation(at))
    return grounds.get(key)!
  }
  return {
    type: 'FeatureCollection',
    features: features.map((feature) => {
      const { base, height, ground } = feature.properties!
      if (ground === 'follow') return feature
      const ring = feature.geometry.coordinates[0].slice(0, -1)
      const center: [number, number] = [
        ring.reduce((sum, [lng]) => sum + lng, 0) / ring.length,
        ring.reduce((sum, [, lat]) => sum + lat, 0) / ring.length,
      ]
      const lift = elevation(center) - groundAt(ground)
      return {
        ...feature,
        properties: {
          ...feature.properties,
          // Where the ground rises over a piece, it is left underground
          base: base > 0 ? Math.max(0, base - lift) : 0,
          height: Math.max(0, height - lift),
        },
      }
    }),
  }
}

/** The spots the landmarks light at night, for a glow on the ground. */
export function landmarkLights(
  landmarks: Landmark[],
): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: landmarks.flatMap(({ near, lights = [] }) =>
      lights.map((at) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: offset(near, at) },
        properties: {},
      })),
    ),
  }
}

/** Where the map's own buildings make way for a landmark. */
export type HideZone = {
  center: [number, number]
  within: number
  tallerThan: number
}

export function hideZones(landmarks: Landmark[]): HideZone[] {
  return landmarks.flatMap(({ near, hide }) =>
    hide.map(({ at, within, tallerThan }) => ({
      center: at ? offset(near, at) : near,
      within,
      tallerThan,
    })),
  )
}

/** A building filter that leaves out the buildings in these zones. */
export function hideBuildings(
  zones: readonly HideZone[],
): ExpressionSpecification {
  return [
    'all',
    true,
    ...zones.map(({ center, within, tallerThan }): ExpressionSpecification => [
      '!',
      [
        'all',
        ['>', ['coalesce', ['get', 'render_height'], 0], tallerThan],
        // How near the building comes to the point: 0 when it stands on it
        ['<', ['distance', { type: 'Point', coordinates: center }], within],
      ],
    ]),
  ] as ExpressionSpecification
}
