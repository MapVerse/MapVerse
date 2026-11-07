import { distanceMeters } from '../place/place.ts'

export type LngLat = [number, number]

/** A route's line, with how far along it each of its points stands. */
export type Line = {
  points: LngLat[]
  /** From the start to each point, in metres */
  along: number[]
  length: number
}

/** Where a point falls on a line: the nearest place on it. */
export type Snap = {
  point: LngLat
  /** From the line's start, in metres */
  along: number
  /** From the point to the line, in metres */
  distance: number
  /** The piece of line it falls on, by the index of its first point */
  segment: number
  /** That piece's way, in degrees from north */
  bearing: number
}

const RAD = Math.PI / 180
const EARTH_RADIUS_M = 6_371_008.8

export function measure(points: LngLat[]): Line {
  const along = [0]
  for (let i = 1; i < points.length; i++) {
    along.push(along[i - 1] + distanceMeters(points[i - 1], points[i]))
  }
  return { points, along, length: along.at(-1) ?? 0 }
}

/** The way from one point to another, in degrees from north (0 to 360). */
export function bearing([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const y = Math.sin((lng2 - lng1) * RAD) * Math.cos(lat2 * RAD)
  const x =
    Math.cos(lat1 * RAD) * Math.sin(lat2 * RAD) -
    Math.sin(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.cos((lng2 - lng1) * RAD)
  return (Math.atan2(y, x) / RAD + 360) % 360
}

/** A point on a piece of line, `t` of the way from its first to its last. */
const lerp = (a: LngLat, b: LngLat, t: number): LngLat => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
]

/** The nearest place on one piece of line, as a share of the way along it. */
function onSegment(p: LngLat, a: LngLat, b: LngLat): number {
  // Flat, in metres round the piece: near enough over a few hundred metres
  const k = Math.cos(a[1] * RAD) * EARTH_RADIUS_M * RAD
  const m = EARTH_RADIUS_M * RAD
  const [bx, by] = [(b[0] - a[0]) * k, (b[1] - a[1]) * m]
  const [px, py] = [(p[0] - a[0]) * k, (p[1] - a[1]) * m]
  const length2 = bx * bx + by * by
  if (length2 === 0) return 0
  return Math.min(1, Math.max(0, (px * bx + py * by) / length2))
}

function snapTo(line: Line, p: LngLat, i: number): Snap {
  const a = line.points[i]
  const b = line.points[i + 1] ?? a
  const t = onSegment(p, a, b)
  const point = lerp(a, b, t)
  return {
    point,
    along: line.along[i] + (line.along[i + 1] - line.along[i] || 0) * t,
    distance: distanceMeters(p, point),
    segment: i,
    bearing: bearing(a, b),
  }
}

/** The nearest place on the pieces from `first` to `last`. */
function nearest(line: Line, p: LngLat, first: number, last: number) {
  let best: Snap | null = null
  for (let i = first; i <= last; i++) {
    const snap = snapTo(line, p, i)
    if (!best || snap.distance < best.distance) best = snap
  }
  return best
}

/** How much nearer elsewhere on the line must be to be taken instead of
 *  near where one was, in metres: a road travelled twice, or a junction
 *  the route goes through again later, would else be jumped to. */
const ELSEWHERE_M = 25

/**
 * Where a point falls on a line (map matching by the nearest piece of it).
 * Given how far along one was last, it keeps to the line round there,
 * from a little behind to well ahead, unless elsewhere is clearly nearer.
 */
export function snap(
  line: Line,
  p: LngLat,
  near?: { along: number; behind?: number; ahead?: number },
): Snap {
  const last = Math.max(0, line.points.length - 2)
  const everywhere = nearest(line, p, 0, last)!
  if (!near) return everywhere
  const from = near.along - (near.behind ?? 60)
  const to = near.along + (near.ahead ?? 1500)
  let first = 0
  while (first < last && line.along[first + 1] < from) first++
  let end = first
  while (end < last && line.along[end + 1] < to) end++
  const around = nearest(line, p, first, end)!
  return everywhere.distance < around.distance - ELSEWHERE_M
    ? everywhere
    : around
}

/** The point a distance along a line, and the piece it falls on. */
export function pointAlong(line: Line, along: number): LngLat {
  const { points } = line
  if (along <= 0 || points.length < 2) return points[0]
  if (along >= line.length) return points[points.length - 1]
  let i = 0
  while (i < points.length - 2 && line.along[i + 1] < along) i++
  const piece = line.along[i + 1] - line.along[i]
  return lerp(
    points[i],
    points[i + 1],
    piece ? (along - line.along[i]) / piece : 0,
  )
}

/** A line cut in two at a distance along it: behind, and still ahead. */
export function splitAt(line: Line, along: number): [LngLat[], LngLat[]] {
  const { points } = line
  if (points.length < 2) return [[], points]
  const at = pointAlong(line, along)
  let i = 0
  while (i < points.length - 2 && line.along[i + 1] <= along) i++
  if (along <= 0) return [[], points]
  if (along >= line.length) return [points, []]
  return [
    [...points.slice(0, i + 1), at],
    [at, ...points.slice(i + 1)],
  ]
}
