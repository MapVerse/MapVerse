export type Place = {
  id: string
  name: string
  detail: string
  lngLat: [number, number]
  /** west, south, east, north */
  bbox?: [number, number, number, number]
}

export type PhotonFeature = {
  geometry: { coordinates: [number, number] }
  properties: {
    osm_type?: string
    osm_id?: number
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
}

const ENDPOINT = 'https://photon.komoot.io/api/'

export async function searchPlaces(
  query: string,
  options: { near?: { lng: number; lat: number }; signal?: AbortSignal } = {},
): Promise<Place[]> {
  const params = new URLSearchParams({ q: query, limit: '6' })
  if (options.near) {
    params.set('lat', options.near.lat.toFixed(4))
    params.set('lon', options.near.lng.toFixed(4))
  }
  const res = await fetch(`${ENDPOINT}?${params}`, { signal: options.signal })
  if (!res.ok) throw new Error(`Photon request failed: ${res.status}`)
  const data = (await res.json()) as { features: PhotonFeature[] }
  return data.features.map(toPlace)
}

export function toPlace({ geometry, properties: p }: PhotonFeature): Place {
  const street = [p.street, p.housenumber].filter(Boolean).join(' ')
  const name = p.name ?? (street || p.city || p.state || p.country || '?')
  const detail = [street, p.district, p.city, p.state, p.country]
    .filter(
      (part, i, parts) => part && part !== name && parts.indexOf(part) === i,
    )
    .join(', ')
  return {
    id:
      p.osm_type && p.osm_id
        ? `${p.osm_type}${p.osm_id}`
        : geometry.coordinates.join(','),
    name,
    detail,
    lngLat: geometry.coordinates,
    bbox: p.extent && [p.extent[0], p.extent[3], p.extent[2], p.extent[1]],
  }
}
