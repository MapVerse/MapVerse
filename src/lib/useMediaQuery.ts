import { useCallback, useSyncExternalStore } from 'react'

/** Whether a media query matches, kept current as the window changes. */
export function useMediaQuery(query: string): boolean {
  // The same subscription from one render to the next, for the same query
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}

/** Where panels turn into sheets from the bottom, as on a phone. */
export const PHONE_QUERY = '(max-width: 640px)'

/** A pointer that can rest on things, as a mouse can and a finger can't. */
export const HOVER_QUERY = '(hover: hover) and (pointer: fine)'
