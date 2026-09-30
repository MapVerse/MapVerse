import type { Landmark, Material, Part, XY } from './landmarks.ts'
import { grown, lightsAlong } from './shapes.ts'

/*
 * Ankara: Atlantis, the shopping centre in Batıkent (4M Mimarlık, 2011),
 * on its two islands either side of Başkent Bulvarı, from OpenStreetMap's
 * outlines and, for its roofs, the Sentinel-2 satellites:
 * - the main building, a crescent 78 m deep bent along Batıkent Bulvarı,
 *   its long faces arcs round one point: green steel roofs either side of
 *   the glass vault over its mall street, and a red canopy along its face
 *   on the car park, carried on over Başkent Bulvarı to
 * - the entertainment centre (the cinema) on the south island,
 * - the plaza on a bridge over the boulevard, with its pools and trees,
 *   joining the islands at the west, and a round pavilion.
 * Heights are estimates, for the three floors its directory lists above
 * ground (0, 1 and 2).
 */

const DEG = Math.PI / 180

const MAIN: XY[] = [
  [-8.6, 17.7],
  [-6.7, 12.7],
  [52.2, 15.7],
  [58.5, 16],
  [63.3, 16.7],
  [67.7, 24.2],
  [63.6, 33.8],
  [57.6, 47.8],
  [53.9, 56.6],
  [40.4, 84.1],
  [17.9, 117.9],
  [-11.9, 149.4],
  [-29.6, 163.7],
  [-35.1, 168.1],
  [-53.1, 181.1],
  [-61.2, 163],
  [-77.3, 110.2],
  [-69.6, 102.7],
  [-73, 96.7],
  [-57.1, 83.5],
  [-43.2, 67.9],
  [-41.1, 65],
  [-29.2, 48.4],
  [-13.9, 17.5],
  [-9.6, 20.4],
]
const ENTERTAINMENT: XY[] = [
  [55.4, -60.1],
  [20.9, -62.6],
  [18.6, -89],
  [12.9, -107.8],
  [10.6, -104.6],
  [6.8, -102.5],
  [2.5, -104.1],
  [0.9, -105.5],
  [-1.4, -108.3],
  [-2.7, -111.8],
  [-2.4, -116.2],
  [-0.4, -118.8],
  [3.1, -120.4],
  [7.8, -122],
  [-2.4, -136.5],
  [-7.9, -141.9],
  [-11.6, -146.9],
  [-11.2, -151.3],
  [-8.1, -155.6],
  [-4.7, -157.3],
  [79.8, -140.9],
  [64.5, -74.3],
  [61.1, -59.5],
  [57.8, -59.9],
]
/** The red canopy over Başkent Bulvarı, from the main building's corner */
const CANOPY: XY[] = [
  [70.9, 15.6],
  [67.7, 24.2],
  [63.3, 16.7],
  [58.5, 16],
  [52.2, 15.7],
  [57, -5.2],
  [58.6, -34.4],
  [55.4, -60.1],
  [57.8, -59.9],
  [61.1, -59.5],
  [64.5, -74.3],
  [68.7, -74],
  [74.1, -33.1],
  [73.2, -4],
]
/** The plaza on its bridge over the boulevard */
const PLAZA: XY[] = [
  [-33.8, -5.1],
  [-47.6, -5.6],
  [-49.3, -5.6],
  [-56.3, -5.9],
  [-60.9, -6],
  [-68.9, -6.3],
  [-74.3, -6.5],
  [-70.6, -18.4],
  [-62.3, -42.9],
  [-60.9, -47.1],
  [-56, -46.7],
  [-50.2, -46.4],
  [-45.9, -46.1],
  [-41.9, -45.8],
  [-37, -45.5],
  [-32.3, -45.2],
  [-32.3, -43],
  [-32.9, -25.1],
]

/** The main building's long faces: arcs round this point */
const ARC: XY = [-206.1, -60.5]
/** On Batıkent Bulvarı and its car park */
const OUTER = 285.8
const TOP = 17
/** The red canopy's height, clear over the boulevard */
const EAVES = 11.5
/** The plaza's floor, over the boulevard */
const DECK = 6.3

const arc = (radius: number, angle: number): XY => [
  ARC[0] + radius * Math.cos(angle),
  ARC[1] + radius * Math.sin(angle),
]

type Line = [XY, XY]
/** The main building's ends, on the boulevard and to the north west */
const SOUTH_END: Line = [
  [-6.7, 12.7],
  [63.3, 16.7],
]
const NORTH_END: Line = [
  [-53.1, 181.1],
  [-77.3, 110.2],
]
/** How far a point is inside an end, the building being on its left. */
const inside = ([[ax, ay], [bx, by]]: Line, [x, y]: XY) =>
  ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / Math.hypot(bx - ax, by - ay)

/** The angle where an arc comes `inset` metres inside an end. */
function crossing(radius: number, end: Line, inset: number, outside: number) {
  let [from, to] = [outside, 40 * DEG]
  for (let i = 0; i < 40; i++) {
    const mid = (from + to) / 2
    if (inside(end, arc(radius, mid)) < inset) from = mid
    else to = mid
  }
  return (from + to) / 2
}

/** An arc across the main building, stopping `inset` short of its ends. */
function across(radius: number, inset: number): XY[] {
  const from = crossing(radius, SOUTH_END, inset, 5 * DEG)
  const to = crossing(radius, NORTH_END, inset, 70 * DEG)
  const n = Math.ceil((to - from) / DEG)
  return Array.from({ length: n + 1 }, (_, i) =>
    arc(radius, from + ((to - from) * i) / n),
  )
}

/** The part of the main building between two arcs. */
const band = (r0: number, r1: number, inset: number): XY[] => [
  ...across(r0, inset),
  ...across(r1, inset).reverse(),
]

const block = (
  footprint: XY[],
  base: number,
  top: number,
  material: Material,
  holes?: XY[][],
): Part => ({ kind: 'block', footprint, holes, base, top, material })

const post = (at: XY, top: number, radius = 0.3): Part => ({
  kind: 'round',
  material: 'steel',
  sides: 8,
  at,
  outline: [
    [radius, 0],
    [radius, top],
  ],
})

/** A wall along a line, like a balustrade. */
function along(points: XY[], width: number): XY[][] {
  return points.slice(1).map(([x1, y1], i) => {
    const [x0, y0] = points[i]
    const length = Math.hypot(x1 - x0, y1 - y0)
    const [nx, ny] = [
      (-(y1 - y0) / length) * (width / 2),
      ((x1 - x0) / length) * (width / 2),
    ]
    return [
      [x0 + nx, y0 + ny],
      [x1 + nx, y1 + ny],
      [x1 - nx, y1 - ny],
      [x0 - nx, y0 - ny],
    ]
  })
}

/**
 * A building's faces: shop fronts and doors below, floor slabs, a band
 * of glass along the top floor or none, and a parapet round its roof.
 */
function faces(outline: XY[], ribbon: Material | null): Part[] {
  return [
    block(outline, 0, TOP, 'concrete'),
    block(grown(outline, 0.2), 0.4, 5.6, 'windows'),
    block(grown(outline, 0.35), 5.6, 6.4, 'whitewash'),
    block(grown(outline, 0.35), 11.2, 11.8, 'whitewash'),
    ...(ribbon ? [block(grown(outline, 0.2), 12.4, 15.8, ribbon)] : []),
    block(outline, TOP, TOP + 1.2, 'whitewash', [grown(outline, -0.8)]),
  ]
}

/**
 * The doors at an end of the mall street: a glass bay out from the wall
 * under a white canopy.
 */
function doors(end: Line, outside: number): Part[] {
  const radius = OUTER - 40
  const [x, y] = arc(radius, crossing(radius, end, 0, outside))
  const [[ax, ay], [bx, by]] = end
  const length = Math.hypot(bx - ax, by - ay)
  // Along the wall, and out of it
  const [tx, ty] = [(bx - ax) / length, (by - ay) / length]
  const [ox, oy] = [ty, -tx]
  const bay = (half: number, out: number): XY[] => [
    [x - tx * half - ox * 0.5, y - ty * half - oy * 0.5],
    [x + tx * half - ox * 0.5, y + ty * half - oy * 0.5],
    [x + tx * half + ox * out, y + ty * half + oy * out],
    [x - tx * half + ox * out, y - ty * half + oy * out],
  ]
  return [
    block(bay(7, 2.5), 0, 12.5, 'tint'),
    block(bay(8.5, 4.5), 12.5, 13.4, 'whitewash'),
  ]
}

function tree(at: XY, base: number): Part[] {
  return [
    {
      kind: 'round',
      material: 'rock',
      sides: 6,
      at,
      outline: [
        [0.25, base],
        [0.25, base + 1.8],
      ],
    },
    {
      kind: 'round',
      material: 'leaf',
      sides: 10,
      at,
      outline: (
        [
          [1.2, 1.8],
          [2, 2.6],
          [2.2, 3.6],
          [1.7, 4.8],
          [0.8, 5.6],
          [0.2, 5.9],
        ] as [number, number][]
      ).map(([r, h]): [number, number] => [r, base + h]),
    },
  ]
}

/** The main building: its roofs, as the satellites see them, and doors. */
function mainBuilding(): Part[] {
  const parts = faces(MAIN, 'glass')
  // Green roofs either side of the glass vault over the mall street
  parts.push(
    block(band(OUTER - 34, OUTER - 16, 3), TOP, TOP + 0.7, 'green'),
    block(band(OUTER - 68, OUTER - 46, 3), TOP, TOP + 0.7, 'green'),
    ...(
      [
        [0, TOP, TOP + 1.3],
        [0.9, TOP + 1.3, TOP + 2.3],
        [2, TOP + 2.3, TOP + 3.1],
        [3.2, TOP + 3.1, TOP + 3.7],
      ] as const
    ).map(([step, base, top]) =>
      block(
        band(OUTER - 44 + step, OUTER - 36 - step, 3),
        base,
        top,
        'windows',
      ),
    ),
    // On the end walls themselves, which bow out a little past the ends
    ...doors([MAIN[1], MAIN[2]], 5 * DEG),
    ...doors([MAIN[15], MAIN[16]], 70 * DEG),
  )
  // The red canopy along its face on the car park, on posts, from just
  // inside the face, whose straight walls fall a little short of the arc
  parts.push(block(band(OUTER - 1, OUTER + 9, 1), EAVES, EAVES + 0.8, 'red'))
  const posts = across(OUTER + 8.3, 3)
  for (let i = 0; i < posts.length; i += 2) parts.push(post(posts[i], EAVES))
  return parts
}

/** The red canopy over the boulevard, on posts either side and between. */
function overBoulevard(): Part[] {
  return [
    block(CANOPY, EAVES, EAVES + 0.8, 'red'),
    ...(
      [
        [58.2, -2],
        [72, -2],
        [58.8, -21],
        [72.6, -21],
        [58.3, -42],
        [72.4, -42],
        [57.6, -60],
        [69.8, -60],
      ] as XY[]
    ).map((at) => post(at, EAVES, 0.45)),
  ]
}

/**
 * The plaza on its bridge: its deck on piers down the boulevard's middle,
 * landing on either side, glass balustrades along the road, a pool, a
 * round fountain and trees.
 */
function plaza(): Part[] {
  const top = DECK + 0.1
  return [
    block(PLAZA, DECK - 1.1, DECK, 'concrete'),
    block(grown(PLAZA, -0.3), DECK, top, 'paving'),
    // Landings, where the plaza meets the ground either side of the road
    block(
      [
        [-33.8, -5.1],
        [-74.3, -6.5],
        [-71.35, -16],
        [-33.35, -15],
      ],
      0,
      DECK - 1.1,
      'concrete',
    ),
    block(
      [
        [-62.95, -41],
        [-32.4, -41],
        [-32.3, -43],
        [-32.3, -45.2],
        [-37, -45.5],
        [-41.9, -45.8],
        [-45.9, -46.1],
        [-50.2, -46.4],
        [-56, -46.7],
        [-60.9, -47.1],
        [-62.3, -42.9],
      ],
      0,
      DECK - 1.1,
      'concrete',
    ),
    ...(
      [
        [-40, -28.3],
        [-50, -28.3],
        [-60, -28.3],
      ] as XY[]
    ).map((at): Part => ({
      kind: 'round',
      material: 'concrete',
      sides: 12,
      at,
      outline: [
        [0.9, 0],
        [0.9, DECK - 1.1],
      ],
    })),
    ...[
      [
        [-73.9, -7],
        [-70.6, -18.4],
        [-62.7, -41.6],
      ] as XY[],
      [
        [-33.4, -15],
        [-32.9, -25.1],
        [-32.7, -41],
      ] as XY[],
    ].flatMap((line) =>
      along(line, 0.3).map((footprint) =>
        block(footprint, DECK, top + 1.1, 'glass'),
      ),
    ),
    block(
      [
        [-57, -9],
        [-52, -9],
        [-52, -38],
        [-56, -38],
      ],
      top,
      top + 0.15,
      'water',
    ),
    {
      kind: 'round',
      material: 'stone',
      at: [-40.3, -27.3],
      outline: [
        [3.3, top],
        [3.3, top + 0.5],
      ],
    },
    {
      kind: 'round',
      material: 'water',
      at: [-40.3, -27.3],
      outline: [
        [2.8, top + 0.5],
        [2.8, top + 0.6],
        [0.25, top + 0.6],
        [0.25, top + 1.8],
      ],
    },
    ...(
      [
        [-44.5, -11],
        [-44.5, -40],
        [-66.5, -11],
        [-66, -21],
        [-63.5, -31],
        [-37.5, -11],
      ] as XY[]
    ).flatMap((at) => tree(at, top)),
  ]
}

/** The round pavilion south of the plaza, glass under a white roof. */
const PAVILION: Part[] = (
  [
    [12.8, 0, 4.5, 'windows'],
    [13.2, 4.5, 5.2, 'whitewash'],
    [12.4, 5.2, 8.5, 'glass'],
    [13.6, 8.5, 9.2, 'whitewash'],
    [6, 9.2, 10.4, 'glass'],
  ] as const
).map(([radius, base, top, material]): Part => ({
  kind: 'round',
  material,
  sides: 32,
  at: [-28.1, -137.8],
  outline: [
    [radius, base],
    [radius, top],
  ],
}))

export const ATLANTIS: Landmark = {
  id: 'atlantis',
  name: 'Atlantis AVM',
  near: [32.7148, 39.97],
  hide: [
    { at: [0, 80], within: 1, tallerThan: 0 },
    { at: [40, -100], within: 1, tallerThan: 0 },
    { at: [65, -30], within: 1, tallerThan: 0 },
    { at: [-28.1, -137.8], within: 1, tallerThan: 0 },
  ],
  lights: [
    ...lightsAlong(grown(MAIN, 10), 14),
    ...lightsAlong(grown(ENTERTAINMENT, 7), 14),
    ...lightsAlong(CANOPY, 12),
    ...lightsAlong(grown(PLAZA, -3), 10),
  ],
  parts: [
    ...mainBuilding(),
    ...overBoulevard(),
    // The entertainment centre: its cinema and shops, glass round its
    // forecourt, and plant on the roof
    ...faces(ENTERTAINMENT, null),
    block(grown(ENTERTAINMENT, 0.35), 15.8, 16.6, 'whitewash'),
    ...along(ENTERTAINMENT.slice(3, 14), 0.6).map((footprint) =>
      block(footprint, 0, 15.8, 'tint'),
    ),
    ...(
      [
        [35, -95],
        [50, -110],
        [40, -125],
      ] as XY[]
    ).map(([x, y]) =>
      block(
        [
          [x - 4, y - 3],
          [x + 4, y - 3],
          [x + 4, y + 3],
          [x - 4, y + 3],
        ],
        TOP,
        TOP + 2.4,
        'steel',
      ),
    ),
    ...plaza(),
    ...PAVILION,
    // A pool in the garden, south of the plaza
    block(
      [
        [-27, -70],
        [-22.5, -76],
        [-13, -92],
        [-26, -98],
      ],
      0,
      0.2,
      'water',
    ),
  ],
}

/**
 * Atlantis City's eight blocks of flats, five north of the boulevard and
 * three south, as OpenStreetMap has them: 24 floors each, the middle of
 * each long face stepped out.
 */
const BLOCKS: XY[][] = [
  [
    [-115.6, 210.4],
    [-115.9, 209.5],
    [-103, 204.8],
    [-102.7, 205.7],
    [-94.1, 202.6],
    [-86.2, 224.3],
    [-94.8, 227.4],
    [-94.5, 228.3],
    [-107.4, 233],
    [-107.7, 232.1],
    [-116.3, 235.2],
    [-124.1, 213.5],
  ],
  [
    [-129.9, 157.7],
    [-130.2, 156.7],
    [-116.9, 153.4],
    [-116.7, 154.3],
    [-107.8, 152],
    [-102.1, 174.4],
    [-111, 176.6],
    [-110.7, 177.6],
    [-124, 181],
    [-124.3, 180],
    [-133.1, 182.3],
    [-138.8, 159.9],
  ],
  [
    [-138.4, 105.7],
    [-138.5, 104.8],
    [-124.9, 103],
    [-124.8, 104],
    [-115.7, 102.8],
    [-112.8, 125.6],
    [-121.8, 126.8],
    [-121.6, 127.8],
    [-135.3, 129.6],
    [-135.4, 128.6],
    [-144.4, 129.8],
    [-147.4, 106.9],
  ],
  [
    [-140.1, 52.9],
    [-140.1, 51.9],
    [-126.4, 51.8],
    [-126.4, 52.8],
    [-117.3, 52.7],
    [-117.1, 75.7],
    [-126.2, 75.8],
    [-126.2, 76.8],
    [-139.9, 76.9],
    [-139.9, 75.9],
    [-149, 76],
    [-149.2, 52.9],
  ],
  [
    [-139.5, 1.4],
    [-139.4, 0.4],
    [-125.8, 1.1],
    [-125.8, 2.1],
    [-116.7, 2.6],
    [-117.9, 25.6],
    [-127, 25.1],
    [-127, 26.1],
    [-140.7, 25.4],
    [-140.7, 24.4],
    [-149.8, 23.9],
    [-148.6, 0.9],
  ],
  [
    [-127.9, -90.1],
    [-127.7, -91],
    [-114.4, -88.2],
    [-114.6, -87.3],
    [-105.6, -85.4],
    [-110.3, -62.8],
    [-119.3, -64.7],
    [-119.5, -63.7],
    [-132.9, -66.6],
    [-132.7, -67.6],
    [-141.6, -69.4],
    [-136.9, -92],
  ],
  [
    [-112.1, -135.7],
    [-111.8, -136.6],
    [-98.8, -132.4],
    [-99, -131.5],
    [-90.4, -128.7],
    [-97.5, -106.8],
    [-106.1, -109.6],
    [-106.4, -108.6],
    [-119.5, -112.9],
    [-119.2, -113.8],
    [-127.8, -116.6],
    [-120.7, -138.5],
  ],
  [
    [-95.7, -180.5],
    [-95.4, -181.3],
    [-82.7, -176.1],
    [-83.1, -175.2],
    [-74.7, -171.7],
    [-83.5, -150.4],
    [-91.9, -153.9],
    [-92.3, -153],
    [-105, -158.3],
    [-104.6, -159.2],
    [-113, -162.7],
    [-104.2, -184],
  ],
]
/** Its floors: a taller one at the ground, and its flats above */
const LOBBY = 4.2
const STOREY = 3
const FLOORS = 24
const ROOFS = LOBBY + (FLOORS - 1) * STOREY

const middle = (footprint: XY[]): XY => [
  footprint.reduce((sum, [x]) => sum + x, 0) / footprint.length,
  footprint.reduce((sum, [, y]) => sum + y, 0) / footprint.length,
]

/** Whether a window is lit at night: about half, scattered. */
const lit = (n: number) => (Math.imul(n + 1, 2654435761) >>> 0) % 100 < 55

/**
 * A block of flats: in light plaster, a glass lobby at its foot, its
 * windows floor by floor, a parapet round the roof, and the lift's room
 * on top.
 */
function flats(footprint: XY[], index: number): Part[] {
  const parts: Part[] = [
    block(footprint, 0, ROOFS, 'plaster'),
    block(grown(footprint, 0.15), 0.4, 3.8, 'windows'),
    block(footprint, ROOFS, ROOFS + 1.2, 'plaster', [grown(footprint, -0.4)]),
  ]
  // Along its long faces, as the step out in the middle of one runs
  const [cx, cy] = middle(footprint)
  const [[x0, y0], [x1, y1]] = [footprint[1], footprint[2]]
  const length = Math.hypot(x1 - x0, y1 - y0)
  const [ux, uy] = [(x1 - x0) / length, (y1 - y0) / length]
  const room = (u: number, v: number): XY => [
    cx + ux * u - uy * v,
    cy + uy * u + ux * v,
  ]
  parts.push(
    block(
      [room(-5, -3.5), room(5, -3.5), room(5, 3.5), room(-5, 3.5)],
      ROOFS,
      ROOFS + 4.5,
      'plaster',
    ),
  )
  // Windows in each wall, about every 4.5 m, each lit or not
  let area = 0
  footprint.forEach(([ax, ay], i) => {
    const [bx, by] = footprint[(i + 1) % footprint.length]
    area += ax * by - bx * ay
  })
  const side = Math.sign(area)
  footprint.forEach(([ax, ay], wall) => {
    const [bx, by] = footprint[(wall + 1) % footprint.length]
    const span = Math.hypot(bx - ax, by - ay)
    if (span < 3) return
    const [tx, ty] = [(bx - ax) / span, (by - ay) / span]
    // Out of the wall
    const [nx, ny] = [side * ty, -side * tx]
    const units = Math.round(span / 4.5)
    const pane = (s: number, out: number): XY => [
      ax + tx * s + nx * out,
      ay + ty * s + ny * out,
    ]
    for (let floor = 1; floor < FLOORS; floor++) {
      const base = LOBBY + (floor - 1) * STOREY + 0.9
      for (let unit = 0; unit < units; unit++) {
        const [s0, s1] = [(unit + 0.2) / units, (unit + 0.8) / units].map(
          (t) => t * span,
        )
        parts.push(
          block(
            [pane(s0, -0.05), pane(s1, -0.05), pane(s1, 0.15), pane(s0, 0.15)],
            base,
            base + 1.5,
            lit(((index * 16 + wall) * 32 + floor) * 8 + unit)
              ? 'windows'
              : 'tint',
          ),
        )
      }
    }
  })
  return parts
}

export const ATLANTIS_CITY: Landmark = {
  id: 'atlantis-city',
  name: 'Atlantis City',
  near: [32.7148, 39.97],
  hide: BLOCKS.map((footprint) => ({
    at: middle(footprint),
    within: 1,
    tallerThan: 0,
  })),
  lights: BLOCKS.flatMap((footprint) => lightsAlong(grown(footprint, 6), 12)),
  parts: BLOCKS.flatMap(flats),
}
