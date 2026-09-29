import { useState } from 'react'
import type { SearchResult } from './photon.ts'

const STORAGE_KEY = 'mapverse:recent-searches'
const LIMIT = 5

export function useRecentSearches() {
  const [recent, setRecent] = useState<SearchResult[]>(load)

  function addRecent(result: SearchResult) {
    const next = [result, ...recent.filter((r) => r.key !== result.key)].slice(
      0,
      LIMIT,
    )
    setRecent(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Storage can be unavailable (private mode); recents then last one visit
    }
  }

  return { recent, addRecent }
}

function load(): SearchResult[] {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    )
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}
