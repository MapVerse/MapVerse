import type { FeatureCollection, Polygon } from 'geojson'
import type { ExpressionSpecification } from 'maplibre-gl'
import type { Theme } from '../../theme/theme.ts'
import { offset, type XY } from './geometry.ts'

export type { XY } from './geometry.ts'

/** A point on an outline: its radius at a height, both in metres. */
export type ProfilePoint = [radius: number, height: number]

export type Material =
  | 'concrete'
  | 'stone'
  | 'shade'
  | 'ochre'
  | 'whitewash'
  | 'steel'
  | 'glass'
  | 'windows'
  | 'lead'
  | 'roof'
  | 'rock'
  | 'paving'
  | 'asphalt'
  | 'leaf'
  | 'flag'

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
}

export const MATERIAL_COLORS: Record<Theme, Record<Material, string>> = {
  light: {
    concrete: '#e4e0d9',
    stone: '#d6c7ab',
    shade: '#b9a98c',
    ochre: '#d9b99d',
    whitewash: '#f3f0ea',
    steel: '#d3d8dd',
    glass: '#7fa2bf',
    windows: '#56758f',
    lead: '#7c8993',
    roof: '#a3abb3',
    rock: '#c8c0b1',
    paving: '#e6e1d7',
    asphalt: '#9ba1a8',
    leaf: '#8dbb77',
    flag: '#e30a17',
  },
  dark: {
    concrete: '#474e59',
    stone: '#5d5649',
    shade: '#433d34',
    ochre: '#6a5245',
    whitewash: '#5f646c',
    steel: '#59616b',
    glass: '#4b6a85',
    windows: '#2f455a',
    lead: '#3d464f',
    roof: '#4a525c',
    rock: '#403e3a',
    paving: '#464a50',
    asphalt: '#2c3137',
    leaf: '#2f4d3b',
    flag: '#b5121b',
  },
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
  const add = (
    rings: [number, number][][],
    base: number,
    height: number,
    material: Material,
  ) =>
    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: rings },
      properties: { base, height, color: colors[material] },
    })
  for (const { near, parts } of landmarks) {
    const closed = (footprint: XY[]) => {
      const points = footprint.map((p) => offset(near, p))
      return [...points, points[0]]
    }
    for (const part of parts) {
      if (part.kind === 'block') {
        const rings = [part.footprint, ...(part.holes ?? [])].map(closed)
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
