// The servers the app asks, set at build time through VITE_* variables;
// without them, the public servers it was made with. Those are run by
// volunteers for light use, so point these at your own for anything more.

/** A URL without the slash it may end with, so paths can be added to it. */
export function baseUrl(value: string | undefined, fallback: string): string {
  const url = value?.trim() || fallback
  return url.replace(/\/+$/, '')
}

/** A comma-separated list of URLs, or the fallback if it names none. */
export function urlList(
  value: string | undefined,
  fallback: string[],
): string[] {
  const urls = (value ?? '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
  return urls.length ? urls : fallback
}

const env = import.meta.env

/** Place search and reverse geocoding */
export const PHOTON_URL = baseUrl(
  env.VITE_PHOTON_URL,
  'https://photon.komoot.io',
)

/** Area outlines */
export const NOMINATIM_URL = baseUrl(
  env.VITE_NOMINATIM_URL,
  'https://nominatim.openstreetmap.org',
)

/** Places' details and nearby places, tried in turn */
export const OVERPASS_URLS = urlList(env.VITE_OVERPASS_URLS, [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
])

/** Routes */
export const VALHALLA_URL = baseUrl(
  env.VITE_VALHALLA_URL,
  'https://valhalla1.openstreetmap.de',
)
