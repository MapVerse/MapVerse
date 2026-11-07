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
    return readRecent(localStorage.getItem(STORAGE_KEY))
  } catch {
    return []
  }
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isString = (value: unknown): value is string => typeof value === 'string'

const optional = <T>(value: unknown, is: (v: unknown) => v is T) =>
  is(value) ? value : undefined

/**
 * Recent searches as stored, keeping only entries that can still be shown
 * and opened: an older version, or another tab, may have left anything.
 */
export function readRecent(stored: string | null): SearchResult[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(stored ?? '[]')
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  return parsed.flatMap((entry: unknown): SearchResult[] => {
    if (!entry || typeof entry !== 'object') return []
    const r = entry as Record<string, unknown>
    const { lngLat, bbox, osm } = r
    if (!isString(r.key) || !isString(r.name)) return []
    if (
      !Array.isArray(lngLat) ||
      lngLat.length !== 2 ||
      !lngLat.every(isNumber)
    ) {
      return []
    }
    const goodBbox =
      Array.isArray(bbox) && bbox.length === 4 && bbox.every(isNumber)
        ? (bbox as [number, number, number, number])
        : undefined
    const goodOsm =
      osm &&
      typeof osm === 'object' &&
      isString((osm as { type?: unknown }).type) &&
      isNumber((osm as { id?: unknown }).id)
        ? (osm as { type: string; id: number })
        : undefined
    return [
      {
        key: r.key,
        name: r.name,
        detail: optional(r.detail, isString) ?? '',
        category: optional(r.category, isString),
        categoryKey: optional(r.categoryKey, isString),
        address: r.address === null ? null : optional(r.address, isString),
        lngLat: [lngLat[0], lngLat[1]],
        osm: goodOsm,
        bbox: goodBbox,
        outline: r.outline === true && !!goodOsm,
        icon: optional(r.icon, isString),
        iconColor: optional(r.iconColor, isString),
      },
    ]
  })
}
