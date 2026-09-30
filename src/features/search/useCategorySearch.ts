import { useEffect, useState } from 'react'
import type { SearchResult } from './photon.ts'
import { searchCategory, type QuickCategory } from './overpass.ts'

/** A category search, around the map centre at the time it was asked. */
export type CategorySearch = {
  category: QuickCategory
  center: [number, number]
}

export type CategoryResults = {
  results: SearchResult[]
  status: 'idle' | 'loading' | 'done' | 'error'
}

const IDLE: CategoryResults = { results: [], status: 'idle' }
const LOADING: CategoryResults = { results: [], status: 'loading' }

/** Nearby places for a category search; idle when there is none. */
export function useCategorySearch(
  search: CategorySearch | null,
): CategoryResults {
  // The answer, and the search it answers, so a new search reads as loading
  const [answer, setAnswer] = useState<{
    search: CategorySearch
    value: CategoryResults
  }>()

  useEffect(() => {
    if (!search) return
    const controller = new AbortController()
    searchCategory(search.category, search.center, controller.signal)
      .then((results) =>
        setAnswer({ search, value: { results, status: 'done' } }),
      )
      .catch(() => {
        if (controller.signal.aborted) return
        setAnswer({ search, value: { results: [], status: 'error' } })
      })
    return () => controller.abort()
  }, [search])

  if (!search) return IDLE
  return answer?.search === search ? answer.value : LOADING
}
