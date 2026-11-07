import { useSyncExternalStore } from 'react'

/** The languages the interface speaks. */
export type Locale = 'tr' | 'en'
/** What the user picked; `system` follows the browser's languages. */
export type LocalePreference = Locale | 'system'

// index.html reads the same key before the app loads, for the page's lang
const STORAGE_KEY = 'mapverse:language'

/** What the page says it is, for link previews and the like. */
const DESCRIPTIONS: Record<Locale, string> = {
  tr: 'Keşif ve gezi haritası: yer ve adres arama, mekân bilgileri ve yol tarifi.',
  en: 'A map to explore and travel with: places and addresses, what is there and how to get there.',
}

const listeners = new Set<() => void>()

let preference: LocalePreference = loadPreference()
let locale: Locale = resolve()

function loadPreference(): LocalePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'tr' || stored === 'en' ? stored : 'system'
  } catch {
    return 'system'
  }
}

/** The browser's languages, the one it prefers first. */
function browserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return []
  if (navigator.languages?.length) return navigator.languages
  return navigator.language ? [navigator.language] : []
}

/** Turkish for a browser that prefers Turkish, English for any other. */
export function systemLocale(languages = browserLanguages()): Locale {
  const first = languages[0]?.toLowerCase()
  if (!first) return 'tr'
  return first === 'tr' || first.startsWith('tr-') ? 'tr' : 'en'
}

function resolve(): Locale {
  return preference === 'system' ? systemLocale() : preference
}

function apply() {
  locale = resolve()
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', DESCRIPTIONS[locale])
  }
  for (const listener of listeners) listener()
}

apply()
if (typeof window !== 'undefined') {
  // The browser's languages changed: followed while on `system`
  window.addEventListener('languagechange', () => {
    if (preference === 'system') apply()
  })
  // Picked in another tab, it changes here too
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return
    const next = loadPreference()
    if (next === preference) return
    preference = next
    apply()
  })
}

/** Switches the interface's language, and remembers it. */
export function setLocalePreference(next: LocalePreference) {
  preference = next
  try {
    if (next === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts one visit
  }
  apply()
}

/** The language in use now, for code outside React. */
export const currentLocale = (): Locale => locale

/** Hears each change of language; returns how to stop. */
export function subscribeLocale(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The language in use; a component using it draws again when it changes. */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, () => locale)
}

export function useLocalePreference(): LocalePreference {
  return useSyncExternalStore(subscribeLocale, () => preference)
}

/**
 * The locale numbers, dates and times are written in: Turkey's for
 * Turkish; for English, the browser's own English if it has one (so en-US
 * keeps its 12-hour clock), else British English.
 */
export function intlLocale(of: Locale = locale): string {
  if (of === 'tr') return 'tr-TR'
  return browserLanguages().find((l) => /^en(-|$)/i.test(l)) ?? 'en-GB'
}
