import { useEffect, useState } from 'react'
import { reverseGeocode } from '../search/photon.ts'
import type { Place } from './place.ts'

// Addresses already looked up, by where, to show at once when asked again
const known = new Map<string, string | null>()

/**
 * A place's address: the one it came with, or else one looked up for where
 * it is. Undefined while it is looked up, null when there is none.
 */
export function useAddress(place: Place): string | null | undefined {
  const needsLookup = place.address === undefined
  const at = place.lngLat.join()
  const [lookedUp, setLookedUp] = useState<{
    at: string
    address: string | null
  }>()
  useEffect(() => {
    if (!needsLookup || known.has(at)) return
    const controller = new AbortController()
    const settle = (address: string | null) => {
      known.set(at, address)
      setLookedUp({ at, address })
    }
    reverseGeocode(place.lngLat, controller.signal)
      .then(settle)
      .catch(() => {
        if (!controller.signal.aborted) setLookedUp({ at, address: null })
      })
    return () => controller.abort()
  }, [needsLookup, at, place.lngLat])
  if (!needsLookup) return place.address
  return lookedUp?.at === at ? lookedUp.address : known.get(at)
}
