import { overpass, type OverpassElement } from '../../lib/overpass.ts'
import { distanceMeters, type Place } from './place.ts'

/** What OpenStreetMap says about a place, and which element it is there. */
export type PlaceDetails = {
  tags: Record<string, string>
  osm: { type: 'node' | 'way' | 'relation'; id: number }
}

const KINDS = { N: 'node', W: 'way', R: 'relation' } as const

/** How far from where it was picked a place's element may be, in metres. */
const NEAR = 60

/**
 * The Overpass query for a place's tags: by its element when it is known,
 * as for search results, or else by its name round where it is.
 */
export function detailsQuery(place: Pick<Place, 'name' | 'lngLat' | 'osm'>) {
  const head = '[out:json][timeout:10];'
  const kind = place.osm && KINDS[place.osm.type as keyof typeof KINDS]
  if (place.osm && kind)
    return `${head}${kind}(${place.osm.id});out tags center;`
  const [lng, lat] = place.lngLat
  const around = `nwr(around:${NEAR},${lat.toFixed(6)},${lng.toFixed(6)})`
  const name = JSON.stringify(place.name)
  return `${head}(${around}["name"=${name}];${around}["name:tr"=${name}];);out tags center 5;`
}

const where = (element: OverpassElement): [number, number] | undefined => {
  const lat = element.lat ?? element.center?.lat
  const lon = element.lon ?? element.center?.lon
  return lat !== undefined && lon !== undefined ? [lon, lat] : undefined
}

/** The element among those found that stands nearest the place. */
export function nearest(
  elements: OverpassElement[],
  lngLat: [number, number],
): OverpassElement | undefined {
  return elements
    .filter((element) => element.tags)
    .map((element) => {
      const at = where(element)
      return { element, far: at ? distanceMeters(at, lngLat) : Infinity }
    })
    .sort((a, b) => a.far - b.far)[0]?.element
}

const cache = new Map<string, Promise<PlaceDetails | null>>()

/** A place's details from OpenStreetMap, or null if it has none there. */
export function fetchPlaceDetails(
  place: Place,
  signal?: AbortSignal,
): Promise<PlaceDetails | null> {
  const known = cache.get(place.key)
  if (known) return known
  const found = overpass(detailsQuery(place), signal).then((elements) => {
    const element = nearest(elements, place.lngLat)
    return element?.tags
      ? { tags: element.tags, osm: { type: element.type, id: element.id } }
      : null
  })
  cache.set(place.key, found)
  // Asked again after a failure, it is tried again
  found.catch(() => cache.delete(place.key))
  return found
}

/** A link to a place's element on openstreetmap.org. */
export const osmUrl = ({ osm }: PlaceDetails) =>
  `https://www.openstreetmap.org/${osm.type}/${osm.id}`

/** A place's street address, from its `addr:*` tags. */
export function tagAddress(tags: Record<string, string>): string | undefined {
  const street = [tags['addr:street'], tags['addr:housenumber']]
    .filter(Boolean)
    .join(' ')
  if (!street) return undefined
  const area =
    tags['addr:district'] ??
    tags['addr:suburb'] ??
    tags['addr:neighbourhood'] ??
    tags['addr:quarter']
  return [street, area, tags['addr:city']].filter(Boolean).join(', ')
}

const first = (value: string | undefined) => value?.split(';')[0].trim()

/** A phone number, and the link that dials it. */
export function phone(tags: Record<string, string>) {
  const number = first(tags.phone ?? tags['contact:phone'])
  return number
    ? { number, href: `tel:${number.replace(/[^\d+]/g, '')}` }
    : undefined
}

/** A website, and how to show it: by its host, without `www.`. */
export function website(tags: Record<string, string>) {
  const raw = first(tags.website ?? tags['contact:website'] ?? tags.url)
  if (!raw) return undefined
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const { hostname, pathname } = new URL(url)
    const path = pathname === '/' ? '' : pathname.replace(/\/$/, '')
    return { url, label: hostname.replace(/^www\./, '') + path }
  } catch {
    return undefined
  }
}

export const email = (tags: Record<string, string>) =>
  first(tags.email ?? tags['contact:email'])

/** A Wikipedia article, from a tag such as `tr:Ayasofya`. */
export function wikipedia(tags: Record<string, string>) {
  const value = tags.wikipedia
  const match = value && /^([a-z-]{2,12}):(.+)$/.exec(value)
  if (!match) return undefined
  const [, lang, title] = match
  return {
    url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    label: title,
  }
}

const CUISINES: Record<string, string> = {
  turkish: 'Türk',
  regional: 'Yöresel',
  kebab: 'Kebap',
  doner: 'Döner',
  döner: 'Döner',
  pide: 'Pide',
  lahmacun: 'Lahmacun',
  kofte: 'Köfte',
  köfte: 'Köfte',
  meat: 'Et',
  steak_house: 'Et',
  grill: 'Izgara',
  chicken: 'Tavuk',
  fish: 'Balık',
  seafood: 'Deniz ürünleri',
  pizza: 'Pizza',
  burger: 'Hamburger',
  sandwich: 'Sandviç',
  breakfast: 'Kahvaltı',
  coffee_shop: 'Kahve',
  tea: 'Çay',
  dessert: 'Tatlı',
  ice_cream: 'Dondurma',
  cake: 'Pasta',
  pastry: 'Pastane',
  bakery: 'Fırın',
  italian: 'İtalyan',
  chinese: 'Çin',
  japanese: 'Japon',
  sushi: 'Suşi',
  asian: 'Asya',
  indian: 'Hint',
  mexican: 'Meksika',
  french: 'Fransız',
  greek: 'Yunan',
  international: 'Dünya mutfağı',
  vegetarian: 'Vejetaryen',
  vegan: 'Vegan',
  fast_food: 'Fast food',
  soup: 'Çorba',
  home_style: 'Ev yemekleri',
}

/** What a place cooks, in Turkish where it is a common kind. */
export function cuisine(tags: Record<string, string>): string | undefined {
  if (!tags.cuisine) return undefined
  return tags.cuisine
    .split(';')
    .map((kind) => kind.trim().toLowerCase())
    .filter(Boolean)
    .map((kind) => {
      const named = CUISINES[kind]
      if (named) return named
      const plain = kind.replace(/_/g, ' ')
      return plain[0].toLocaleUpperCase('tr') + plain.slice(1)
    })
    .filter((kind, i, all) => all.indexOf(kind) === i)
    .join(', ')
}

const yes = (value: string | undefined) => value === 'yes' || value === 'only'

/** What a place offers, as short labels, such as Wi-Fi or take-away. */
export function features(tags: Record<string, string>): string[] {
  const list: string[] = []
  const wheelchair = tags.wheelchair
  if (wheelchair === 'yes') list.push('Engelli erişimi')
  if (wheelchair === 'limited') list.push('Kısmi engelli erişimi')
  if (wheelchair === 'no') list.push('Engelli erişimi yok')
  if (['wlan', 'yes', 'wifi'].includes(tags.internet_access ?? '')) {
    list.push(tags['internet_access:fee'] === 'yes' ? 'Ücretli Wi-Fi' : 'Wi-Fi')
  }
  if (yes(tags.outdoor_seating)) list.push('Dış mekân')
  if (yes(tags.takeaway)) list.push('Paket servis')
  if (yes(tags.delivery)) list.push('Eve servis')
  if (yes(tags.drive_through)) list.push('Arabaya servis')
  if (tags.reservation === 'yes' || tags.reservation === 'required') {
    list.push('Rezervasyon')
  }
  if (yes(tags['diet:vegetarian'])) list.push('Vejetaryen seçenek')
  if (yes(tags['diet:vegan'])) list.push('Vegan seçenek')
  if (yes(tags['payment:credit_cards']) || yes(tags['payment:cards'])) {
    list.push('Kartla ödeme')
  }
  if (yes(tags.air_conditioning)) list.push('Klima')
  if (tags.smoking === 'no') list.push('Sigara içilmez')
  if (yes(tags.toilets)) list.push('Tuvalet')
  return list
}
