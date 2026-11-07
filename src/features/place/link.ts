import { t } from '../../i18n/index.ts'
import { categoryInfo } from './categories.ts'
import type { OsmRef, Place } from './place.ts'

/** The query parameter a shared place travels in. */
export const PLACE_PARAM = 'place'

/** OpenStreetMap element types, as the letters keys and links use. */
const TYPES = new Set(['N', 'W', 'R'])
const LONG_TYPES: Record<string, string> = {
  node: 'N',
  way: 'W',
  relation: 'R',
}

/** Whether a place is a bare point clicked on the map, with no place there. */
export const isPointKey = (key: string) => key.startsWith('point:')

/** The key a point on the map goes by. */
export const pointKey = (lngLat: [number, number]) => `point:${lngLat.join()}`

/** An element's type as one capital letter (N, W, R), if it is one. */
export function osmLetter(type: string): string | undefined {
  const letter = LONG_TYPES[type] ?? type.toUpperCase()
  return TYPES.has(letter) ? letter : undefined
}

// Commas, colons and slashes may stand in a query as they are, which keeps
// the link readable
const encode = (text: string) =>
  encodeURIComponent(text).replace(/%(2C|3A|2F)/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  )

/**
 * A place as the value of `?place=`: where it is (lat,lng to 5 decimals,
 * about a metre), then which element it is in OpenStreetMap (n123, w45,
 * r6) and its category key, then its name, everything after the fourth
 * comma, so a name may hold commas of its own. Fields left empty at the
 * end are dropped; a bare point is only where it is.
 */
export function encodePlace(place: Place, osm: OsmRef | undefined = place.osm) {
  const [lng, lat] = place.lngLat
  const where = [lat.toFixed(5), lng.toFixed(5)]
  if (isPointKey(place.key)) return where.join(',')
  const letter = osm && osmLetter(osm.type)
  const ref =
    letter && Number.isInteger(osm.id) ? `${letter.toLowerCase()}${osm.id}` : ''
  const category = categoryInfo(place.categoryKey) ? place.categoryKey! : ''
  return [...where, ref, category, place.name].join(',')
}

/** The `?place=` value as a query string fragment, encoded for a link. */
export const placeQuery = (place: Place, osm?: OsmRef) =>
  `${PLACE_PARAM}=${encode(encodePlace(place, osm ?? place.osm))}`

/** A place sent in a link, and whether it is a bare point. */
export type SharedPlace = { place: Place; point: boolean }

const NUMBER = /^-?\d{1,3}(\.\d+)?$/

/**
 * The place a `?place=` value stands for, or null if it is none: anything
 * may come in a link, so only what makes sense is taken.
 */
export function decodePlace(value: string | null): SharedPlace | null {
  if (!value) return null
  const [latText, lngText, ref = '', category = '', ...rest] = value.split(',')
  if (!NUMBER.test(latText ?? '') || !NUMBER.test(lngText ?? '')) return null
  const [lat, lng] = [Number(latText), Number(lngText)]
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  const lngLat: [number, number] = [lng, lat]
  const name = rest.join(',').trim().slice(0, 200)
  const match = /^([nwr])(\d{1,15})$/i.exec(ref.trim())
  const osm = match
    ? { type: match[1].toUpperCase(), id: Number(match[2]) }
    : undefined
  if (!osm && !name) {
    return {
      place: { key: pointKey(lngLat), name: t('common.selectedPoint'), lngLat },
      point: true,
    }
  }
  const info = categoryInfo(category.trim() || undefined)
  return {
    place: {
      key: osm ? `${osm.type}${osm.id}` : `shared:${lngLat.join()}:${name}`,
      name: name || info?.label || t('common.place'),
      category: info?.label,
      categoryKey: info?.key,
      lngLat,
      osm,
    },
    point: false,
  }
}
