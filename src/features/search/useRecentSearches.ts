import { useSyncExternalStore } from 'react'
import type { SearchResult } from './photon.ts'

const STORAGE_KEY = 'mapverse:recent-searches'
const LIMIT = 5

// Shared by the search box and the settings panel, which can clear it
let recent: SearchResult[] = load()
const listeners = new Set<() => void>()

function save(next: SearchResult[]) {
  recent = next
  try {
    if (next.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable (private mode); recents then last one visit
  }
  for (const listener of listeners) listener()
}

export function addRecentSearch(result: SearchResult) {
  save([result, ...recent.filter((r) => r.key !== result.key)].slice(0, LIMIT))
}

export function clearRecentSearches() {
  save([])
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useRecentSearches(): SearchResult[] {
  return useSyncExternalStore(subscribe, () => recent)
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
