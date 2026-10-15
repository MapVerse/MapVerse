import { useEffect, useState } from 'react'

/** Something on screen, and whether it is on its way out. */
export type Present<T> = { key: string; item: T; leaving: boolean }

/** Something to be shown, known by its key. */
export type Wanted<T> = { key: string; item: T }

/**
 * What to show once `wanted` is what is wanted: it, kept up to date and
 * brought back if it was leaving, and all else shown so far, on its way
 * out.
 */
export function nextPresence<T>(
  shown: Present<T>[],
  wanted: Wanted<T>[],
): Present<T>[] {
  const items = new Map(wanted.map(({ key, item }) => [key, item]))
  const next = shown.map((present): Present<T> =>
    items.has(present.key)
      ? { key: present.key, item: items.get(present.key)!, leaving: false }
      : present.leaving
        ? present
        : { ...present, leaving: true },
  )
  for (const { key, item } of wanted) {
    if (!shown.some((present) => present.key === key)) {
      next.push({ key, item, leaving: false })
    }
  }
  return next
}

const same = <T>(a: Wanted<T>[], b: Wanted<T>[]) =>
  a.length === b.length &&
  a.every((w, i) => w.key === b[i].key && w.item === b[i].item)

/**
 * Keeps what was on screen there for `exitMs` once it is gone or replaced,
 * marked as leaving, so it can animate out while what replaces it
 * animates in.
 */
export function usePresences<T>(
  wanted: Wanted<T>[],
  exitMs: number,
): Present<T>[] {
  const [state, setState] = useState(() => ({
    wanted,
    shown: nextPresence<T>([], wanted),
  }))
  let { shown } = state
  // Follow what is wanted at once, in this render, not a frame later
  if (!same(state.wanted, wanted)) {
    shown = nextPresence(state.shown, wanted)
    setState({ wanted, shown })
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

/** `usePresences` for one thing at a time, or nothing. */
export function usePresence<T>(
  item: T | null,
  key: string | null,
  exitMs: number,
): Present<T>[] {
  return usePresences(
    item !== null && key !== null ? [{ key, item }] : [],
    exitMs,
  )
}
