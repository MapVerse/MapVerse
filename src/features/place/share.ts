import { copyText } from './clipboard.ts'
import type { Place } from './place.ts'

/** A link to the map, centred close in on a place. */
export function placeUrl({ lngLat: [lng, lat] }: Place): string {
  return `${location.origin}${location.pathname}#17/${lat.toFixed(5)}/${lng.toFixed(5)}`
}

/**
 * Shares a link to a place: through the device's own share sheet where
 * there is one, or else by copying it. Says which: null if it was
 * dismissed, 'failed' if it could not be copied.
 */
export async function sharePlace(
  place: Place,
): Promise<'shared' | 'copied' | 'failed' | null> {
  const url = placeUrl(place)
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
