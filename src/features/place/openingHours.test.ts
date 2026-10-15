import { describe, expect, it } from 'vitest'
import {
  describeOpenState,
  openState,
  parseOpeningHours,
  weekLines,
} from './openingHours.ts'

// 12 October 2026 is a Monday: `at(3, …)` is a Thursday
const at = (day: number, time: string) => {
  const [h, m] = time.split(':').map(Number)
  return new Date(2026, 9, 12 + day, h, m)
}

describe('parseOpeningHours', () => {
  it('reads a working week, a short Saturday and a closed Sunday', () => {
    const week = parseOpeningHours('Mo-Fr 08:00-18:00; Sa 09:00-14:00; Su off')
    expect(week).toEqual([
      [[480, 1080]],
      [[480, 1080]],
      [[480, 1080]],
      [[480, 1080]],
      [[480, 1080]],
      [[540, 840]],
      [],
    ])
  })

  it('reads a lunch break, a comma between rules and hours past midnight', () => {
    const week = parseOpeningHours(
      'Mo-Th 09:00-12:00,13:00-17:00, Fr-Sa 18:00-02:00',
    )!
    expect(week[0]).toEqual([
      [540, 720],
      [780, 1020],
    ])
    expect(week[4]).toEqual([[1080, 1560]])
    expect(week[6]).toEqual([])
  })

  it('lets a later rule override an earlier one, and leaves out holidays', () => {
    const week = parseOpeningHours('Mo-Su 10:00-22:00; We off; PH 12:00-18:00')!
    expect(week[2]).toEqual([])
    expect(week[3]).toEqual([[600, 1320]])
  })

  it('reads days named one by one, and ranges round the weekend', () => {
    const week = parseOpeningHours('Mo,We 10:00-12:00; Sa-Mo 14:00-16:00')!
    expect(week[0]).toEqual([[840, 960]])
    expect(week[2]).toEqual([[600, 720]])
    expect(week[5]).toEqual([[840, 960]])
    expect(week[6]).toEqual([[840, 960]])
    expect(week[1]).toEqual([])
  })

  it('reads 24/7, and hours with no days as every day', () => {
    expect(parseOpeningHours('24/7')!.every((d) => d[0][1] === 1440)).toBe(true)
    expect(parseOpeningHours('07:00-23:00')![6]).toEqual([[420, 1380]])
  })

  it('leaves forms it does not know to be shown as written', () => {
    expect(parseOpeningHours('Jan-Mar Mo-Fr 08:00-16:00')).toBeNull()
    expect(parseOpeningHours('sunrise-sunset')).toBeNull()
    expect(parseOpeningHours('Mo-Fr 08:00+')).toBeNull()
    expect(parseOpeningHours('"by appointment"')).toBeNull()
  })
})

describe('openState', () => {
  const week = parseOpeningHours('Mo-Fr 08:00-18:00; Sa 09:00-14:00; Su off')!

  it('is open within the hours, until they end', () => {
    expect(openState(week, at(3, '10:00'))).toEqual({
      open: true,
      change: { inDays: 0, at: 1080 },
    })
    expect(describeOpenState(week, at(3, '10:00'))).toBe('Açık · Kapanış 18:00')
  })

  it('is closed outside them, and says when they start again', () => {
    expect(describeOpenState(week, at(3, '07:00'))).toBe(
      'Kapalı · Açılış 08:00',
    )
    expect(describeOpenState(week, at(4, '19:00'))).toBe(
      'Kapalı · Açılış yarın 09:00',
    )
    expect(describeOpenState(week, at(5, '15:00'))).toBe(
      'Kapalı · Açılış Pzt 08:00',
    )
  })

  it('counts hours running past midnight into the next day', () => {
    const late = parseOpeningHours('Fr-Sa 18:00-02:00')!
    expect(describeOpenState(late, at(4, '23:00'))).toBe(
      'Açık · Kapanış gece 02:00',
    )
    expect(openState(late, at(5, '01:00')).open).toBe(true)
    expect(openState(late, at(5, '03:00')).open).toBe(false)
  })

  it('knows a place that never closes', () => {
    expect(describeOpenState(parseOpeningHours('24/7')!, at(0, '03:00'))).toBe(
      '24 saat açık',
    )
  })
})

describe('weekLines', () => {
  it('runs days with the same hours together', () => {
    const week = parseOpeningHours(
      'Mo-Fr 08:00-12:00,13:00-17:00; Sa 09:00-14:00; Su off',
    )!
    expect(weekLines(week)).toEqual([
      { days: 'Pzt–Cum', hours: '08:00–12:00, 13:00–17:00' },
      { days: 'Cmt', hours: '09:00–14:00' },
      { days: 'Paz', hours: 'Kapalı' },
    ])
  })
})
