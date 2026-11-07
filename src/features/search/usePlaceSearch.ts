import { useMap } from '@vis.gl/react-maplibre'
import { useEffect, useState } from 'react'
import { searchPlaces, type SearchResult } from './photon.ts'

export const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 300

type Status = 'idle' | 'loading' | 'done' | 'error'

const NONE: SearchResult[] = []

type Answer = { q: string; results: SearchResult[]; status: Status }

/** Debounced Photon search, biased towards the area currently on screen. */
export function usePlaceSearch(query: string): {
  results: SearchResult[]
  status: Status
} {
  const { current: map } = useMap()
  // The answer, and the query it answers: one for an older query reads as
  // loading, so nothing picks a result the box no longer asks for
  const [answer, setAnswer] = useState<Answer>()
  const q = query.trim()
  const enabled = q.length >= MIN_QUERY_LENGTH

  useEffect(() => {
    if (q.length < MIN_QUERY_LENGTH) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      searchPlaces(q, {
        near: map?.getCenter(),
        zoom: map?.getZoom(),
        signal: controller.signal,
      })
        .then((places) => setAnswer({ q, results: places, status: 'done' }))
        .catch(() => {
          if (!controller.signal.aborted) {
            setAnswer({ q, results: [], status: 'error' })
          }
        })
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [q, map])

  if (!enabled) return { results: NONE, status: 'idle' }
  return answer?.q === q
    ? { results: answer.results, status: answer.status }
    : { results: NONE, status: 'loading' }
}
