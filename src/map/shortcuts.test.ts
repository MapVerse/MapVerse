import { describe, expect, it } from 'vitest'
import { SHORTCUTS, isTyping, shortcutFor } from './shortcuts.ts'

/** A stand-in for an element, inside whatever the selectors name. */
const element = (inside: string[]) =>
  ({
    closest: (selectors: string) =>
      inside.some((s) => selectors.split(', ').includes(s)) ? {} : null,
  }) as unknown as Element

const press = (key: string, more: Partial<KeyboardEvent> = {}) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  target: element([]),
  ...more,
})

describe('shortcutFor', () => {
  it('knows the map keys', () => {
    expect(shortcutFor(press('+'))).toBe('zoom-in')
    expect(shortcutFor(press('='))).toBe('zoom-in')
    expect(shortcutFor(press('-'))).toBe('zoom-out')
    expect(shortcutFor(press('3'))).toBe('tilt')
    expect(shortcutFor(press('m'))).toBe('measure')
    expect(shortcutFor(press('M'))).toBe('measure')
    expect(shortcutFor(press('?'))).toBe('help')
  })

  it('leaves other keys alone', () => {
    expect(shortcutFor(press('a'))).toBeNull()
    expect(shortcutFor(press('Escape'))).toBeNull()
    // Search's own key
    expect(shortcutFor(press('/'))).toBeNull()
  })

  it("leaves the browser's and the system's combinations alone", () => {
    expect(shortcutFor(press('+', { ctrlKey: true }))).toBeNull()
    expect(shortcutFor(press('-', { metaKey: true }))).toBeNull()
    expect(shortcutFor(press('m', { altKey: true }))).toBeNull()
  })

  it('never fires while typing', () => {
    expect(shortcutFor(press('m', { target: element(['input']) }))).toBeNull()
    expect(
      shortcutFor(press('3', { target: element(['textarea']) })),
    ).toBeNull()
    expect(
      shortcutFor(press('?', { target: element(['[role="search"]']) })),
    ).toBeNull()
  })
})

describe('isTyping', () => {
  it('is false for the page itself, or nothing', () => {
    expect(isTyping(null)).toBe(false)
    expect(isTyping(element([]))).toBe(false)
  })

  it('is true in a field or an open dialog', () => {
    expect(isTyping(element(['[contenteditable="true"]']))).toBe(true)
    expect(isTyping(element(['dialog']))).toBe(true)
  })
})

describe('SHORTCUTS', () => {
  it('lists each key the map answers to', () => {
    const listed = SHORTCUTS.flatMap((s) => s.keys)
    for (const key of ['/', '+', '3', 'M', '?', 'Esc']) {
      expect(listed).toContain(key)
    }
  })
})
