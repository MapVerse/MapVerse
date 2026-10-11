import { useSyncExternalStore } from 'react'

/** How the map itself is drawn; the interface keeps the light or dark theme. */
export type MapDesign = 'standard' | 'vintage' | 'san-andreas'

export const MAP_DESIGNS: readonly MapDesign[] = [
  'standard',
  'vintage',
  'san-andreas',
]

const STORAGE_KEY = 'mapverse:map-design'

let design = load()
const listeners = new Set<() => void>()

function load(): MapDesign {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return MAP_DESIGNS.find((d) => d === stored) ?? 'standard'
  } catch {
    return 'standard'
  }
}

/** Switches the map's design, and remembers it. */
export function setMapDesign(next: MapDesign) {
  design = next
  try {
    if (next === 'standard') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts one visit
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useMapDesign(): MapDesign {
  return useSyncExternalStore(subscribe, () => design)
}
