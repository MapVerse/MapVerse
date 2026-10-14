import { describe, expect, it } from 'vitest'
import { nextPresence, type Present } from './presence.ts'

describe('nextPresence', () => {
  const card = (key: string, leaving = false): Present<string> => ({
    key,
    item: key,
    leaving,
  })

  it('shows what is wanted', () => {
    expect(nextPresence([], 'a', 'a')).toEqual([card('a')])
  })

  it('lets what was shown leave while its replacement comes in', () => {
    expect(nextPresence([card('a')], 'b', 'b')).toEqual([
      card('a', true),
      card('b'),
    ])
  })

  it('lets everything leave when nothing is wanted', () => {
    expect(nextPresence([card('a'), card('b', true)], null, null)).toEqual([
      card('a', true),
      card('b', true),
    ])
  })

  it('brings back what was leaving when it is wanted again', () => {
    expect(nextPresence([card('a', true)], 'a', 'a')).toEqual([card('a')])
  })

  it('keeps what is shown up to date', () => {
    const [present] = nextPresence([card('a')], 'A', 'a')
    expect(present).toEqual({ key: 'a', item: 'A', leaving: false })
  })
})
