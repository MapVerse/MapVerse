import { useSyncExternalStore } from 'react'

/** What a key does on the map. */
export type ShortcutAction =
  'zoom-in' | 'zoom-out' | 'tilt' | 'measure' | 'help'

type KeyPress = Pick<
  KeyboardEvent,
  'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'target'
>

/**
 * Whether a key press goes into something being typed in, or used by a
 * control that takes keys itself, rather than to the map.
 */
export function isTyping(target: EventTarget | null): boolean {
  const element = target as Partial<Element> | null
  if (typeof element?.closest !== 'function') return false
  return !!element.closest(
    'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="search"], dialog',
  )
}

/** What a key press does on the map, if anything. */
export function shortcutFor(event: KeyPress): ShortcutAction | null {
  if (event.ctrlKey || event.metaKey || event.altKey) return null
  if (isTyping(event.target)) return null
  switch (event.key) {
    case '+':
    case '=':
      return 'zoom-in'
    case '-':
    case '_':
      return 'zoom-out'
    case '3':
      return 'tilt'
    case 'm':
    case 'M':
      return 'measure'
    case '?':
      return 'help'
    default:
      return null
  }
}

/** The keys listed in the help, in the order shown. */
export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['/'], label: 'Aramaya git' },
  { keys: ['+', '−'], label: 'Yakınlaştır, uzaklaştır' },
  { keys: ['3'], label: '2B ve 3B görünüm arasında geç' },
  { keys: ['M'], label: 'Mesafe ölç' },
  { keys: ['Backspace'], label: 'Ölçerken son noktayı geri al' },
  { keys: ['←', '↑', '→', '↓'], label: 'Haritayı kaydır (harita seçiliyken)' },
  {
    keys: ['Shift', '←', '→'],
    label: 'Haritayı döndür (harita seçiliyken)',
  },
  { keys: ['Esc'], label: 'Açık olanı kapat' },
  { keys: ['?'], label: 'Bu listeyi aç' },
]

// Whether the list of shortcuts is open, from a key or the profile menu
let helpOpen = false
const listeners = new Set<() => void>()

export function setShortcutHelpOpen(open: boolean) {
  if (open === helpOpen) return
  helpOpen = open
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useShortcutHelpOpen(): boolean {
  return useSyncExternalStore(subscribe, () => helpOpen)
}
