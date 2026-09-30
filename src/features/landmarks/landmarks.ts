import type { FeatureCollection, Polygon } from 'geojson'
import type { ExpressionSpecification } from 'maplibre-gl'
import type { Theme } from '../../theme/theme.ts'

/** A point on an outline: its radius at a height, both in metres. */
export type ProfilePoint = [radius: number, height: number]

export type Material =
  'concrete' | 'stone' | 'whitewash' | 'glass' | 'windows' | 'lead' | 'rock'

/**
 * A piece of a landmark, in metres from the landmark's point (x east,
 * y north): either turned round the point from an outline, or a footprint
 * raised between two heights.
 */
export type Part =
  | {
      kind: 'round'
      /** From the bottom up */
      outline: ProfilePoint[]
      material: Material
      /** Faces round the axis; 8 makes an octagon */
      sides?: number
    }
  | {
      kind: 'block'
      footprint: [x: number, y: number][]
      base: number
      top: number
      material: Material
    }

export type Landmark = {
  id: string
  name: string
  lngLat: [number, number]
  parts: Part[]
  /** The map's own buildings it replaces: those this near and this tall */
  replaces: { within: number; tallerThan: number }
}

const rect = (x0: number, y0: number, x1: number, y1: number) =>
  [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ] as [number, number][]

const ellipse = (rx: number, ry: number, steps = 20) =>
  Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * 2 * Math.PI
    // A little uneven, like a rock
    const wobble = 1 + 0.06 * Math.sin(a * 3) + 0.04 * Math.cos(a * 5)
    return [rx * wobble * Math.cos(a), ry * wobble * Math.sin(a)] as [
      number,
      number,
    ]
  })

/** Ankara: a 125 m concrete shaft with a glass, tulip shaped head and a mast. */
const ATAKULE: Landmark = {
  id: 'atakule',
  name: 'Atakule',
  lngLat: [32.85611, 39.88556],
  replaces: { within: 30, tallerThan: 60 },
  parts: [
    {
      kind: 'round',
      material: 'concrete',
      outline: [
        [6.5, 0],
        [5.2, 4],
        [4.6, 86],
      ],
    },
    {
      kind: 'round',
      material: 'glass',
      outline: [
        [4.6, 86],
        [6, 88],
        [9, 90],
        [12, 92.5],
        [14, 95.5],
        [15, 99],
        [14.6, 102],
      ],
    },
    {
      kind: 'round',
      material: 'windows',
      outline: [
        [14.6, 102],
        [13, 105],
        [11.5, 107.5],
      ],
    },
    {
      kind: 'round',
      material: 'glass',
      outline: [
        [11.5, 107.5],
        [9, 110],
        [5.5, 112],
        [2, 113],
        [0, 113.2],
      ],
    },
    {
      kind: 'round',
      material: 'concrete',
      sides: 12,
      outline: [
        [0.8, 113],
        [0.3, 125],
        [0, 125],
      ],
    },
  ],
}

/** Istanbul: a stone tower with a gallery and a conical lead roof. */
const GALATA: Landmark = {
  id: 'galata',
  name: 'Galata Kulesi',
  lngLat: [28.97414, 41.02562],
  replaces: { within: 12, tallerThan: 30 },
  parts: [
    {
      kind: 'round',
      material: 'stone',
      outline: [
        [8.3, 0],
        [8, 43],
        [8.9, 45],
        [8.9, 46.5],
        [7.5, 46.5],
      ],
    },
    {
      kind: 'round',
      material: 'windows',
      outline: [
        [7.5, 46.5],
        [7.5, 52],
      ],
    },
    {
      kind: 'round',
      material: 'lead',
      outline: [
        [7.5, 52],
        [8.2, 52.3],
        [0.35, 62.6],
        [0.3, 66.9],
        [0, 66.9],
      ],
    },
  ],
}

/** Istanbul: a white tower and low buildings on a rock in the Bosphorus. */
const KIZ_KULESI: Landmark = {
  id: 'kiz-kulesi',
  name: 'Kız Kulesi',
  lngLat: [29.00417, 41.02111],
  replaces: { within: 35, tallerThan: 0 },
  parts: [
    {
      kind: 'block',
      material: 'rock',
      footprint: ellipse(24, 17),
      base: 0,
      top: 2.5,
    },
    {
      kind: 'block',
      material: 'whitewash',
      footprint: rect(-18, -8, -5, 7),
      base: 2.5,
      top: 8,
    },
    {
      kind: 'block',
      material: 'whitewash',
      footprint: rect(5, -6, 15, 6),
      base: 2.5,
      top: 7,
    },
    {
      kind: 'block',
      material: 'whitewash',
      footprint: rect(-4.5, -4.5, 4.5, 4.5),
      base: 2.5,
      top: 13,
    },
    {
      kind: 'round',
      material: 'whitewash',
      sides: 8,
      outline: [
        [4.4, 13],
        [4.4, 14],
        [3.7, 14],
        [3.7, 19.5],
        [4.2, 19.8],
        [4.2, 20.3],
        [2.7, 20.3],
      ],
    },
    {
      kind: 'round',
      material: 'windows',
      sides: 8,
      outline: [
        [2.7, 20.3],
        [2.7, 22.5],
      ],
    },
    {
      kind: 'round',
      material: 'lead',
      sides: 8,
      outline: [
        [3.1, 22.5],
        [0.2, 27.5],
        [0.08, 30],
        [0, 30],
      ],
    },
  ],
}

export const LANDMARKS = [ATAKULE, GALATA, KIZ_KULESI]

export const MATERIAL_COLORS: Record<Theme, Record<Material, string>> = {
  light: {
    concrete: '#e4e0d9',
    stone: '#d6c7ab',
    whitewash: '#f3f0ea',
    glass: '#7fa2bf',
    windows: '#56758f',
    lead: '#7c8993',
    rock: '#c8c0b1',
  },
  dark: {
    concrete: '#474e59',
    stone: '#5d5649',
    whitewash: '#5f646c',
    glass: '#4b6a85',
    windows: '#2f455a',
    lead: '#3d464f',
    rock: '#403e3a',
  },
}

const EARTH_RADIUS_M = 6_371_008.8

/** Metres east and north of a point, as a longitude and latitude. */
export function offset(
  [lng, lat]: [number, number],
  [x, y]: [number, number],
): [number, number] {
  const dLat = (y / EARTH_RADIUS_M) * (180 / Math.PI)
  const dLng =
    ((x / EARTH_RADIUS_M) * (180 / Math.PI)) / Math.cos((lat * Math.PI) / 180)
  return [lng + dLng, lat + dLat]
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
 * parts as stacked rings, each as wide as the outline midway up its step.
 */
export function landmarkExtrusions(
  landmarks: Landmark[],
  theme: Theme,
): FeatureCollection<Polygon> {
  const colors = MATERIAL_COLORS[theme]
  const features: FeatureCollection<Polygon>['features'] = []
  const add = (
    ring: [number, number][],
    base: number,
    height: number,
    material: Material,
  ) =>
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: { base, height, color: colors[material] },
    })
  for (const landmark of landmarks) {
    for (const part of landmark.parts) {
      if (part.kind === 'block') {
        const footprint = part.footprint.map((p) => offset(landmark.lngLat, p))
        add([...footprint, footprint[0]], part.base, part.top, part.material)
        continue
      }
      const { outline, sides = 48 } = part
      for (let i = 0; i < outline.length - 1; i++) {
        const [r0, h0] = outline[i]
        const [r1, h1] = outline[i + 1]
        // Flat steps (ledges) have no height to show
        if (h1 - h0 < 0.05) continue
        // Slopes, like a cone, become rings narrowing step by step
        const steps = Math.max(1, Math.ceil(Math.abs(r1 - r0) / 0.6))
        for (let j = 0; j < steps; j++) {
          const t = (j + 0.5) / steps
          const radius = r0 + (r1 - r0) * t
          if (radius < 0.05) continue
          add(
            ring(landmark.lngLat, radius, sides),
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
 * Leaves out the map's own buildings where a landmark stands, so its model
 * takes their place; buildings round it stay.
 */
export function hideLandmarkBuildings(): ExpressionSpecification {
  return [
    'all',
    ...LANDMARKS.map(({ lngLat, replaces }): ExpressionSpecification => [
      '!',
      [
        'all',
        ['>', ['coalesce', ['get', 'render_height'], 0], replaces.tallerThan],
        [
          '<',
          ['distance', { type: 'Point', coordinates: lngLat }],
          replaces.within,
        ],
      ],
    ]),
  ] as ExpressionSpecification
}
