import { useEffect, useState } from 'react'
import {
  fetchPlaceDetails,
  knownPlaceDetails,
  type PlaceDetails,
} from './details.ts'
import type { Place } from './place.ts'

type Found = { key: string; details: PlaceDetails | null }

/**
 * What OpenStreetMap knows of a place: undefined while it is looked up,
 * null when there is nothing. Looked up once a place, so a card and the
 * panel opened from it share one answer, shown at once the second time.
 */
export function usePlaceDetails(place: Place): PlaceDetails | null | undefined {
  const [found, setFound] = useState<Found>()
  useEffect(() => {
    let current = true
    fetchPlaceDetails(place)
      .then((details) => current && setFound({ key: place.key, details }))
      .catch(() => current && setFound({ key: place.key, details: null }))
    return () => {
      current = false
    }
  }, [place])
  return found?.key === place.key ? found.details : knownPlaceDetails(place.key)
}

/** The time, kept current to the minute while it is shown. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return now
}
