import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'mapverse:terrain'

let enabled = load()
const listeners = new Set<() => void>()

function load() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

/** Turns 3D terrain (mountains and relief) on or off, and remembers it. */
export function setTerrainEnabled(next: boolean) {
  enabled = next
  try {
    if (next) localStorage.setItem(STORAGE_KEY, 'on')
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts one visit
  }
  for (const listener of listeners) listener()
}

// Turned on or off in another tab, it changes here too
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return
    const next = load()
    if (next === enabled) return
    enabled = next
    for (const listener of listeners) listener()
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTerrainEnabled(): boolean {
  return useSyncExternalStore(subscribe, () => enabled)
}
