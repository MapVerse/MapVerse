import type { FeatureCollection, Polygon } from 'geojson'
import type { ExpressionSpecification } from 'maplibre-gl'
import type { Theme } from '../../theme/theme.ts'

/** A point on an outline: its radius at a height, both in metres. */
export type ProfilePoint = [radius: number, height: number]

/** Metres east and north of a landmark's centre. */
export type XY = [x: number, y: number]

export type Material =
  'concrete' | 'stone' | 'whitewash' | 'glass' | 'windows' | 'lead' | 'rock'

/**
 * A piece of a landmark: either turned round a point from an outline, or
 * a footprint raised between two heights.
 */
export type Part =
  | {
      kind: 'round'
      /** From the bottom up */
      outline: ProfilePoint[]
      material: Material
      /** Faces round the axis; 8 makes an octagon */
      sides?: number
      /** Off the centre, like a column */
      at?: XY
    }
  | {
      kind: 'block'
      footprint: XY[]
      base: number
      top: number
      material: Material
    }

/** A landmark's own building, as found in the map's tiles. */
export type Found = {
  center: [number, number]
  /** Its outline, in metres round the centre */
  footprint: XY[]
  height: number
  /** From the centre to its farthest corner */
  radius: number
}

export type Landmark = {
  id: string
  name: string
  /** Roughly where it stands; its building is looked for round here */
  near: [number, number]
  /** Its building: the tallest (or largest, or next tallest) this near */
  find: {
    within: number
    tallerThan: number
    by?: 'height' | 'area'
    rank?: number
  }
  /** Used when the tiles have no such building */
  fallback: { footprint: XY[]; height: number }
  /** Which of the map's buildings to leave out round it, if not just its own */
  hide?: { within: number; tallerThan: number }
  parts: (found: Found) => Part[]
}

const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
]

const circle = (r: number, steps = 24): XY[] =>
  Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * 2 * Math.PI
    return [r * Math.cos(a), r * Math.sin(a)]
  })

const ellipse = (rx: number, ry: number, steps = 20): XY[] =>
  Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * 2 * Math.PI
    // A little uneven, like a rock
    const wobble = 1 + 0.06 * Math.sin(a * 3) + 0.04 * Math.cos(a * 5)
    return [rx * wobble * Math.cos(a), ry * wobble * Math.sin(a)]
  })

/** A footprint grown or shrunk round its centre. */
const scaled = (footprint: XY[], by: number): XY[] =>
  footprint.map(([x, y]) => [x * by, y * by])

/** Points every `spacing` metres round a footprint, e.g. for columns. */
function alongEdges(footprint: XY[], spacing: number): XY[] {
  const points: XY[] = []
  footprint.forEach(([x0, y0], i) => {
    const [x1, y1] = footprint[(i + 1) % footprint.length]
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / spacing))
    for (let j = 0; j < n; j++) {
      points.push([x0 + ((x1 - x0) * j) / n, y0 + ((y1 - y0) * j) / n])
    }
  })
  return points
}

/** Ankara: a 125 m concrete shaft with a glass, tulip shaped head and a mast. */
const ATAKULE: Landmark = {
  id: 'atakule',
  name: 'Atakule',
  near: [32.85611, 39.88556],
  find: { within: 300, tallerThan: 60 },
  fallback: { footprint: circle(6.5), height: 125 },
  parts: () => [
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
      ],
    },
    {
      kind: 'round',
      material: 'concrete',
      sides: 12,
      outline: [
        [0.8, 113],
        [0.3, 125],
      ],
    },
  ],
}

/** Istanbul: a stone tower with a gallery and a conical lead roof. */
const GALATA: Landmark = {
  id: 'galata',
  name: 'Galata Kulesi',
  near: [28.97414, 41.02562],
  find: { within: 150, tallerThan: 45 },
  fallback: { footprint: circle(8.3), height: 63 },
  parts: () => [
    {
      kind: 'round',
      material: 'stone',
      outline: [
        [8.3, 0],
        [8, 43],
        [8.9, 45],
        [8.9, 46.5],
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
        [8.2, 52],
        [8.2, 52.3],
        [0.35, 62.6],
        [0.3, 66.9],
      ],
    },
  ],
}

/** Istanbul: a white tower and low buildings on a rock in the Bosphorus. */
const KIZ_KULESI: Landmark = {
  id: 'kiz-kulesi',
  name: 'Kız Kulesi',
  near: [29.00417, 41.02111],
  find: { within: 150, tallerThan: 0 },
  fallback: { footprint: rect(-4.5, -4.5, 4.5, 4.5), height: 23 },
  // Everything on the rock
  hide: { within: 45, tallerThan: 0 },
  parts: () => [
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
      ],
    },
  ],
}

/**
 * Istanbul: the white TV tower on Küçük Çamlıca, a tulip in outline, with
 * glass floors high up and a long mast.
 */
const CAMLICA: Landmark = {
  id: 'camlica',
  name: 'Çamlıca Kulesi',
  near: [29.0689, 41.0275],
  find: { within: 300, tallerThan: 100 },
  fallback: { footprint: circle(21), height: 369 },
  parts: () => [
    {
      kind: 'round',
      material: 'whitewash',
      outline: [
        [21, 0],
        [15, 12],
        [11, 40],
        [9, 90],
        [9.5, 120],
      ],
    },
    {
      kind: 'round',
      material: 'glass',
      outline: [
        [9.5, 120],
        [12, 135],
        [15, 150],
        [16.5, 165],
      ],
    },
    {
      kind: 'round',
      material: 'windows',
      outline: [
        [16.5, 165],
        [16.5, 180],
      ],
    },
    {
      kind: 'round',
      material: 'glass',
      outline: [
        [16.5, 180],
        [15, 195],
        [12, 207],
        [8.5, 215],
      ],
    },
    {
      kind: 'round',
      material: 'whitewash',
      outline: [
        [8.5, 215],
        [6, 221],
      ],
    },
    {
      kind: 'round',
      material: 'lead',
      sides: 12,
      outline: [
        [2.2, 221],
        [1.2, 300],
        [0.5, 369],
      ],
    },
  ],
}

/**
 * Ankara: Atatürk's mausoleum, the Hall of Honour: a colonnaded stone
 * block on a plinth, drawn round the hall's own footprint.
 */
const ANITKABIR: Landmark = {
  id: 'anitkabir',
  name: 'Anıtkabir',
  near: [32.83694, 39.92528],
  find: { within: 150, tallerThan: 3, by: 'area' },
  fallback: { footprint: rect(-28.7, -20.8, 28.7, 20.8), height: 21 },
  parts: ({ footprint }) => [
    { kind: 'block', material: 'stone', footprint, base: 0, top: 3 },
    {
      kind: 'block',
      material: 'stone',
      footprint: scaled(footprint, 0.78),
      base: 3,
      top: 17,
    },
    ...alongEdges(scaled(footprint, 0.92), 4.4).map((at): Part => ({
      kind: 'round',
      material: 'whitewash',
      sides: 10,
      at,
      outline: [
        [0.85, 3],
        [0.75, 17],
      ],
    })),
    { kind: 'block', material: 'stone', footprint, base: 17, top: 19.5 },
    {
      kind: 'block',
      material: 'stone',
      footprint: scaled(footprint, 0.6),
      base: 19.5,
      top: 23,
    },
  ],
}

/** Istanbul, Levent: twin towers of dark glass banded in white. */
function sabanciTower(rank: number, spire: boolean): Landmark {
  return {
    id: `sabanci-${rank + 1}`,
    name: 'Sabancı Center',
    near: [29.01028, 41.08111],
    find: { within: 250, tallerThan: 100, rank },
    fallback: {
      footprint: rect(-16, -16, 16, 16),
      height: rank === 0 ? 158 : 138,
    },
    parts: ({ footprint, height }) => {
      const crown = height - 12
      const floors: Part[] = []
      // A white band every two floors
      for (let h = 8; h < crown - 2; h += 8) {
        floors.push({
          kind: 'block',
          material: 'whitewash',
          footprint: scaled(footprint, 1.01),
          base: h,
          top: h + 1.2,
        })
      }
      return [
        { kind: 'block', material: 'windows', footprint, base: 0, top: crown },
        ...floors,
        {
          kind: 'block',
          material: 'whitewash',
          footprint: scaled(footprint, 0.86),
          base: crown,
          top: crown + 6,
        },
        {
          kind: 'block',
          material: 'windows',
          footprint: scaled(footprint, 0.66),
          base: crown + 6,
          top: height,
        },
        ...(spire
          ? [
              {
                kind: 'round',
                material: 'lead',
                sides: 12,
                outline: [
                  [0.8, height],
                  [0.2, height + 14],
                ],
              } satisfies Part,
            ]
          : []),
      ]
    },
  }
}

export const LANDMARKS: Landmark[] = [
  ATAKULE,
  GALATA,
  KIZ_KULESI,
  CAMLICA,
  ANITKABIR,
  sabanciTower(0, true),
  sabanciTower(1, false),
]

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
const DEG = 180 / Math.PI

/** Metres east and north of a point, as a longitude and latitude. */
export function offset(
  [lng, lat]: [number, number],
  [x, y]: XY,
): [number, number] {
  const dLat = (y / EARTH_RADIUS_M) * DEG
  const dLng = ((x / EARTH_RADIUS_M) * DEG) / Math.cos(lat / DEG)
  return [lng + dLng, lat + dLat]
}

/** A longitude and latitude, as metres east and north of a point. */
export function metres(
  [lng0, lat0]: [number, number],
  [lng, lat]: [number, number],
): XY {
  return [
    ((lng - lng0) / DEG) * EARTH_RADIUS_M * Math.cos(lat0 / DEG),
    ((lat - lat0) / DEG) * EARTH_RADIUS_M,
  ]
}

/** The convex hull of some points, anticlockwise. */
function hull(points: XY[]): XY[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: XY, a: XY, b: XY) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const half = (list: XY[]) => {
    const out: XY[] = []
    for (const p of list) {
      while (out.length >= 2 && cross(out.at(-2)!, out.at(-1)!, p) <= 0) {
        out.pop()
      }
      out.push(p)
    }
    out.pop()
    return out
  }
  return [...half(sorted), ...half([...sorted].reverse())]
}

/** Area and centre of mass of a simple polygon. */
function areaAndCentroid(polygon: XY[]): { area: number; centroid: XY } {
  let a = 0
  let cx = 0
  let cy = 0
  polygon.forEach(([x0, y0], i) => {
    const [x1, y1] = polygon[(i + 1) % polygon.length]
    const f = x0 * y1 - x1 * y0
    a += f
    cx += (x0 + x1) * f
    cy += (y0 + y1) * f
  })
  if (Math.abs(a) < 1e-9) return { area: 0, centroid: polygon[0] ?? [0, 0] }
  return { area: Math.abs(a / 2), centroid: [cx / (3 * a), cy / (3 * a)] }
}

/** A building polygon as the map's tiles give it. */
export type TileBuilding = {
  geometry: { type: string; coordinates: unknown }
  properties: { render_height?: number }
}

function outerRings(geometry: TileBuilding['geometry']): [number, number][][] {
  if (geometry.type === 'Polygon') {
    return [(geometry.coordinates as [number, number][][])[0]]
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as [number, number][][][]).map((p) => p[0])
  }
  return []
}

/**
 * Finds a landmark's building among the tiles' buildings. A building cut
 * across tiles comes in pieces; pieces of the same height that touch are
 * put back together before comparing.
 */
export function findBuilding(
  landmark: Landmark,
  buildings: TileBuilding[],
): Found | null {
  const { near, find } = landmark
  type Piece = {
    height: number
    points: XY[]
    box: [number, number, number, number]
  }
  const pieces: Piece[] = []
  for (const building of buildings) {
    const height = building.properties.render_height ?? 0
    if (height <= find.tallerThan) continue
    for (const ring of outerRings(building.geometry)) {
      const points = ring.map((p) => metres(near, p))
      if (!points.some(([x, y]) => Math.hypot(x, y) <= find.within)) continue
      const xs = points.map(([x]) => x)
      const ys = points.map(([, y]) => y)
      pieces.push({
        height,
        points,
        box: [
          Math.min(...xs),
          Math.min(...ys),
          Math.max(...xs),
          Math.max(...ys),
        ],
      })
    }
  }

  // Put pieces back together: same height, boxes touching
  const touching = (a: Piece, b: Piece) =>
    a.height === b.height &&
    a.box[0] <= b.box[2] + 1 &&
    b.box[0] <= a.box[2] + 1 &&
    a.box[1] <= b.box[3] + 1 &&
    b.box[1] <= a.box[3] + 1
  const groups: Piece[][] = []
  for (const piece of pieces) {
    const joined = groups.filter((g) => g.some((p) => touching(p, piece)))
    const merged = [piece, ...joined.flat()]
    for (const g of joined) groups.splice(groups.indexOf(g), 1)
    groups.push(merged)
  }

  const candidates = groups.map((group) => {
    const outline = hull(group.flatMap((p) => p.points))
    const { area, centroid } = areaAndCentroid(outline)
    return { height: group[0].height, outline, area, centroid }
  })
  const score = (c: (typeof candidates)[number]) =>
    find.by === 'area' ? c.area : c.height
  candidates.sort((a, b) => score(b) - score(a))
  const chosen = candidates[find.rank ?? 0]
  if (!chosen || chosen.outline.length < 3) return null

  const center = offset(near, chosen.centroid)
  const footprint = chosen.outline.map(([x, y]): XY => [
    x - chosen.centroid[0],
    y - chosen.centroid[1],
  ])
  return {
    center,
    footprint,
    height: chosen.height,
    radius: Math.max(...footprint.map(([x, y]) => Math.hypot(x, y))),
  }
}

/** Where a landmark goes when the tiles don't have its building. */
export function fallbackFor(landmark: Landmark): Found {
  const { footprint, height } = landmark.fallback
  return {
    center: landmark.near,
    footprint,
    height,
    radius: Math.max(...footprint.map(([x, y]) => Math.hypot(x, y))),
  }
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
 * Landmarks as the map's own 3D extrusions, each at the building it was
 * found at: blocks as they are, and round parts as stacked rings, sloped
 * ones (roofs, domes) narrowing ring by ring.
 */
export function landmarkExtrusions(
  placed: { landmark: Landmark; found: Found }[],
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
  for (const { landmark, found } of placed) {
    for (const part of landmark.parts(found)) {
      if (part.kind === 'block') {
        const footprint = part.footprint.map((p) => offset(found.center, p))
        add([...footprint, footprint[0]], part.base, part.top, part.material)
        continue
      }
      const { outline, sides = 48 } = part
      const center = part.at ? offset(found.center, part.at) : found.center
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
            ring(center, radius, sides),
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

/**
 * The zone a placed landmark clears: its own building (anything taller than
 * half of it, within its outline), or what its `hide` asks for.
 */
export function hideZone(landmark: Landmark, found: Found): HideZone {
  return {
    center: found.center,
    within: landmark.hide?.within ?? found.radius + 2,
    tallerThan: landmark.hide?.tallerThan ?? found.height / 2,
  }
}

/** A building filter that leaves out the buildings in these zones. */
export function hideBuildings(zones: HideZone[]): ExpressionSpecification {
  return [
    'all',
    true,
    ...zones.map(({ center, within, tallerThan }): ExpressionSpecification => [
      '!',
      [
        'all',
        ['>', ['coalesce', ['get', 'render_height'], 0], tallerThan],
        ['<', ['distance', { type: 'Point', coordinates: center }], within],
      ],
    ]),
  ] as ExpressionSpecification
}
