import type { StrokeName } from '../../icons/strokes.ts'

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

export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} dk`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} sa ${rest} dk` : `${hours} sa`
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
