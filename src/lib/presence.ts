import { useEffect, useState } from 'react'

/** Something on screen, and whether it is on its way out. */
export type Present<T> = { key: string; item: T; leaving: boolean }

/**
 * What to show once `item` (known by `key`) is the one wanted: it, kept up
 * to date and brought back if it was leaving, and all else shown so far,
 * on its way out.
 */
export function nextPresence<T>(
  shown: Present<T>[],
  item: T | null,
  key: string | null,
): Present<T>[] {
  const wanted = item !== null && key !== null
  const next = shown.map((present): Present<T> =>
    wanted && present.key === key
      ? { key, item, leaving: false }
      : { ...present, leaving: true },
  )
  if (wanted && !shown.some((present) => present.key === key)) {
    next.push({ key, item, leaving: false })
  }
  return next
}

/**
 * Keeps what was on screen there for `exitMs` once it is gone or replaced,
 * marked as leaving, so it can animate out while what replaces it
 * animates in.
 */
export function usePresence<T>(
  item: T | null,
  key: string | null,
  exitMs: number,
): Present<T>[] {
  const [state, setState] = useState(() => ({
    item,
    key,
    shown: nextPresence<T>([], item, key),
  }))
  let { shown } = state
  // Follow what is wanted at once, in this render, not a frame later
  if (state.item !== item || state.key !== key) {
    shown = nextPresence(state.shown, item, key)
    setState({ item, key, shown })
  }
  const leaving = shown.some((present) => present.leaving)
  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(
      () =>
        setState((s) => ({
          ...s,
          shown: s.shown.filter((present) => !present.leaving),
        })),
      exitMs,
    )
    return () => clearTimeout(timer)
  }, [leaving, shown, exitMs])
  return shown
}
