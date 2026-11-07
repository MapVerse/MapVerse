import { useEffect, useState } from 'react'
import {
  fetchPlaceDetails,
  knownPlaceDetails,
  type PlaceDetails,
} from './details.ts'
import { wallClock, type HolidayCheck, type WallClock } from './openingHours.ts'
import type { Place } from './place.ts'
import { holidaysAt, timeZoneAt } from './timeZone.ts'

type Found = {
  key: string
  /** Which try this answers, so a retry reads as looking up again */
  attempt: number
  details: PlaceDetails | null
  failed: boolean
}

export type PlaceDetailsState = {
  /** undefined while it is looked up, null when there is nothing (or it failed) */
  details: PlaceDetails | null | undefined
  /** The lookup failed, as opposed to finding nothing */
  failed: boolean
  /** Looks it up again, after a failure */
  retry: () => void
}

/**
 * What OpenStreetMap knows of a place. Looked up once a place, so a card
 * and the panel opened from it share one answer, shown at once the second
 * time; a lookup that fails says so, and can be tried again.
 */
export function usePlaceDetails(place: Place): PlaceDetailsState {
  const [found, setFound] = useState<Found>()
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let current = true
    fetchPlaceDetails(place)
      .then(
        (details) =>
          current &&
          setFound({ key: place.key, attempt, details, failed: false }),
      )
      .catch(
        () =>
          current &&
          setFound({ key: place.key, attempt, details: null, failed: true }),
      )
    return () => {
      current = false
    }
  }, [place, attempt])
  const retry = () => setAttempt((a) => a + 1)
  if (found?.key === place.key && found.attempt === attempt) {
    return { details: found.details, failed: found.failed, retry }
  }
  return { details: knownPlaceDetails(place.key), failed: false, retry }
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

/**
 * The time where a place is, as its clocks show it (see `timeZoneAt`),
 * kept current; and how to tell its public holidays, where they are known.
 */
export function usePlaceTime([lng, lat]: [number, number]): {
  wall: WallClock
  isHoliday?: HolidayCheck
} {
  const now = useNow()
  return {
    wall: wallClock(now, timeZoneAt(lng, lat)),
    isHoliday: holidaysAt(lng, lat),
  }
}
