import { useSyncExternalStore } from 'react'
import type { Place } from '../place/place.ts'
import {
  LABEL_MAX,
  mergeFavorites,
  readFavorites,
  sortFavorites,
  toFavorite,
  withFavorite,
  type Favorite,
  type FavoriteKind,
} from './favorites.ts'

const STORAGE_KEY = 'mapverse:favorites'

// Shared by the place panel, the search box, the map and the profile menu
let favorites: Favorite[] = load()
const listeners = new Set<() => void>()

function load(): Favorite[] {
  try {
    return readFavorites(localStorage.getItem(STORAGE_KEY))
  } catch {
    return []
  }
}

function notify() {
  for (const listener of listeners) listener()
}

function save(next: Favorite[]) {
  favorites = sortFavorites(next)
  try {
    if (favorites.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Storage can be unavailable (private mode) or full; they then last one visit
  }
  notify()
}

// Saved in another tab, it shows here too
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY && event.key !== null) return
  favorites = load()
  notify()
})

/** Saves a place as home, work or starred, with a name of one's own. */
export function saveFavorite(
  place: Place,
  kind: FavoriteKind,
  options: { label?: string; point?: boolean } = {},
) {
  save(withFavorite(favorites, toFavorite(place, kind, options)))
}

/** Gives a saved place a name of one's own, or takes it away with ''. */
export function renameFavorite(key: string, label: string) {
  save(
    favorites.map((f) => {
      if (f.key !== key) return f
      const trimmed = label.trim().slice(0, LABEL_MAX)
      const next = { ...f }
      if (trimmed && trimmed !== f.name) next.label = trimmed
      else delete next.label
      return next
    }),
  )
}

export function removeFavorite(key: string) {
  save(favorites.filter((f) => f.key !== key))
}

/** Adds places from a file, leaving out those saved already; says how many. */
export function importFavorites(incoming: Favorite[]): number {
  const { list, added } = mergeFavorites(favorites, incoming)
  if (added) save(list)
  return added
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Every saved place: home, work, then the starred, the latest first. */
export function useFavorites(): Favorite[] {
  return useSyncExternalStore(subscribe, () => favorites)
}

/** How a place is saved, if it is. */
export function useFavorite(place: Place): Favorite | undefined {
  const list = useFavorites()
  return list.find(
    (f) =>
      f.key === place.key ||
      (!!place.osm &&
        !!f.osm &&
        f.osm.type === place.osm.type &&
        f.osm.id === place.osm.id),
  )
}
