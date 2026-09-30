export type OsmRef = { type: string; id: number }

export type Place = {
  key: string
  name: string
  category?: string
  /** undefined: not known yet, so look it up; null: there is none */
  address?: string | null
  lngLat: [number, number]
  osm?: OsmRef
  /** west, south, east, north; set for areas such as cities or parks */
  bbox?: [number, number, number, number]
  /** Outline the area's boundary when selected (cities, districts…) */
  outline?: boolean
  /** Sprite image of a POI picked on the map, and its tint if single-colour */
  icon?: string
  iconColor?: string
}

const EARTH_RADIUS_M = 6_371_008.8

/** Great-circle distance between two [lng, lat] points. */
export function distanceMeters(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number],
): number {
  const rad = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(((lng2 - lng1) * rad) / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a))
}

const oneDecimal = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 })
const whole = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`
  return `${(meters < 10_000 ? oneDecimal : whole).format(meters / 1000)} km`
}
