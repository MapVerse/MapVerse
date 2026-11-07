import { AVOID_NOTHING, type Avoid } from './valhalla.ts'

const STORAGE_KEY = 'mapverse:directions-avoid'

/** Roads to keep off as stored, or none for anything else. */
export function parseAvoid(raw: string | null): Avoid {
  let stored: unknown
  try {
    stored = JSON.parse(raw ?? 'null')
  } catch {
    return AVOID_NOTHING
  }
  if (!stored || typeof stored !== 'object') return AVOID_NOTHING
  const flag = (key: keyof Avoid) =>
    (stored as Record<string, unknown>)[key] === true
  return {
    tolls: flag('tolls'),
    highways: flag('highways'),
    ferries: flag('ferries'),
  }
}

/** The roads to keep off picked last time. */
export function loadAvoid(): Avoid {
  try {
    return parseAvoid(localStorage.getItem(STORAGE_KEY))
  } catch {
    return AVOID_NOTHING
  }
}

/** Remembers the roads to keep off for next time. */
export function saveAvoid(avoid: Avoid) {
  try {
    if (avoid.tolls || avoid.highways || avoid.ferries) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(avoid))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts one visit
  }
}
