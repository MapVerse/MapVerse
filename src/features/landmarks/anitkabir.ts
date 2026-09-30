import type { Landmark, Material, Part, XY } from './landmarks.ts'
import { grid, hipRoof, lightsAlong } from './shapes.ts'

/*
 * Ankara: Anıtkabir, Atatürk's mausoleum, as a whole: the Hall of Honour
 * on its plinth above the Victory Steps, the Ceremonial Plaza within its
 * arcades and ten towers, and the Road of Lions. Laid out on the
 * complex's own grid, measured from OpenStreetMap: `u` runs along the
 * plaza to the hall (north-east), `v` across it, up the Road of Lions
 * (north-west).
 */
const { at, box } = grid((37.55 * Math.PI) / 180)

type Rect = [u0: number, v0: number, u1: number, v1: number]

const block = (
  [u0, v0, u1, v1]: Rect,
  base: number,
  top: number,
  material: Material,
): Part => ({
  kind: 'block',
  material,
  footprint: box(u0, v0, u1, v1),
  base,
  top,
})

const grow = ([u0, v0, u1, v1]: Rect, by: number): Rect => [
  u0 - by,
  v0 - by,
  u1 + by,
  v1 + by,
]

/** A tower: a stone block under a pyramid roof. */
function tower(rect: Rect, walls = 12.5): Part[] {
  return [
    block(rect, 0, walls, 'stone'),
    block(grow(rect, 0.4), walls, walls + 0.7, 'stone'),
    ...hipRoof(box, grow(rect, 0.3), walls + 0.7, 3.8, 5),
  ]
}

const square = (u: number, v: number, size = 14): Rect => [
  u - size / 2,
  v - size / 2,
  u + size / 2,
  v + size / 2,
]

/** The side of an arm of the arcades that opens onto the plaza. */
type Side = 'u0' | 'u1' | 'v0' | 'v1'

const WALL = 7.5
const LINTEL = 6.2
const GALLERY = 4.5

/**
 * An arm of the arcades round the plaza: a gallery of pillars open to the
 * plaza, the rooms behind it, and a hipped roof over both.
 */
function arcade(rect: Rect, open: Side): Part[] {
  const [u0, v0, u1, v1] = rect
  const alongU = open === 'v0' || open === 'v1'
  // The gallery, and the rooms behind it
  const gallery: Rect = {
    u0: [u0, v0, u0 + GALLERY, v1],
    u1: [u1 - GALLERY, v0, u1, v1],
    v0: [u0, v0, u1, v0 + GALLERY],
    v1: [u0, v1 - GALLERY, u1, v1],
  }[open] as Rect
  const rooms: Rect = {
    u0: [u0 + GALLERY, v0, u1, v1],
    u1: [u0, v0, u1 - GALLERY, v1],
    v0: [u0, v0 + GALLERY, u1, v1],
    v1: [u0, v0, u1, v1 - GALLERY],
  }[open] as Rect
  // Its back wall, in the gallery's shade
  const back: Rect = {
    u0: [u0 + GALLERY - 0.3, v0, u0 + GALLERY, v1],
    u1: [u1 - GALLERY, v0, u1 - GALLERY + 0.3, v1],
    v0: [u0, v0 + GALLERY - 0.3, u1, v0 + GALLERY],
    v1: [u0, v1 - GALLERY, u1, v1 - GALLERY + 0.3],
  }[open] as Rect
  const parts: Part[] = [
    block(rooms, 0, WALL, 'stone'),
    block(back, 0, LINTEL, 'shade'),
    block(gallery, LINTEL, WALL, 'stone'),
    ...hipRoof(box, grow(rect, 0.4), WALL, 2.6),
  ]
  const [a0, a1] = alongU ? [u0, u1] : [v0, v1]
  const face = { u0: u0 + 0.8, u1: u1 - 0.8, v0: v0 + 0.8, v1: v1 - 0.8 }[open]
  const count = Math.round((a1 - a0) / 3.8)
  for (let i = 0; i <= count; i++) {
    const a = a0 + 0.8 + ((a1 - a0 - 1.6) * i) / count
    parts.push(
      block(
        alongU
          ? [a - 0.55, face - 0.55, a + 0.55, face + 0.55]
          : [face - 0.55, a - 0.55, face + 0.55, a + 0.55],
        0,
        LINTEL,
        'stone',
      ),
    )
  }
  return parts
}

/** The arcades, as OpenStreetMap has them, and where each opens. */
const ARCADES: [Rect, Side][] = [
  [[-82.7, -47.3, -70.5, 62.1], 'u1'],
  [[-70.5, 49.1, -23.4, 62.1], 'v0'],
  [[-70.5, -47.3, -24.2, -34], 'v1'],
  [[3.2, 48.8, 61, 62.8], 'v0'],
  [[51.2, 24.9, 61, 48.8], 'u0'],
  [[5.2, -47.5, 61.5, -33.6], 'v1'],
  [[51.6, -33.6, 61.5, -7.8], 'u0'],
]

/**
 * The towers round the plaza: Mehmetçik, Zafer, Barış, 23 Nisan,
 * Misak-ı Millî, İnkılâp, Cumhuriyet and Müdafaa-i Hukuk.
 */
const TOWERS: [number, number][] = [
  [-30.2, 55.6],
  [-76.6, 55.6],
  [-76.6, -40.6],
  [-31.2, -40.6],
  [12.2, -40.6],
  [56.5, -40.6],
  [56.1, 55.8],
  [10.2, 55.8],
]

/** The Hall of Honour, round its columns. */
const HALL: Rect = [73.4, -16.9, 135.8, 34.2]
const PLINTH = 5
const CAPITALS = 19.5

function hall(): Part[] {
  const [u0] = HALL
  const parts: Part[] = [
    block(grow(HALL, 2), 0, PLINTH, 'stone'),
    // The hall behind the columns, its doorway set back between two piers
    block([88.5, -9, 128.6, 26.3], PLINTH, CAPITALS, 'shade'),
    block([83.8, -9, 88.5, 0.6], PLINTH, CAPITALS, 'shade'),
    block([83.8, 15.2, 88.5, 26.3], PLINTH, CAPITALS, 'shade'),
    block(grow(HALL, 0.3), CAPITALS, 23, 'stone'),
    block([81, -10, 128, 27.5], 23, 25.5, 'stone'),
  ]
  // 14 columns down each side and 10 across each end, heavier at the corners
  const column = (u: number, v: number, size = 1.7) =>
    block(square(u, v, size), PLINTH, CAPITALS, 'stone')
  const [cu0, cv0, cu1, cv1] = grow(HALL, -1.2)
  for (let i = 0; i < 14; i++) {
    const u = cu0 + ((cu1 - cu0) * i) / 13
    const size = i === 0 || i === 13 ? 3 : 1.7
    parts.push(column(u, cv0, size), column(u, cv1, size))
  }
  for (let i = 1; i < 9; i++) {
    const v = cv0 + ((cv1 - cv0) * i) / 9
    parts.push(column(cu0, v), column(cu1, v))
  }
  // The Victory Steps up from the plaza, round the rostrum
  const steps = 14
  const foot = 44
  for (let i = 0; i < steps; i++) {
    const u = foot + ((u0 - 2 - foot) * i) / steps
    parts.push(
      block([u, -6, u0 - 2, 24], 0, (PLINTH * (i + 1)) / steps, 'stone'),
    )
  }
  parts.push(block([57, 5, 64, 13], 0, PLINTH - 0.8, 'stone'))
  return parts
}

/** The Road of Lions, down its centre line. */
const ROAD = -13.6
const ROAD_START = 62.8
const ROAD_END = 309

/** The lions, 12 down each side, and the lamps between them. */
const LIONS = [-1, 1].flatMap((side) =>
  Array.from({ length: 12 }, (_, i): [number, number] => [
    ROAD + side * 9.6,
    78 + i * 19.2,
  ]),
)
const LAMPS = [-1, 1].flatMap((side) =>
  Array.from({ length: 11 }, (_, i): [number, number] => [
    ROAD + side * 7.6,
    87.6 + i * 19.2,
  ]),
)

function roadOfLions(): Part[] {
  const parts: Part[] = [
    block([ROAD - 8, ROAD_START, ROAD + 8, ROAD_END], 0, 0.2, 'paving'),
  ]
  for (const side of [-1, 1]) {
    // Low walls along the lawns
    const wall = ROAD + side * 24
    parts.push(block([wall - 0.4, 66, wall + 0.4, 306], 0, 0.9, 'stone'))
    // 12 lions down each side, in pairs, lying on their plinths and
    // looking across the road at each other
    for (const [u, v] of LIONS.filter(([u]) => Math.sign(u - ROAD) === side)) {
      // From `back` to `front` of a lion, measured towards the road
      const piece = (
        back: number,
        front: number,
        half: number,
        base: number,
        top: number,
        material: Material,
      ) => {
        const [u0, u1] = [u - side * back, u - side * front].sort(
          (a, b) => a - b,
        )
        return block([u0, v - half, u1, v + half], base, top, material)
      }
      parts.push(
        piece(-1.7, 1.7, 0.8, 0, 1.3, 'stone'),
        // Haunches, maned chest, head and front paws
        piece(-1.3, 0.5, 0.55, 1.3, 2.1, 'whitewash'),
        piece(0.2, 1, 0.65, 1.3, 2.6, 'whitewash'),
        piece(0.8, 1.5, 0.45, 2, 2.9, 'whitewash'),
        piece(1, 1.6, 0.5, 1.3, 1.6, 'whitewash'),
      )
    }
    // And a row of trees in each lawn
    for (let i = 0; i < 16; i++) {
      const spot = at(ROAD + side * 16.5, 72 + i * 15)
      parts.push(
        {
          kind: 'round',
          material: 'rock',
          sides: 6,
          at: spot,
          outline: [
            [0.3, 0],
            [0.3, 2.2],
          ],
        },
        {
          kind: 'round',
          material: 'leaf',
          sides: 10,
          at: spot,
          outline: [
            [1.4, 2.2],
            [2.4, 3.2],
            [2.6, 4.4],
            [2.1, 5.8],
            [1.1, 6.8],
            [0.2, 7.2],
          ],
        },
      )
    }
  }
  // Lamps down each side, between the lions
  for (const [u, v] of LAMPS) {
    parts.push(
      {
        kind: 'round',
        material: 'steel',
        sides: 6,
        at: at(u, v),
        outline: [
          [0.14, 0],
          [0.1, 4.2],
        ],
      },
      block(square(u, v, 0.6), 4.2, 4.8, 'lamp'),
    )
  }
  // İstiklal and Hürriyet, the towers at its head
  parts.push(
    ...tower([-40, 308.6, -27.7, 322.8], 11),
    ...tower([-0.4, 309, 12.4, 323], 11),
  )
  return parts
}

function plaza(): Part[] {
  return [
    block([-70.5, -34, 61, 48.8], 0, 0.2, 'paving'),
    // The field within its walk, edged in stone
    {
      kind: 'block',
      material: 'stone',
      footprint: box(-65, -26, 37, 42),
      holes: [box(-63.8, -24.8, 35.8, 40.8)],
      base: 0.2,
      top: 0.28,
    },
    // The openings to the Road of Lions and to the south steps
    block([-23.4, 48.8, 3.2, ROAD_START], 0, 0.2, 'paving'),
    block([-24.2, -47.5, 5.2, -34], 0, 0.2, 'paving'),
    // The flag, between the south steps
    block([-11.2, -40.3, -8.2, -37.3], 0, 1.2, 'stone'),
    {
      kind: 'round',
      material: 'steel',
      sides: 8,
      at: at(-9.7, -38.8),
      outline: [
        [0.3, 1.2],
        [0.15, 28],
      ],
    },
    block([-9.55, -38.86, -4.3, -38.74], 23.5, 27, 'flag'),
  ]
}

export const ANITKABIR: Landmark = {
  id: 'anitkabir',
  name: 'Anıtkabir',
  near: [32.8371, 39.925],
  // Every building of the complex, drawn here instead
  hide: [
    { at: at(-14, 7.5), within: 60, tallerThan: 0 },
    { at: at(104.6, 8.6), within: 42, tallerThan: 0 },
    { at: at(-33.9, 315.7), within: 4, tallerThan: 0 },
    { at: at(6, 316), within: 4, tallerThan: 0 },
  ],
  parts: [
    ...plaza(),
    ...ARCADES.flatMap(([rect, open]) => arcade(rect, open)),
    ...TOWERS.flatMap(([u, v]) => tower(square(u, v))),
    ...hall(),
    ...roadOfLions(),
  ],
  lights: [
    // Floodlights all round the Hall of Honour and at the foot of its steps
    ...lightsAlong(box(...grow(HALL, 7)), 9),
    ...[-4, 4, 12, 20].map((v) => at(42, v)),
    // Along the galleries, out on the plaza
    ...ARCADES.flatMap(([[u0, v0, u1, v1], open]): XY[] => {
      const along = open === 'v0' || open === 'v1'
      const [a0, a1] = along ? [u0, u1] : [v0, v1]
      const face = { u0: u0 - 3, u1: u1 + 3, v0: v0 - 3, v1: v1 + 3 }[open]
      const count = Math.max(1, Math.round((a1 - a0) / 11))
      return Array.from({ length: count + 1 }, (_, i) => {
        const a = a0 + ((a1 - a0) * i) / count
        return along ? at(a, face) : at(face, a)
      })
    }),
    at(-9.7, -38.8),
    // The lions and lamps down the Road of Lions, and the towers at its head
    ...[...LIONS, ...LAMPS].map(([u, v]) => at(u, v)),
    at(-33.9, 305),
    at(6, 305),
  ],
}
