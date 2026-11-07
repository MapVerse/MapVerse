import { copyText } from './clipboard.ts'
import { placeQuery } from './link.ts'
import type { OsmRef, Place } from './place.ts'

/**
 * A link to a place: it opens the place itself (see `link.ts`), the map
 * centred close in on it. `osm` is the element found for it, where the
 * place did not come with one, as places picked on the map don't.
 */
export function placeUrl(place: Place, osm?: OsmRef): string {
  const [lng, lat] = place.lngLat
  return `${location.origin}${location.pathname}?${placeQuery(place, osm)}#17/${lat.toFixed(5)}/${lng.toFixed(5)}`
}

/**
 * Shares a link to a place: through the device's own share sheet where
 * there is one, or else by copying it. Says which: null if it was
 * dismissed, 'failed' if it could not be copied.
 */
export async function sharePlace(
  place: Place,
  osm?: OsmRef,
): Promise<'shared' | 'copied' | 'failed' | null> {
  const url = placeUrl(place, osm)
  if (navigator.share) {
    try {
      await navigator.share({ title: place.name, url })
      return 'shared'
    } catch {
      // Dismissed
      return null
    }
  }
  return (await copyText(url)) ? 'copied' : 'failed'
}
