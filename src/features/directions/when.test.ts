import { describe, expect, it } from 'vitest'
import {
  dayLabel,
  formatClock,
  localValue,
  parseLocal,
  routeTimes,
  whenLabel,
} from './when.ts'

const now = new Date(2026, 10, 7, 21, 40)

describe('localValue and parseLocal', () => {
  it('round-trip a local clock time', () => {
    expect(localValue(now)).toBe('2026-11-07T21:40')
    expect(parseLocal('2026-11-07T21:40')).toEqual(now)
  })

  it("turn down times that don't exist", () => {
    expect(parseLocal('2026-02-30T09:00')).toBeNull()
    expect(parseLocal('2026-11-07T25:00')).toBeNull()
    expect(parseLocal('yarın')).toBeNull()
  })
})

describe('formatClock', () => {
  it('marks a time on another day', () => {
    expect(formatClock(new Date(2026, 10, 7, 9, 5), now)).toBe('09:05')
    expect(formatClock(new Date(2026, 10, 8, 0, 16), now)).toBe(
      '00:16 (+1 gün)',
    )
    expect(formatClock(new Date(2026, 10, 6, 23, 50), now)).toBe(
      '23:50 (−1 gün)',
    )
  })
})

describe('routeTimes', () => {
  const route = { seconds: 30 * 60 }

  it('arrives after the route from now, or from leaving', () => {
    expect(routeTimes(route, { kind: 'now' }, now)).toEqual({
      departs: now,
      arrives: new Date(2026, 10, 7, 22, 10),
    })
    expect(
      routeTimes(route, { kind: 'depart', at: '2026-11-08T09:00' }, now),
    ).toEqual({
      departs: new Date(2026, 10, 8, 9, 0),
      arrives: new Date(2026, 10, 8, 9, 30),
    })
  })

  it('leaves the route before arriving by a time', () => {
    expect(
      routeTimes(route, { kind: 'arrive', at: '2026-11-08T09:00' }, now),
    ).toEqual({
      departs: new Date(2026, 10, 8, 8, 30),
      arrives: new Date(2026, 10, 8, 9, 0),
    })
  })

  it("goes by Valhalla's own clock times where it gives them", () => {
    expect(
      routeTimes(
        { ...route, departs: '2026-11-08T08:27', arrives: '2026-11-08T09:00' },
        { kind: 'arrive', at: '2026-11-08T09:00' },
        now,
      ),
    ).toEqual({
      departs: new Date(2026, 10, 8, 8, 27),
      arrives: new Date(2026, 10, 8, 9, 0),
    })
  })
})

describe('whenLabel', () => {
  it('says when to travel, shortly', () => {
    expect(whenLabel({ kind: 'now' }, now)).toBe('Şimdi çık')
    expect(whenLabel({ kind: 'depart', at: '2026-11-07T22:15' }, now)).toBe(
      'Çıkış 22:15',
    )
    expect(whenLabel({ kind: 'arrive', at: '2026-11-08T09:00' }, now)).toBe(
      'Varış yarın 09:00',
    )
    expect(whenLabel({ kind: 'depart', at: '2026-12-24T18:00' }, now)).toBe(
      'Çıkış 24 Ara 18:00',
    )
  })

  it('names the days round today', () => {
    expect(dayLabel(new Date(2026, 10, 6, 12), now)).toBe('dün')
    expect(dayLabel(new Date(2026, 10, 7, 1), now)).toBe('')
  })
})
