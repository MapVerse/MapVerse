import { describe, expect, it } from 'vitest'
import { nextPresence, type Present } from './presence.ts'

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
