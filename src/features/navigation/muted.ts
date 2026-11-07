import { useCallback, useState } from 'react'

const STORAGE_KEY = 'mapverse:navigation-muted'

function load(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** Whether the voice is off, remembered for next time. */
export function useMuted(): [boolean, (muted: boolean) => void] {
  const [muted, setMuted] = useState(load)
  const set = useCallback((next: boolean) => {
    setMuted(next)
    try {
      if (next) localStorage.setItem(STORAGE_KEY, '1')
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Storage can be unavailable (private mode); the choice then lasts one visit
    }
  }, [])
  return [muted, set]
}
