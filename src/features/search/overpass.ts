import {
  currentLocale,
  t as message,
  type MessageKey,
} from '../../i18n/index.ts'
import { overpass, type OverpassElement } from '../../lib/overpass.ts'
import { categoryInfo, fallbackCategory } from '../place/categories.ts'
import { distanceMeters } from '../place/place.ts'
import type { SearchResult } from './photon.ts'

/** A kind of place the search offers as a one-tap button. */
export type QuickCategory = {
  /** Key into the category table, for the badge */
  key: string
  /** OpenStreetMap tag filters; a place matching any of them counts */
  filters: string[]
  /** Also list places without a name, such as most ATMs */
  unnamed?: boolean
}

/** A quick category's name, in the language in use. */
export const quickLabel = (category: QuickCategory) =>
  message(`quick.${category.key}` as MessageKey)

export const QUICK_CATEGORIES: QuickCategory[] = [
  {
    key: 'restaurant',
    filters: ['["amenity"="restaurant"]'],
  },
  { key: 'cafe', filters: ['["amenity"="cafe"]'] },
  {
    key: 'supermarket',
    filters: ['["shop"~"^(supermarket|convenience|grocery)$"]'],
  },
  { key: 'pharmacy', filters: ['["amenity"="pharmacy"]'] },
  {
    key: 'fuel',
    filters: ['["amenity"="fuel"]'],
    unnamed: true,
  },
  {
    key: 'atm',
    filters: ['["amenity"="atm"]', '["amenity"="bank"]["atm"="yes"]'],
    unnamed: true,
  },
  {
    key: 'hotel',
    filters: ['["tourism"~"^(hotel|hostel|guest_house|motel)$"]'],
  },
  { key: 'hospital', filters: ['["amenity"="hospital"]'] },
  { key: 'park', filters: ['["leisure"="park"]'] },
  { key: 'museum', filters: ['["tourism"="museum"]'] },
  {
    key: 'parking',
    filters: ['["amenity"="parking"]["access"!~"^(private|no)$"]'],
    unnamed: true,
  },
  {
    key: 'mosque',
    filters: ['["amenity"="place_of_worship"]["religion"="muslim"]'],
  },
]

/**
 * Overpass lists what it finds in id order, not by distance, so a cap on
 * how many it sends could cut the nearest. The first ask is close in, with
 * a cap no ordinary neighbourhood comes near; only if too few places turn
 * up does a second ask go further, in rings, each ring capped by itself so
 * the nearer one always comes whole.
 */
const NEAR_M = 1000
const RINGS_M = [3000, 10000]
const NEAR_CAP = 1000
const RING_CAP = 500
const ENOUGH = 8
const LIMIT = 20

/** The nearest places of a category around `center`, nearest first. */
export async function searchCategory(
  category: QuickCategory,
  center: [number, number],
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  let results = await search(category, center, [NEAR_M], NEAR_CAP, signal)
  if (results.length < ENOUGH) {
    results = await search(category, center, RINGS_M, RING_CAP, signal)
  }
  return results
    .map((result) => ({ result, d: distanceMeters(center, result.lngLat) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, LIMIT)
    .map(({ result }) => result)
}

async function search(
  category: QuickCategory,
  center: [number, number],
  radii: number[],
  cap: number,
  signal?: AbortSignal,
) {
  const elements = await overpass(
    buildQuery(category, center, radii, cap),
    signal,
  )
  return elements
    .map((element) => toSearchResult(element, category))
    .filter((result) => result !== null)
}

/**
 * The Overpass query for places of a category within each of `radii` in
 * turn (nearest first), each ring sent apart, up to `cap` places in it.
 */
export function buildQuery(
  category: QuickCategory,
  [lng, lat]: [number, number],
  radii: number[],
  cap: number,
): string {
  const named = category.unnamed ? '' : '["name"]'
  const within = (radius: number) => {
    const around = `(around:${radius},${lat.toFixed(5)},${lng.toFixed(5)})`
    return `(${category.filters.map((f) => `nwr${f}${named}${around};`).join('')})`
  }
  const head = '[out:json][timeout:15];'
  if (radii.length === 1)
    return `${head}${within(radii[0])};out center tags ${cap};`
  // Each ring is what lies within it and not within the one before
  const rings = radii.map((radius, i) =>
    i === 0
      ? `${within(radius)}->.a0;.a0 out center tags ${cap};`
      : `${within(radius)}->.a${i};(.a${i}; - .a${i - 1};)->.r${i};.r${i} out center tags ${cap};`,
  )
  return head + rings.join('')
}

const OSM_TYPES = { node: 'N', way: 'W', relation: 'R' } as const

export function toSearchResult(
  element: OverpassElement,
  category: QuickCategory,
): SearchResult | null {
  const lat = element.lat ?? element.center?.lat
  const lon = element.lon ?? element.center?.lon
  if (lat === undefined || lon === undefined) return null
  const t = element.tags ?? {}
  const info =
    categoryInfo(
      t.religion === 'muslim' ? 'mosque' : undefined,
      t.amenity,
      t.shop,
      t.tourism,
      t.leisure,
      category.key,
    ) ?? fallbackCategory()
  const own =
    currentLocale() === 'en' ? t['name:en'] || t.name : t['name:tr'] || t.name
  const name = own || t.brand || t.operator || info.label
  const street = [t['addr:street'], t['addr:housenumber']]
    .filter(Boolean)
    .join(' ')
  const area = t['addr:suburb'] || t['addr:district'] || t['addr:neighbourhood']
  const address = [street, area].filter(Boolean).join(', ')
  const osm = { type: OSM_TYPES[element.type], id: element.id }
  return {
    // Same form as Photon's keys, so recent searches don't list it twice
    key: `${osm.type}${osm.id}`,
    name,
    detail: address || info.label,
    category: info.label,
    categoryKey: info.key,
    // Left unknown when the tags have none, so the card looks it up
    address: address || undefined,
    lngLat: [lon, lat],
    osm,
  }
}
