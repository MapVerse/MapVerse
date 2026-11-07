import { t } from '../../i18n/index.ts'
import { formatNumber } from '../../i18n/format.ts'
import { categoryInfo } from './categories.ts'

export type OsmRef = { type: string; id: number }

export type Place = {
  key: string
  name: string
  category?: string
  /** Key into the category table, for the badge glyph and colour */
  categoryKey?: string
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

const ONE_DECIMAL = { minimumFractionDigits: 1, maximumFractionDigits: 1 }
const WHOLE = { maximumFractionDigits: 0 }

/** A distance as the language in use writes it: 450 m, 1,2 km or 1.2 km. */
export function formatDistance(meters: number): string {
  // Rounded to tens first, so 995 m and up read as a kilometre
  const tens = Math.max(10, Math.round(meters / 10) * 10)
  if (tens < 1000) return t('unit.meters', { n: tens })
  const km = formatNumber(meters / 1000, meters < 9_950 ? ONE_DECIMAL : WHOLE)
  return t('unit.kilometers', { n: km })
}

/** A place's kind, in the language in use where it is a kind we know. */
export function placeCategory(
  place: Pick<Place, 'category' | 'categoryKey'>,
): string | undefined {
  return categoryInfo(place.categoryKey)?.label ?? place.category
}
