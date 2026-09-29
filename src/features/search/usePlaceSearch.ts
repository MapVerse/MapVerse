import { useMap } from '@vis.gl/react-maplibre'
import { useEffect, useState } from 'react'
import { searchPlaces, type SearchResult } from './photon.ts'

export const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 300

type Status = 'idle' | 'loading' | 'done' | 'error'

/** Debounced Photon search, biased towards the area currently on screen. */
export function usePlaceSearch(query: string) {
  const { current: map } = useMap()
  const [results, setResults] = useState<SearchResult[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const q = query.trim()
  const enabled = q.length >= MIN_QUERY_LENGTH

  useEffect(() => {
    if (q.length < MIN_QUERY_LENGTH) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setStatus('loading')
      searchPlaces(q, {
        near: map?.getCenter(),
        zoom: map?.getZoom(),
        signal: controller.signal,
      })
        .then((places) => {
          setResults(places)
          setStatus('done')
        })
        .catch(() => {
          if (!controller.signal.aborted) setStatus('error')
        })
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [q, map])

  return enabled
    ? { results, status }
    : { results: [], status: 'idle' as Status }
}
