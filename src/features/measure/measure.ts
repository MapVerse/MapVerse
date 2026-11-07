import type { Feature, FeatureCollection, LineString } from 'geojson'
import { distanceMeters } from '../place/place.ts'

export type LngLat = [number, number]

/** The length of a path through the points, along the earth, in metres. */
export function pathLength(points: readonly LngLat[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += distanceMeters(points[i - 1], points[i])
  }
  return total
}

/** Lines longer than this are drawn as bending with the earth, in metres. */
const STRAIGHT_UP_TO_M = 50_000
const MAX_STEPS = 64

/**
 * Points along the great circle from `a` to `b`, both ends included, so a
 * long line on the map follows the shortest way round the earth, the way
 * its length is measured. `steps` is how many pieces it is cut into.
 */
export function greatCircle(a: LngLat, b: LngLat, steps: number): LngLat[] {
  const rad = Math.PI / 180
  const [lng1, lat1] = [a[0] * rad, a[1] * rad]
  const [lng2, lat2] = [b[0] * rad, b[1] * rad]
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2,
      ),
    )
  if (d === 0 || steps < 2) return [a, b]
  const out: LngLat[] = []
  for (let i = 0; i <= steps; i++) {
    const f = i / steps
    const p = Math.sin((1 - f) * d) / Math.sin(d)
    const q = Math.sin(f * d) / Math.sin(d)
    const x =
      p * Math.cos(lat1) * Math.cos(lng1) + q * Math.cos(lat2) * Math.cos(lng2)
    const y =
      p * Math.cos(lat1) * Math.sin(lng1) + q * Math.cos(lat2) * Math.sin(lng2)
    const z = p * Math.sin(lat1) + q * Math.sin(lat2)
    let lng = Math.atan2(y, x) / rad
    // Kept next to the last point, so a line over the date line doesn't
    // run the wrong way round the map
    const last = out.at(-1)
    if (last) lng += Math.round((last[0] - lng) / 360) * 360
    out.push([lng, Math.atan2(z, Math.hypot(x, y)) / rad])
  }
  return out
}

/** The path as a line to draw, long legs bending with the earth. */
export function measureLine(points: readonly LngLat[]): LngLat[] {
  const line: LngLat[] = points.slice(0, 1)
  for (let i = 1; i < points.length; i++) {
    const a = line.at(-1)!
    const b = points[i]
    const steps = Math.min(
      MAX_STEPS,
      Math.ceil(distanceMeters(a, b) / STRAIGHT_UP_TO_M),
    )
    const leg = steps > 1 ? greatCircle(a, b, steps) : [a, b]
    // Each leg starts where the last ended, so skip its first point
    line.push(...leg.slice(1))
  }
  return line
}

/** The line the measuring draws on the map, once there are two points. */
export function measureFeatures(
  points: readonly LngLat[],
): FeatureCollection<LineString> {
  const features: Feature<LineString>[] =
    points.length > 1
      ? [
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: measureLine(points) },
            properties: {},
          },
        ]
      : []
  return { type: 'FeatureCollection', features }
}
