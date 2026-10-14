import type { Landmark, Material, Part, XY } from './landmarks.ts'
import { circle, grid, lightsAlong } from './shapes.ts'

/*
 * Istanbul: Ali Sami Yen Spor Kompleksi RAMS Park, Galatasaray's stadium
 * in Seyrantepe (opened 2011), laid out on the pitch's own grid: `u` runs
 * along its 105 m (east to west), `v` across its 68 m.
 * - the pitch, mown in stripes and marked out, with its goals and the two
 *   technical areas,
 * - the bowl round it: a lower tier raked at 20°, a level of boxes behind
 *   glass and an upper tier raked at 34°, seated in the club's red and gold,
 * - the façade: glass between piers of raw concrete, on floor slabs, with
 *   its gates under gold canopies,
 * - the roof, a membrane on a steel truss over all the stands and open
 *   above the pitch, with the floodlights hung from its inner ring,
 * - the plaza round it, and its lamps.
 * Its place, outline (about 226 × 186 m, corners rounded at some 75 m) and
 * heading are measured from OpenStreetMap's own building as the map drew
 * it. The pitch and the tiers' rakes are the stadium's figures; the
 * heights, and the shapes within the outline, are estimates.
 */

const DEG = Math.PI / 180

/** The pitch lies east to west, its goals at the two ends */
const { at, box } = grid(0)

/** A rounded rectangle: half its length and width, and its corners' radius. */
type Shape = { hu: number; hv: number; r: number }
/** A spot on one, and the way out from it (an angle from the pitch's axis). */
type Spot = { u: number; v: number; angle: number }

const lerp = (from: number, to: number, t: number) => from + (to - from) * t

/**
 * The bowl's outline a fraction `t` of the way out from the first row of
 * seats (0) to the façade's piers (1), and on beyond them.
 */
const shape = (t: number): Shape => ({
  hu: lerp(65, 113, t),
  hv: lerp(41, 93, t),
  r: lerp(8, 74.5, t),
})

const ARC_STEPS = 6

/**
 * The way round a rounded rectangle, anticlockwise: its four sides and four
 * corners by turns, each a length long. `walk` finds the spot a distance
 * round it.
 */
function perimeter({ hu, hv, r: radius }: Shape) {
  const r = Math.max(1, Math.min(radius, hu, hv))
  const [du, dv] = [hu - r, hv - r]
  const corner = (Math.PI / 2) * r
  const lengths = [
    2 * dv,
    corner,
    2 * du,
    corner,
    2 * dv,
    corner,
    2 * du,
    corner,
  ]
  const length = lengths.reduce((sum, l) => sum + l, 0)

  /** The spot `along` metres into side or corner `i` */
  const spot = (i: number, along: number): Spot => {
    const side = i >> 1
    if (i % 2 === 0) {
      const [u, v] = [
        [hu, -dv + along],
        [du - along, hv],
        [-hu, dv - along],
        [-du + along, -hv],
      ][side]
      return { u, v, angle: side * 90 * DEG }
    }
    const angle = (side + along / corner) * 90 * DEG
    const [cu, cv] = [
      [du, dv],
      [-du, dv],
      [-du, -dv],
      [du, -dv],
    ][side]
    return { u: cu + r * Math.cos(angle), v: cv + r * Math.sin(angle), angle }
  }

  const walk = (distance: number): Spot => {
    let rest = ((distance % length) + length) % length
    let i = 0
    while (i < 7 && rest > lengths[i]) rest -= lengths[i++]
    return spot(i, rest)
  }
  return { length, lengths, spot, walk }
}

/** A shape's outline, with its corners rounded off in a few steps. */
function outline(shape: Shape): XY[] {
  const { lengths, spot } = perimeter(shape)
  return lengths.flatMap((length, i) => {
    const steps = i % 2 ? ARC_STEPS : 1
    return Array.from({ length: steps }, (_, j) => {
      const { u, v } = spot(i, (length * j) / steps)
      return at(u, v)
    })
  })
}

const block = (
  footprint: XY[],
  base: number,
  top: number,
  material: Material,
  holes?: XY[][],
): Part => ({ kind: 'block', footprint, holes, base, top, material })

/** The bowl between two of its outlines, raised from `base` to `top`. */
const ring = (
  from: number,
  to: number,
  base: number,
  top: number,
  material: Material,
): Part =>
  block(outline(shape(to)), base, top, material, [outline(shape(from))])

/** The point `along` metres along a wall from a spot, and `out` from it. */
const offsetFrom = ({ u, v, angle }: Spot, along: number, out: number): XY =>
  at(
    u - Math.sin(angle) * along + Math.cos(angle) * out,
    v + Math.cos(angle) * along + Math.sin(angle) * out,
  )

/** A rectangle against a wall: `width` along it, `depth` and `out` from it. */
const onWall = (
  spot: Spot,
  width: number,
  depth: number,
  out: number,
): XY[] => [
  offsetFrom(spot, -width / 2, out - depth / 2),
  offsetFrom(spot, width / 2, out - depth / 2),
  offsetFrom(spot, width / 2, out + depth / 2),
  offsetFrom(spot, -width / 2, out + depth / 2),
]

const PITCH: XY = [52.5, 34]
const MARK = 0.4
const LINE = 0.5

/** A line of the pitch: a rectangle of white, hollow if it has a width. */
const chalk = (footprint: XY[], holes?: XY[][]): Part =>
  block(footprint, MARK, MARK + 0.1, 'whitewash', holes)

/** A rectangle of the markings, drawn as a line `LINE` wide round it. */
const marking = (u0: number, v0: number, u1: number, v1: number): Part =>
  chalk(box(u0, v0, u1, v1), [box(u0 + LINE, v0 + LINE, u1 - LINE, v1 - LINE)])

/** Part of a circle of the markings, between two angles. */
function arc([cu, cv]: XY, radius: number, from: number, to: number): Part {
  const steps = 12
  const along = (r: number, back: boolean) =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const a = lerp(from, to, (back ? steps - i : i) / steps) * DEG
      return at(cu + r * Math.cos(a), cv + r * Math.sin(a))
    })
  return chalk([
    ...along(radius + LINE / 2, false),
    ...along(radius - LINE / 2, true),
  ])
}

/** A spot of the markings. */
const dot = (u: number, v: number): Part => ({
  kind: 'round',
  material: 'whitewash',
  sides: 8,
  at: at(u, v),
  outline: [
    [0.3, MARK],
    [0.3, MARK + 0.1],
  ],
})

/** The pitch, 105 × 68 m: mown in stripes, marked out, with its goals. */
function pitch(): Part[] {
  const [hu, hv] = PITCH
  const stripes = 15
  const parts: Part[] = Array.from({ length: stripes }, (_, i) =>
    block(
      box(
        lerp(-hu, hu, i / stripes),
        -hv,
        lerp(-hu, hu, (i + 1) / stripes),
        hv,
      ),
      0,
      MARK,
      i % 2 ? 'green' : 'leaf',
    ),
  )
  parts.push(
    marking(-hu, -hv, hu, hv),
    chalk(box(-LINE / 2, -hv + LINE, LINE / 2, hv - LINE)),
    chalk(
      circle(9.15 + LINE / 2, 36).map(([x, y]) => at(x, y)),
      [circle(9.15 - LINE / 2, 36).map(([x, y]) => at(x, y))],
    ),
    dot(0, 0),
  )
  for (const end of [1, -1]) {
    const [near, far] = [end * (hu - 16.5), end * hu].sort((a, b) => a - b)
    const [small, goal] = [end * (hu - 5.5), end * hu].sort((a, b) => a - b)
    parts.push(
      marking(near, -20.15, far, 20.15),
      marking(small, -9.16, goal, 9.16),
      dot(end * (hu - 11), 0),
      // The penalty arc, outside the area
      arc(
        [end * (hu - 11), 0],
        9.15,
        end > 0 ? 126.9 : -53.1,
        end > 0 ? 233.1 : 53.1,
      ),
    )
    // The goal: posts and a crossbar, 7.32 m across and 2.44 m high
    for (const side of [1, -1]) {
      parts.push({
        kind: 'round',
        material: 'steel',
        sides: 8,
        at: at(end * (hu + 0.12), side * 3.66),
        outline: [
          [0.12, MARK],
          [0.12, MARK + 2.44],
        ],
      })
    }
    const [back, front] = [end * hu, end * (hu + 0.24)].sort((a, b) => a - b)
    parts.push(
      block(box(back, -3.78, front, 3.78), MARK + 2.32, MARK + 2.44, 'steel'),
    )
  }
  // The technical areas: a bench under a glass shelter either side of the
  // halfway line
  for (const u of [-9, 9]) {
    parts.push(
      block(box(u - 5, -39.4, u + 5, -37.6), 0.3, 1.8, 'tint'),
      block(box(u - 5.4, -39.8, u + 5.4, -37.2), 1.8, 2.1, 'steel'),
    )
  }
  return parts
}

const STEPS = 11
/** How far the bowl runs out across the pitch, from the first row to the piers */
const DEPTH = 93 - 41
/** The rise of a step, over the stretch of the bowl it covers, at a rake. */
const rise = (from: number, to: number, degrees: number) =>
  ((to - from) / STEPS) * DEPTH * Math.tan(degrees * DEG)

/**
 * The seating, from the pitch out: the lower tier, raked at 20° (three rows
 * to a step); the boxes, behind glass; and the upper tier, raked at 34°.
 */
function stands(): Part[] {
  const [lower, boxes, upper] = [0.394, 0.515, 0.94]
  const [floor, glass] = [9.5, 12.9]
  const parts: Part[] = []
  for (let k = 0; k < STEPS; k++) {
    parts.push(
      ring(
        lerp(0, lower, k / STEPS),
        lerp(0, lower, (k + 1) / STEPS),
        0,
        1.2 + rise(0, lower, 20) * (k + 1),
        k % 4 === 1 ? 'gold' : 'red',
      ),
    )
  }
  parts.push(
    ring(lower, boxes, 0, floor, 'concrete'),
    ring(lower, lower + 0.01, floor, glass, 'windows'),
    ring(lower + 0.01, boxes, floor, glass, 'concrete'),
  )
  for (let k = 0; k < STEPS; k++) {
    parts.push(
      ring(
        lerp(boxes, upper, k / STEPS),
        lerp(boxes, upper, (k + 1) / STEPS),
        0,
        glass + rise(boxes, upper, 34) * (k + 1),
        k % 4 === 2 ? 'gold' : 'red',
      ),
    )
  }
  return parts
}

/** Piers round the façade, and a gate between some of them. */
const STATIONS = 128
const FACADE = perimeter(shape(1))
const station = (k: number): Spot =>
  FACADE.walk(((k + 0.5) * FACADE.length) / STATIONS)
const isGate = (k: number) => k % 8 === 4
/** A gate fills the space of two piers' stations, less the piers' own width */
const GATE = (2 * FACADE.length) / STATIONS - 2.8

/** The floor slabs' tops: the façade is glass between them. */
const SLABS = [8, 15.2, 22.4, 29, 35.4]
const WALL_TOP = SLABS[SLABS.length - 1]
/** Where the piers narrow */
const PIER_STEP = 18

/**
 * The façade: the stands' back wall in glass, banded with slabs of
 * concrete, the piers of raw concrete that stand out from it, narrowing
 * above, and the gates between some of them under gold canopies.
 */
function facade(): Part[] {
  const parts: Part[] = [ring(0.94, 0.96, 0, WALL_TOP, 'tint')]
  SLABS.forEach((top, i) => {
    parts.push(
      ring(
        0.96,
        0.972,
        i ? SLABS[i - 1] : 0,
        top - 1,
        i % 2 ? 'glass' : 'windows',
      ),
      ring(0.96, 0.985, top - 1, top, 'concrete'),
    )
  })
  for (let k = 0; k < STATIONS; k++) {
    const spot = station(k)
    if (isGate(k)) {
      parts.push(
        block(onWall(spot, GATE, 2.2, -1.4), 0, SLABS[0] - 1, 'windows'),
        block(
          onWall(spot, GATE + 2.2, 4.4, 0.9),
          SLABS[0] - 1,
          SLABS[0],
          'gold',
        ),
      )
      continue
    }
    parts.push(
      block(onWall(spot, 2.6, 3, -1.5), 0, PIER_STEP, 'concrete'),
      block(onWall(spot, 2, 2.6, -1.7), PIER_STEP, WALL_TOP, 'concrete'),
    )
  }
  return parts
}

const ROOF_IN = 0.315
const ROOF_OUT = 1.03
const ROOF_THICK = 3.4
const ROOF_RINGS = 12
/** The membrane's height at the opening and at the rim */
const ROOF_LOW = 34.6
const ROOF_HIGH = 38.6
const roofTop = (t: number) =>
  lerp(ROOF_LOW, ROOF_HIGH, (t - ROOF_IN) / (ROOF_OUT - ROOF_IN))

/**
 * The roof: a membrane on a deep steel truss, rising from the opening over
 * the pitch to the rim over the façade, with its steel inner ring and
 * edge, and the floodlights along the ring.
 */
function roof(): Part[] {
  const parts: Part[] = []
  for (let i = 0; i < ROOF_RINGS; i++) {
    const [from, to] = [
      lerp(ROOF_IN, ROOF_OUT, i / ROOF_RINGS),
      lerp(ROOF_IN, ROOF_OUT, (i + 1) / ROOF_RINGS),
    ]
    const top = roofTop((from + to) / 2)
    parts.push(ring(from, to, top - ROOF_THICK, top, 'whitewash'))
  }
  parts.push(
    ring(ROOF_IN - 0.02, ROOF_IN, ROOF_LOW - 4, ROOF_LOW + 0.8, 'steel'),
    ring(ROOF_OUT, 1.04, ROOF_HIGH - 4, ROOF_HIGH + 0.5, 'steel'),
  )
  for (const [x, y] of lightsAlong(outline(shape(ROOF_IN - 0.03)), 9)) {
    parts.push(
      block(
        [
          [x - 0.9, y - 0.9],
          [x + 0.9, y - 0.9],
          [x + 0.9, y + 0.9],
          [x - 0.9, y + 0.9],
        ],
        ROOF_LOW - 3,
        ROOF_LOW - 1.4,
        'lamp',
      ),
    )
  }
  return parts
}

/** Whether a spot of the grid is inside a rounded rectangle. */
function within({ hu, hv, r: radius }: Shape, u: number, v: number) {
  const r = Math.min(radius, hu, hv)
  return (
    Math.hypot(
      Math.max(Math.abs(u) - (hu - r), 0),
      Math.max(Math.abs(v) - (hv - r), 0),
    ) <= r
  )
}

/**
 * The seams of the roof's membrane: ribs running down its slope from the
 * rim to the opening, every fourth pier, a piece to each ring of the roof.
 */
function seams(): Part[] {
  const rim = perimeter(shape(ROOF_OUT))
  const opening = shape(ROOF_IN)
  const parts: Part[] = []
  for (let k = 2; k < STATIONS; k += 4) {
    const spot = rim.walk(((k + 0.5) * rim.length) / STATIONS)
    const [nu, nv] = [Math.cos(spot.angle), Math.sin(spot.angle)]
    // How far in the opening is
    let reach = 0
    while (!within(opening, spot.u - nu * reach, spot.v - nv * reach)) {
      reach += 0.5
    }
    for (let i = 0; i < ROOF_RINGS; i++) {
      const [from, to] = [
        (reach * i) / ROOF_RINGS,
        (reach * (i + 1)) / ROOF_RINGS,
      ]
      // The ring of the roof under it, counted in from the rim
      const under = ROOF_RINGS - 1 - i
      const top =
        roofTop(lerp(ROOF_IN, ROOF_OUT, (under + 0.5) / ROOF_RINGS)) + 0.35
      parts.push(
        block(
          [
            offsetFrom(spot, -0.45, -from),
            offsetFrom(spot, 0.45, -from),
            offsetFrom(spot, 0.45, -to),
            offsetFrom(spot, -0.45, -to),
          ],
          top - 0.9,
          top,
          'roof',
        ),
      )
    }
  }
  return parts
}

/** Lamp posts all round the plaza. */
const LAMPS = lightsAlong(outline(shape(1.19)), 24)

/** The plaza: paving round the stadium, and the lamps on it. */
function plaza(): Part[] {
  const parts: Part[] = [
    block(outline(shape(1.25)), 0, 0.15, 'paving', [outline(shape(1))]),
    // The grass between the pitch and the first row of seats
    block(outline(shape(0)), 0, 0.3, 'green'),
  ]
  for (const lamp of LAMPS) {
    parts.push(
      {
        kind: 'round',
        material: 'steel',
        sides: 6,
        at: lamp,
        outline: [
          [0.2, 0],
          [0.2, 9],
        ],
      },
      {
        kind: 'round',
        material: 'lamp',
        sides: 6,
        at: lamp,
        outline: [
          [0.6, 9],
          [0.6, 9.6],
        ],
      },
    )
  }
  return parts
}

export const RAMS_PARK: Landmark = {
  id: 'rams-park',
  name: 'Ali Sami Yen Spor Kompleksi RAMS Park',
  near: [28.991181, 41.103248],
  // The stadium's building, and any stands or podium drawn apart from it:
  // OpenStreetMap gives it no height, so the map draws it low, not above 6
  hide: [{ within: 80, tallerThan: 0 }],
  lights: [
    ...LAMPS,
    ...Array.from({ length: STATIONS }, (_, k) => k)
      .filter(isGate)
      .map((k) => offsetFrom(station(k), 0, 8)),
  ],
  parts: [
    ...pitch(),
    ...stands(),
    ...facade(),
    ...roof(),
    ...seams(),
    ...plaza(),
  ],
}
