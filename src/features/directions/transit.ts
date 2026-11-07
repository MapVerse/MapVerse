import type { TravelMode } from './valhalla.ts'

/** How to travel: the ways Valhalla routes, or public transport, which it
 *  can't here and is opened in another app. */
export type Mode = TravelMode | 'transit'

const coords = ([lng, lat]: [number, number]) =>
  `${+lat.toFixed(6)},${+lng.toFixed(6)}`

/**
 * The same trip by public transport in Google Maps
 * (https://developers.google.com/maps/documentation/urls/get-started).
 * Without a start it leaves from wherever the person opening it is.
 */
export function googleTransitUrl(
  from: [number, number] | null,
  to: [number, number],
): string {
  const params = new URLSearchParams({ api: '1' })
  if (from) params.set('origin', coords(from))
  params.set('destination', coords(to))
  params.set('travelmode', 'transit')
  return `https://www.google.com/maps/dir/?${params}`
}
