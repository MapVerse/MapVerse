import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'
/** What the user picked; `system` follows the device's setting. */
export type ThemePreference = Theme | 'system'

// index.html reads the same key before the app loads, so a dark page never
// flashes light first
const STORAGE_KEY = 'mapverse:theme'
const THEME_COLORS: Record<Theme, string> = {
  light: '#ffffff',
  dark: '#1f2329',
}

const systemDark = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

let preference: ThemePreference = loadPreference()
let theme: Theme = resolve()

function loadPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

function resolve(): Theme {
  if (preference !== 'system') return preference
  return systemDark.matches ? 'dark' : 'light'
}

function apply() {
  theme = resolve()
  const root = document.documentElement
  root.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[theme])
  for (const listener of listeners) listener()
}

apply()
systemDark.addEventListener('change', apply)

export function setThemePreference(next: ThemePreference) {
  preference = next
  try {
    if (next === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts one visit
  }
  apply()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The theme in use, light or dark. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, () => theme)
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, () => preference)
}
