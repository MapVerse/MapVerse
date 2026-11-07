import { t } from '../../i18n/index.ts'
import { formatTime } from '../../i18n/format.ts'
import type { StrokeName } from '../../icons/strokes.ts'
import type { Route } from './valhalla.ts'

/** Decodes a Valhalla (precision 6) encoded polyline into [lng, lat] pairs. */
export function decodePolyline6(encoded: string): [number, number][] {
  const points: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0
  while (index < encoded.length) {
    const deltas = [0, 0]
    for (let axis = 0; axis < 2; axis++) {
      let result = 0
      let shift = 0
      let byte: number
      do {
        byte = encoded.charCodeAt(index++) - 63
        result |= (byte & 0x1f) << shift
        shift += 5
      } while (byte >= 0x20)
      deltas[axis] = result & 1 ? ~(result >> 1) : result >> 1
    }
    lat += deltas[0]
    lng += deltas[1]
    points.push([lng / 1e6, lat / 1e6])
  }
  return points
}

/**
 * Clock time after `seconds` from `now`, like 10:04, marked with the days
 * on when it falls on a later day, like 00:47 (+1 gün); a 12-hour clock
 * where the language in use keeps one.
 */
export function formatArrival(seconds: number, now = new Date()): string {
  const at = new Date(now.getTime() + seconds * 1000)
  const time = formatTime(at)
  // Calendar days apart (rounded, as a day may be an hour short or long)
  const day = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((day(at) - day(now)) / 86_400_000)
  return days > 0 ? t('time.laterDay', { time, days }) : time
}

/** The south-west and north-east corners round a line's points. */
export function shapeBounds(
  shape: [number, number][],
): [[number, number], [number, number]] | null {
  if (!shape.length) return null
  let [west, south] = shape[0]
  let [east, north] = shape[0]
  // A loop, not Math.min(...), which runs out of stack on a long route
  for (const [lng, lat] of shape) {
    if (lng < west) west = lng
    if (lng > east) east = lng
    if (lat < south) south = lat
    if (lat > north) north = lat
  }
  return [
    [west, south],
    [east, north],
  ]
}

export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return t('duration.minutes', { m: minutes })
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest
    ? t('duration.hoursMinutes', { h: hours, m: rest })
    : t('duration.hours', { h: hours })
}

// Valhalla maneuver types: https://valhalla.github.io/valhalla/api/turn-by-turn/api-reference/
const MANEUVER_ICONS: Partial<Record<number, StrokeName>> = {
  1: 'start',
  2: 'start',
  3: 'start',
  4: 'flag',
  5: 'flag',
  6: 'flag',
  9: 'slightRight',
  10: 'right',
  11: 'sharpRight',
  12: 'uturnRight',
  13: 'uturnLeft',
  14: 'sharpLeft',
  15: 'left',
  16: 'slightLeft',
  18: 'slightRight',
  19: 'slightLeft',
  20: 'slightRight',
  21: 'slightLeft',
  23: 'slightRight',
  24: 'slightLeft',
  26: 'roundabout',
  27: 'roundabout',
  28: 'ferry',
  29: 'ferry',
}

export function maneuverIcon(type: number): StrokeName {
  return MANEUVER_ICONS[type] ?? 'straight'
}

/** The street a route runs along furthest, to tell it from the others. */
export function routeVia(route: Route): string | undefined {
  const along = new Map<string, number>()
  for (const { streets, meters } of route.maneuvers) {
    for (const street of streets) {
      along.set(street, (along.get(street) ?? 0) + meters)
    }
  }
  return [...along].sort((a, b) => b[1] - a[1])[0]?.[0]
}

/**
 * What sets each route apart: the first, Valhalla's pick, is the one
 * suggested; another that is clearly shorter says so.
 */
export function routeLabels(routes: Route[]): (string | undefined)[] {
  if (routes.length < 2) return routes.map(() => undefined)
  const shortest = Math.min(...routes.map((r) => r.meters))
  return routes.map((route, i) =>
    i === 0
      ? t('directions.suggested')
      : route.meters === shortest && route.meters < routes[0].meters * 0.95
        ? t('directions.shorter')
        : undefined,
  )
}
