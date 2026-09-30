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
export function minaret(at: XY, height: number, radius = 2.3): Part[] {
  const cap = height * 0.14
  const top = height - cap
  const balconies = height > 70 ? [0.55, 0.68, 0.8] : [0.6, 0.76]
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
    { kind: 'round', material: 'stone', sides: 16, at, outline },
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
