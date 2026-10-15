import type { Place } from './place.ts'

/** A link to the map, centred close in on a place. */
export function placeUrl({ lngLat: [lng, lat] }: Place): string {
  return `${location.origin}${location.pathname}#17/${lat.toFixed(5)}/${lng.toFixed(5)}`
}

/**
 * Shares a link to a place: through the device's own share sheet where
 * there is one, or else by copying it. Says which, or null if neither.
 */
export async function sharePlace(
  place: Place,
): Promise<'shared' | 'copied' | null> {
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
  if (!navigator.clipboard) return null
  await navigator.clipboard.writeText(url)
  return 'copied'
}
