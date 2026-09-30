import { overpass, type OverpassElement } from '../../lib/overpass.ts'
import { FALLBACK_CATEGORY, categoryInfo } from '../place/categories.ts'
import { distanceMeters } from '../place/place.ts'
import type { SearchResult } from './photon.ts'

/** A kind of place the search offers as a one-tap button. */
export type QuickCategory = {
  /** Key into the category table, for the badge */
  key: string
  label: string
  /** OpenStreetMap tag filters; a place matching any of them counts */
  filters: string[]
  /** Also list places without a name, such as most ATMs */
  unnamed?: boolean
}

export const QUICK_CATEGORIES: QuickCategory[] = [
  {
    key: 'restaurant',
    label: 'Restoran',
    filters: ['["amenity"="restaurant"]'],
  },
  { key: 'cafe', label: 'Kafe', filters: ['["amenity"="cafe"]'] },
  {
    key: 'supermarket',
    label: 'Market',
    filters: ['["shop"~"^(supermarket|convenience|grocery)$"]'],
  },
  { key: 'pharmacy', label: 'Eczane', filters: ['["amenity"="pharmacy"]'] },
  {
    key: 'fuel',
    label: 'Akaryakıt',
    filters: ['["amenity"="fuel"]'],
    unnamed: true,
  },
  {
    key: 'atm',
    label: 'ATM',
    filters: ['["amenity"="atm"]', '["amenity"="bank"]["atm"="yes"]'],
    unnamed: true,
  },
  {
    key: 'hotel',
    label: 'Otel',
    filters: ['["tourism"~"^(hotel|hostel|guest_house|motel)$"]'],
  },
  { key: 'hospital', label: 'Hastane', filters: ['["amenity"="hospital"]'] },
  { key: 'park', label: 'Park', filters: ['["leisure"="park"]'] },
  { key: 'museum', label: 'Müze', filters: ['["tourism"="museum"]'] },
  {
    key: 'parking',
    label: 'Otopark',
    filters: ['["amenity"="parking"]["access"!~"^(private|no)$"]'],
    unnamed: true,
  },
  {
    key: 'mosque',
    label: 'Cami',
    filters: ['["amenity"="place_of_worship"]["religion"="muslim"]'],
  },
]

/** Search this far out, widening only when too few places turn up. */
const RADII_M = [1000, 3000, 10000]
const ENOUGH = 8
const LIMIT = 20

/** The nearest places of a category around `center`, nearest first. */
export async function searchCategory(
  category: QuickCategory,
  center: [number, number],
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  let results: SearchResult[] = []
  for (const radius of RADII_M) {
    const elements = await overpass(
      buildQuery(category, center, radius),
      signal,
    )
    results = elements
      .map((element) => toSearchResult(element, category))
      .filter((result) => result !== null)
    if (results.length >= ENOUGH) break
  }
  return results
    .map((result) => ({ result, d: distanceMeters(center, result.lngLat) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, LIMIT)
    .map(({ result }) => result)
}

export function buildQuery(
  category: QuickCategory,
  [lng, lat]: [number, number],
  radius: number,
): string {
  const around = `(around:${radius},${lat.toFixed(5)},${lng.toFixed(5)})`
  const named = category.unnamed ? '' : '["name"]'
  const parts = category.filters.map((f) => `nwr${f}${named}${around};`)
  return `[out:json][timeout:15];(${parts.join('')});out center tags 200;`
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
    ) ?? FALLBACK_CATEGORY
  const name = t['name:tr'] || t.name || t.brand || t.operator || info.label
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
