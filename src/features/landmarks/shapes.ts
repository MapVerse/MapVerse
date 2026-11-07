import type { XY } from './geometry.ts'
import type { Material, Part, ProfilePoint } from './landmarks.ts'

export const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
]

export const circle = (r: number, steps = 24): XY[] =>
  Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * 2 * Math.PI
    return [r * Math.cos(a), r * Math.sin(a)]
  })

export const ellipse = (rx: number, ry: number, steps = 20): XY[] =>
  Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * 2 * Math.PI
    // A little uneven, like a rock
    const wobble = 1 + 0.06 * Math.sin(a * 3) + 0.04 * Math.cos(a * 5)
    return [rx * wobble * Math.cos(a), ry * wobble * Math.sin(a)]
  })

/** A footprint grown or shrunk round a point. */
export const scaled = (
  footprint: XY[],
  by: number,
  [cx, cy]: XY = [0, 0],
): XY[] => footprint.map(([x, y]) => [cx + (x - cx) * by, cy + (y - cy) * by])

/**
 * A layout turned `angle` from east, for a place built on its own grid:
 * `at(u, v)` is `u` metres along it and `v` across it, and `box` is a
 * rectangle between two corners.
 */
export function grid(angle: number) {
  const [c, s] = [Math.cos(angle), Math.sin(angle)]
  const at = (u: number, v: number): XY => [u * c - v * s, u * s + v * c]
  const box = (u0: number, v0: number, u1: number, v1: number): XY[] => [
    at(u0, v0),
    at(u1, v0),
    at(u1, v1),
    at(u0, v1),
  ]
  return { at, box }
}

/**
 * A hipped roof over a rectangle of a grid, as layers narrowing to a
 * ridge (or to a point, over a square).
 */
export function hipRoof(
  box: (u0: number, v0: number, u1: number, v1: number) => XY[],
  [u0, v0, u1, v1]: [number, number, number, number],
  base: number,
  rise: number,
  layers = 4,
): Part[] {
  const half = Math.min(u1 - u0, v1 - v0) / 2
  return Array.from({ length: layers }, (_, i): Part => {
    const inset = (half * i) / layers
    return {
      kind: 'block',
      material: 'roof',
      footprint: box(u0 + inset, v0 + inset, u1 - inset, v1 - inset),
      base: base + (rise * i) / layers,
      top: base + (rise * (i + 1)) / layers,
    }
  })
}

/** A dome's outline: a quarter circle (flattened by `rise`) from its base. */
export function domeOutline(
  radius: number,
  base: number,
  rise: number,
): ProfilePoint[] {
  return Array.from({ length: 10 }, (_, i) => {
    const t = (i / 9) * (Math.PI / 2)
    return [radius * Math.cos(t), base + rise * Math.sin(t)]
  })
}

export function dome(
  radius: number,
  base: number,
  rise: number,
  at?: XY,
  material: Material = 'lead',
): Part[] {
  return [
    { kind: 'round', material, at, outline: domeOutline(radius, base, rise) },
    // The finial on top
    {
      kind: 'round',
      material: 'lead',
      sides: 8,
      at,
      outline: [
        [0.35, base + rise],
        [0.15, base + rise + 2.5],
      ],
    },
  ]
}

/**
 * A minaret: a slim stone shaft with balconies (şerefe) round it, under a
 * pointed lead cap.
 */
export function minaret(
  at: XY,
  height: number,
  radius = 2.3,
  options: {
    /** How many balconies, from one to three */
    balconies?: number
    material?: Material
  } = {},
): Part[] {
  const cap = height * 0.14
  const top = height - cap
  const count = options.balconies ?? (height > 70 ? 3 : 2)
  const balconies = [[0.72], [0.6, 0.76], [0.55, 0.68, 0.8]][count - 1]
  const outline: ProfilePoint[] = [
    [radius + 0.8, 0],
    [radius + 0.8, 9],
    [radius, 9.5],
  ]
  for (const b of balconies) {
    const h = top * b
    outline.push(
      [radius * 0.95, h],
      [radius + 1.2, h + 0.3],
      [radius + 1.2, h + 1.3],
      [radius * 0.9, h + 1.6],
    )
  }
  outline.push([radius * 0.82, top])
  return [
    {
      kind: 'round',
      material: options.material ?? 'stone',
      sides: 16,
      at,
      outline,
    },
    {
      kind: 'round',
      material: 'lead',
      sides: 16,
      at,
      outline: [
        [radius * 0.9, top],
        [0.2, height],
        [0.12, height + 2.5],
      ],
    },
  ]
}

type Rect = [u0: number, v0: number, u1: number, v1: number]

/**
 * A domed mosque on its own grid, `u` towards the qibla and the main dome
 * at the centre: the prayer hall, half and corner domes round the raised
 * main dome, turrets weighing down its corners, the minarets and the
 * arcaded courtyard before it.
 */
export function mosque(options: {
  /** Of the qibla, from east */
  angle: number
  hall: Rect
  wall: number
  material?: Material
  dome: { radius: number; base: number; rise: number; sides?: number }
  halfDomes?: { radius: number; offset: number; rise: number; across?: boolean }
  cornerDomes?: { radius: number; offset: number; rise: number }
  turrets?: { offset: number; top: number }
  minarets: { at: [number, number][]; height: number }[]
  courtyard?: Rect
}): Part[] {
  const { at, box } = grid(options.angle)
  const { wall, dome: main } = options
  const material = options.material ?? 'stone'
  const parts: Part[] = [
    {
      kind: 'block',
      material,
      footprint: box(...options.hall),
      base: 0,
      top: wall,
    },
  ]
  const corners = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const
  if (options.cornerDomes) {
    const { radius, offset, rise } = options.cornerDomes
    for (const [su, sv] of corners) {
      parts.push(...dome(radius, wall, rise, at(su * offset, sv * offset)))
    }
  }
  if (options.halfDomes) {
    const { radius, offset, rise, across } = options.halfDomes
    const spots = [at(offset, 0), at(-offset, 0)]
    if (across) spots.push(at(0, offset), at(0, -offset))
    for (const spot of spots) parts.push(...dome(radius, wall, rise, spot))
  }
  if (options.turrets) {
    const { offset, top } = options.turrets
    for (const [su, sv] of corners) {
      const spot = at(su * offset, sv * offset)
      parts.push(
        {
          kind: 'round',
          material,
          sides: 8,
          at: spot,
          outline: [
            [1.8, wall],
            [1.8, top],
          ],
        },
        ...dome(1.9, top, 2, spot),
      )
    }
  }
  // A drum raises the main dome over the rest
  if (main.base > wall) {
    parts.push({
      kind: 'round',
      material,
      sides: main.sides ?? 32,
      outline: [
        [main.radius + 0.8, wall],
        [main.radius + 0.8, main.base],
      ],
    })
  }
  parts.push(...dome(main.radius, main.base, main.rise))
  for (const { at: spots, height } of options.minarets) {
    for (const [u, v] of spots) parts.push(...minaret(at(u, v), height))
  }
  if (options.courtyard) {
    const [u0, v0, u1, v1] = options.courtyard
    const depth = 7
    for (const side of [
      [u0, v0, u1, v0 + depth],
      [u0, v1 - depth, u1, v1],
      [u0, v0 + depth, u0 + depth, v1 - depth],
    ] as Rect[]) {
      parts.push(
        { kind: 'block', material, footprint: box(...side), base: 0, top: 8 },
        {
          kind: 'block',
          material: 'lead',
          footprint: box(side[0] + 1, side[1] + 1, side[2] - 1, side[3] - 1),
          base: 8,
          top: 9.5,
        },
      )
    }
    // The ablution fountain in the middle
    const middle = at((u0 + u1) / 2, (v0 + v1) / 2)
    parts.push(
      {
        kind: 'round',
        material,
        sides: 8,
        at: middle,
        outline: [
          [3.2, 0],
          [3.2, 3.5],
        ],
      },
      ...dome(3.6, 3.5, 2.2, middle),
    )
  }
  return parts
}

/** Points round a circle, e.g. floodlights round a tower's foot. */
export const lightsRound = (
  radius: number,
  count: number,
  [cx, cy]: XY = [0, 0],
): XY[] =>
  Array.from({ length: count }, (_, i) => {
    const a = (i / count) * 2 * Math.PI
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)]
  })

/** Points every `spacing` metres round a footprint, e.g. along its walls. */
export function lightsAlong(footprint: XY[], spacing: number): XY[] {
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

/**
 * A footprint grown outwards (or, by a negative amount, shrunk) by a few
 * metres all round, its walls kept parallel, as for a band round a
 * building's facades.
 */
export function grown(footprint: XY[], by: number): XY[] {
  let area = 0
  footprint.forEach(([x0, y0], i) => {
    const [x1, y1] = footprint[(i + 1) % footprint.length]
    area += x0 * y1 - x1 * y0
  })
  const side = area > 0 ? 1 : -1
  // Each wall's outward normal
  const normals = footprint.map(([x0, y0], i): XY => {
    const [x1, y1] = footprint[(i + 1) % footprint.length]
    const length = Math.hypot(x1 - x0, y1 - y0) || 1
    return [(side * (y1 - y0)) / length, (side * -(x1 - x0)) / length]
  })
  return footprint.map(([x, y], i) => {
    const [ax, ay] = normals[(i - 1 + footprint.length) % footprint.length]
    const [bx, by_] = normals[i]
    // Where the two moved walls meet, kept in check at sharp corners
    const scale = by / Math.max(0.2, 1 + ax * bx + ay * by_)
    return [x + (ax + bx) * scale, y + (ay + by_) * scale]
  })
}

/**
 * A row of windows along a wall, from one corner to the next with the
 * wall's outside to the right (as when walking round the building
 * anticlockwise): `count` windows `width` wide, a little proud of the
 * wall, in each of the storeys given as heights from and to.
 */
export function windowRow(
  from: XY,
  to: XY,
  count: number,
  width: number,
  storeys: [base: number, top: number][],
  material: Material = 'windows',
): Part[] {
  const [dx, dy] = [to[0] - from[0], to[1] - from[1]]
  const length = Math.hypot(dx, dy) || 1
  const [ux, uy] = [dx / length, dy / length]
  // Out of the wall, to its right
  const [nx, ny] = [uy, -ux]
  const parts: Part[] = []
  for (let i = 0; i < count; i++) {
    const along = ((i + 0.5) / count) * length
    const corner = (side: number, out: number): XY => [
      from[0] + ux * (along + side) + nx * out,
      from[1] + uy * (along + side) + ny * out,
    ]
    const half = width / 2
    const footprint = [
      corner(-half, -0.2),
      corner(half, -0.2),
      corner(half, 0.25),
      corner(-half, 0.25),
    ]
    for (const [base, top] of storeys) {
      parts.push({ kind: 'block', material, footprint, base, top })
    }
  }
  return parts
}

/**
 * Windows all round a footprint wound anticlockwise (as `grid`'s boxes
 * are), about one every `spacing` metres along each wall.
 */
export const windowsRound = (
  footprint: XY[],
  spacing: number,
  width: number,
  storeys: [base: number, top: number][],
  material: Material = 'windows',
): Part[] =>
  footprint.flatMap((from, i) => {
    const to = footprint[(i + 1) % footprint.length]
    const length = Math.hypot(to[0] - from[0], to[1] - from[1])
    const count = Math.floor(length / spacing)
    return count > 0 ? windowRow(from, to, count, width, storeys, material) : []
  })

/**
 * A fluted round shape, like a ribbed drum or cone: layers whose outline
 * has `flutes` ribs, with grooves `depth` (a share of the radius) between
 * them.
 */
export function fluted(
  at: XY,
  outline: ProfilePoint[],
  flutes: number,
  material: Material,
  depth = 0.08,
): Part[] {
  const star = (radius: number): XY[] =>
    Array.from({ length: flutes * 2 }, (_, i) => {
      const a = (i / (flutes * 2)) * 2 * Math.PI
      const r = i % 2 === 0 ? radius : radius * (1 - depth)
      return [at[0] + r * Math.cos(a), at[1] + r * Math.sin(a)]
    })
  const parts: Part[] = []
  for (let i = 0; i < outline.length - 1; i++) {
    const [r0, h0] = outline[i]
    const [r1, h1] = outline[i + 1]
    if (h1 - h0 < 0.05) continue
    const steps = Math.max(1, Math.ceil(Math.abs(r1 - r0) / 0.4))
    for (let j = 0; j < steps; j++) {
      const radius = r0 + ((r1 - r0) * (j + 0.5)) / steps
      if (radius < 0.05) continue
      parts.push({
        kind: 'block',
        material,
        footprint: star(radius),
        base: h0 + ((h1 - h0) * j) / steps,
        top: h0 + ((h1 - h0) * (j + 1)) / steps,
      })
    }
  }
  return parts
}

/**
 * A wall pierced by round arched openings, on a grid: piers and openings
 * by turns along `u` from `u0` (a pier first and last), the wall `v0` to
 * `v1` thick. Above where the arches spring, each opening closes in step
 * by step like a semicircle, and the wall runs on solid up to its top.
 */
export function arcade(
  box: (u0: number, v0: number, u1: number, v1: number) => XY[],
  options: {
    u0: number
    v0: number
    v1: number
    piers: number[]
    openings: number[]
    springs: number
    top: number
    material: Material
  },
): Part[] {
  const { v0, v1, piers, openings, springs, top, material } = options
  const block = (u0: number, u1: number, base: number, height: number) =>
    ({
      kind: 'block',
      material,
      footprint: box(u0, v0, u1, v1),
      base,
      top: height,
    }) satisfies Part
  const parts: Part[] = []
  let u = options.u0
  piers.forEach((pier, i) => {
    parts.push(block(u, u + pier, 0, top))
    u += pier
    const width = openings[i]
    if (width === undefined) return
    const half = width / 2
    const steps = 5
    for (let s = 0; s < steps; s++) {
      const h0 = springs + (half * s) / steps
      if (h0 >= top) break
      const h1 = Math.min(top, springs + (half * (s + 1)) / steps)
      // How far the arch's curve is from its middle, halfway up the step
      const mid = (s + 0.5) / steps
      const inner = half * Math.sqrt(1 - mid * mid)
      parts.push(
        block(u, u + half - inner, h0, h1),
        block(u + half + inner, u + width, h0, h1),
      )
    }
    if (springs + half < top)
      parts.push(block(u, u + width, springs + half, top))
    u += width
  })
  return parts
}
