import { useSyncExternalStore } from 'react'

// Whether the about dialog is open. Kept out of the profile menu that
// opens it, as the menu closes once anything else is touched.
let open = false
const listeners = new Set<() => void>()

export function setAboutOpen(value: boolean): void {
  if (open === value) return
  open = value
  for (const listener of listeners) listener()
}

export function useAboutOpen(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => open,
  )
}
