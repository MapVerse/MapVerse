import { useEffect, useState } from 'react'
import { reverseGeocode } from '../search/photon.ts'
import type { Place } from './place.ts'

/**
 * A place's address: the one it came with, or else one looked up for where
 * it is. Undefined while it is looked up, null when there is none.
 */
export function useAddress(place: Place): string | null | undefined {
  const needsLookup = place.address === undefined
  const [lookedUp, setLookedUp] = useState<string | null>()
  useEffect(() => {
    if (!needsLookup) return
    const controller = new AbortController()
    reverseGeocode(place.lngLat, controller.signal)
      .then(setLookedUp)
      .catch(() => {
        if (!controller.signal.aborted) setLookedUp(null)
      })
    return () => controller.abort()
  }, [needsLookup, place.lngLat])
  return needsLookup ? lookedUp : place.address
}
