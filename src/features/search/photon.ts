import { categoryLabel } from '../place/categories.ts'
import type { Place } from '../place/place.ts'

export type SearchResult = Place & { detail: string }

type PhotonProperties = {
  osm_type?: string
  osm_id?: number
  osm_value?: string
  type?: string
  name?: string
  street?: string
  housenumber?: string
  district?: string
  city?: string
  state?: string
  country?: string
  /** west, north, east, south */
  extent?: [number, number, number, number]
}

export type PhotonFeature = {
  geometry: { coordinates: [number, number] }
  properties: PhotonProperties
}

const API = 'https://photon.komoot.io'

export async function searchPlaces(
  query: string,
  options: {
    near?: { lng: number; lat: number }
    zoom?: number
    signal?: AbortSignal
  } = {},
): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: '6' })
  if (options.near) {
    params.set('lat', options.near.lat.toFixed(4))
    params.set('lon', options.near.lng.toFixed(4))
    // Scale the location bias to the area currently on screen
    if (options.zoom !== undefined) {
      params.set('zoom', String(Math.round(options.zoom)))
    }
  }
  const features = await photon(`/api/?${params}`, options.signal)
  return features.map(toSearchResult)
}

export async function reverseGeocode(
  [lng, lat]: [number, number],
  signal?: AbortSignal,
): Promise<string | null> {
  const params = new URLSearchParams({
    lon: lng.toFixed(6),
    lat: lat.toFixed(6),
    limit: '1',
  })
  const [feature] = await photon(`/reverse?${params}`, signal)
  return feature ? formatAddress(feature.properties) : null
}

async function photon(
  path: string,
  signal?: AbortSignal,
): Promise<PhotonFeature[]> {
  const res = await fetch(`${API}${path}`, { signal })
  if (!res.ok) throw new Error(`Photon request failed: ${res.status}`)
  return ((await res.json()) as { features: PhotonFeature[] }).features
}

export function toSearchResult({
  geometry,
  properties: p,
}: PhotonFeature): SearchResult {
  const street = streetLine(p)
  const name = p.name ?? (street || p.city || p.state || p.country || '?')
  const detail = uniqueParts(
    [street, p.district, p.city, p.state, p.country],
    name,
  ).join(', ')
  const osm =
    p.osm_type && p.osm_id ? { type: p.osm_type, id: p.osm_id } : undefined

  return {
    key: osm ? `${osm.type}${osm.id}` : geometry.coordinates.join(','),
    name,
    detail,
    category: categoryLabel(p.osm_value, p.type),
    address: formatAddress(p, name) ?? (detail || null),
    lngLat: geometry.coordinates,
    osm,
    bbox: p.extent && [p.extent[0], p.extent[3], p.extent[2], p.extent[1]],
  }
}

/** Street, district and city, leaving out the place's own name. */
export function formatAddress(
  p: PhotonProperties,
  name?: string,
): string | null {
  return (
    uniqueParts([streetLine(p), p.district, p.city], name).join(', ') || null
  )
}

function streetLine(p: PhotonProperties) {
  return [p.street, p.housenumber].filter(Boolean).join(' ')
}

function uniqueParts(parts: (string | undefined)[], exclude?: string) {
  return parts.filter(
    (part, i): part is string =>
      !!part && part !== exclude && parts.indexOf(part) === i,
  )
}
