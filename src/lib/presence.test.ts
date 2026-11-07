import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextPresence, syncExitTimers, type Present } from './presence.ts'

describe('nextPresence', () => {
  const card = (key: string, leaving = false): Present<string> => ({
    key,
    item: key,
    leaving,
  })

  it('shows what is wanted', () => {
    expect(nextPresence([], [{ key: 'a', item: 'a' }])).toEqual([card('a')])
  })

  it('lets what was shown leave while its replacement comes in', () => {
    expect(nextPresence([card('a')], [{ key: 'b', item: 'b' }])).toEqual([
      card('a', true),
      card('b'),
    ])
  })

  it('lets everything leave when nothing is wanted', () => {
    expect(nextPresence([card('a'), card('b', true)], [])).toEqual([
      card('a', true),
      card('b', true),
    ])
  })

  it('brings back what was leaving when it is wanted again', () => {
    expect(nextPresence([card('a', true)], [{ key: 'a', item: 'a' }])).toEqual([
      card('a'),
    ])
  })

  it('keeps what is shown up to date', () => {
    const [present] = nextPresence([card('a')], [{ key: 'a', item: 'A' }])
    expect(present).toEqual({ key: 'a', item: 'A', leaving: false })
  })

  it('keeps several on screen at once, each coming and going on its own', () => {
    const shown = nextPresence(
      [card('a'), card('b')],
      [
        { key: 'b', item: 'b' },
        { key: 'c', item: 'c' },
      ],
    )
    expect(shown).toEqual([card('a', true), card('b'), card('c')])
  })
})

describe('syncExitTimers', () => {
  const card = (key: string, leaving = false): Present<string> => ({
    key,
    item: key,
    leaving,
  })
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('lets each go in its own time, whatever else comes and goes', () => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>()
    const removed: string[] = []
    const remove = (key: string) => removed.push(key)
    syncExitTimers(timers, [card('a', true), card('b')], 200, remove)
    vi.advanceTimersByTime(150)
    // Something else changes: a's time is not put off
    syncExitTimers(
      timers,
      [card('a', true), card('b', true), card('c')],
      200,
      remove,
    )
    vi.advanceTimersByTime(50)
    expect(removed).toEqual(['a'])
    vi.advanceTimersByTime(150)
    expect(removed).toEqual(['a', 'b'])
  })

  it('keeps what is brought back before its time is up', () => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>()
    const removed: string[] = []
    const remove = (key: string) => removed.push(key)
    syncExitTimers(timers, [card('a', true)], 200, remove)
    vi.advanceTimersByTime(100)
    syncExitTimers(timers, [card('a')], 200, remove)
    vi.advanceTimersByTime(500)
    expect(removed).toEqual([])
    expect(timers.size).toBe(0)
  })
})
