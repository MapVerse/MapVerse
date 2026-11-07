import { useSyncExternalStore } from 'react'

/**
 * An on/off setting kept in localStorage under `key`, followed by the
 * components that read it and by other tabs of the same browser.
 */
export function storedFlag(key: string) {
  const listeners = new Set<() => void>()
  const load = () => {
    try {
      return localStorage.getItem(key) === 'on'
    } catch {
      return false
    }
  }
  let enabled = load()
  const notify = () => {
    for (const listener of listeners) listener()
  }

  // Turned on or off in another tab, it changes here too
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== key && event.key !== null) return
      const next = load()
      if (next === enabled) return
      enabled = next
      notify()
    })
  }

  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return {
    get: () => enabled,
    set(next: boolean) {
      enabled = next
      try {
        if (next) localStorage.setItem(key, 'on')
        else localStorage.removeItem(key)
      } catch {
        // Storage can be unavailable (private mode); the choice then lasts one visit
      }
      notify()
    },
    use: () => useSyncExternalStore(subscribe, () => enabled),
  }
}
