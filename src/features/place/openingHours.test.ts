import { describe, expect, it } from 'vitest'
import {
  addDays,
  describeOpenState,
  hoursOn,
  isTurkishHoliday,
  mentionsHolidays,
  openState,
  parseHours,
  parseOpeningHours,
  wallClock,
  weekLines,
  type WallClock,
} from './openingHours.ts'
import { holidaysAt, timeZoneAt } from './timeZone.ts'

// 12 October 2026 is a Monday: `at(3, …)` is a Thursday, 15 October
const at = (day: number, time: string): WallClock => {
  const [h, m] = time.split(':').map(Number)
  return {
    date: addDays({ year: 2026, month: 10, day: 12 }, day),
    weekday: day % 7,
    minutes: h * 60 + m,
  }
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

  it('lets a later rule override an earlier one, keeping holidays apart', () => {
    const hours = parseHours('Mo-Su 10:00-22:00; We off; PH 12:00-18:00')!
    expect(hours.week[2]).toEqual([])
    expect(hours.week[3]).toEqual([[600, 1320]])
    expect(hours.holiday).toEqual([[720, 1080]])
    expect(parseHours('Mo-Fr 09:00-17:00')!.holiday).toBeUndefined()
    expect(parseHours('Mo-Fr,PH 09:00-17:00')!.holiday).toEqual([[540, 1020]])
    expect(parseHours('Mo-Sa 09:00-17:00; Su,PH off')!.holiday).toEqual([])
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
    expect(
      describeOpenState(
        parseOpeningHours('Mo-Su 00:00-24:00')!,
        at(2, '12:00'),
      ),
    ).toBe('24 saat açık')
  })

  it('follows round-the-clock days on to when they really end', () => {
    const weekdays = parseOpeningHours('Mo-Fr 00:00-24:00')!
    // Tuesday: open on through to the end of Friday
    expect(openState(weekdays, at(1, '10:00'))).toEqual({
      open: true,
      change: { inDays: 4, at: 0 },
    })
    expect(describeOpenState(weekdays, at(1, '10:00'))).toBe(
      'Açık · Kapanış Cmt 00:00',
    )
    // Friday: closes tonight
    expect(describeOpenState(weekdays, at(4, '10:00'))).toBe(
      'Açık · Kapanış gece 00:00',
    )
    // Into the night, then on through the next day
    const runOn = parseOpeningHours('Mo 18:00-24:00; Tu 00:00-03:00')!
    expect(describeOpenState(runOn, at(0, '20:00'))).toBe(
      'Açık · Kapanış gece 03:00',
    )
  })

  it('looks a full week ahead, for a place open once a week', () => {
    const market = parseOpeningHours('We 08:00-14:00')!
    expect(openState(market, at(2, '15:00'))).toEqual({
      open: false,
      change: { inDays: 7, at: 480 },
    })
    expect(describeOpenState(market, at(2, '15:00'))).toBe(
      'Kapalı · Açılış gelecek Çar 08:00',
    )
    expect(describeOpenState(market, at(2, '07:00'))).toBe(
      'Kapalı · Açılış 08:00',
    )
  })
})

describe('public holidays', () => {
  // 29 October 2026, Cumhuriyet Bayramı, is a Thursday: `at(17, …)`
  const bayram = at(17, '10:00')

  it("knows Turkey's fixed-date national holidays", () => {
    expect(isTurkishHoliday({ year: 2026, month: 10, day: 29 })).toBe(true)
    expect(isTurkishHoliday({ year: 2027, month: 4, day: 23 })).toBe(true)
    expect(isTurkishHoliday({ year: 2026, month: 7, day: 15 })).toBe(true)
    expect(isTurkishHoliday({ year: 2026, month: 10, day: 28 })).toBe(false)
  })

  it('closes on a holiday for `PH off`', () => {
    const hours = parseHours('Mo-Fr 09:00-18:00; PH off')!
    expect(openState(hours, bayram, isTurkishHoliday).open).toBe(false)
    expect(describeOpenState(hours, bayram, isTurkishHoliday)).toBe(
      'Kapalı · Açılış yarın 09:00',
    )
    // Without knowing the holidays, an ordinary Thursday
    expect(openState(hours, bayram).open).toBe(true)
  })

  it("keeps a holiday's own hours, and looks ahead past it", () => {
    const hours = parseHours('Mo-Fr 09:00-18:00; PH 11:00-15:00')!
    expect(hoursOn(hours, bayram, isTurkishHoliday)).toEqual([[660, 900]])
    expect(describeOpenState(hours, bayram, isTurkishHoliday)).toBe(
      'Kapalı · Açılış 11:00',
    )
    expect(describeOpenState(hours, at(17, '12:00'), isTurkishHoliday)).toBe(
      'Açık · Kapanış 15:00',
    )
    // The evening before: tomorrow opens late, for the holiday
    expect(describeOpenState(hours, at(16, '19:00'), isTurkishHoliday)).toBe(
      'Kapalı · Açılış yarın 11:00',
    )
  })

  it('tells when a spec says something of holidays', () => {
    expect(mentionsHolidays('Mo-Fr 09:00-18:00; PH off')).toBe(true)
    expect(mentionsHolidays('Mo-Fr 09:00-18:00')).toBe(false)
  })

  it('lists the holiday hours after the week', () => {
    const hours = parseHours('Mo-Su 10:00-20:00; PH off')!
    expect(weekLines(hours.week, hours.holiday)).toEqual([
      { days: 'Pzt–Paz', hours: '10:00–20:00' },
      { days: 'Resmî tatil', hours: 'Kapalı' },
    ])
  })
})

describe('wallClock', () => {
  // 15 October 2026, 21:30 UTC: past midnight in Istanbul (UTC+3)
  const now = new Date(Date.UTC(2026, 9, 15, 21, 30))

  it("tells the time as it is in the place's own zone", () => {
    expect(wallClock(now, 'Europe/Istanbul')).toEqual({
      date: { year: 2026, month: 10, day: 16 },
      weekday: 4,
      minutes: 30,
    })
    expect(wallClock(now, 'America/New_York')).toEqual({
      date: { year: 2026, month: 10, day: 15 },
      weekday: 3,
      minutes: 17 * 60 + 30,
    })
  })

  it("opens and closes by the place's clock, not the reader's", () => {
    const week = parseOpeningHours('Mo-Su 08:00-23:00')!
    expect(openState(week, wallClock(now, 'Europe/Istanbul')).open).toBe(false)
    expect(openState(week, wallClock(now, 'America/New_York')).open).toBe(true)
  })

  it('falls back to the device zone for a zone it does not know', () => {
    expect(wallClock(now, 'Not/AZone')).toEqual(wallClock(now))
  })
})

describe('timeZoneAt', () => {
  it('knows Turkey, and leaves elsewhere to the device', () => {
    expect(timeZoneAt(28.97, 41.01)).toBe('Europe/Istanbul') // İstanbul
    expect(timeZoneAt(32.85, 39.92)).toBe('Europe/Istanbul') // Ankara
    expect(timeZoneAt(43.0, 39.72)).toBe('Europe/Istanbul') // Doğubayazıt
    expect(timeZoneAt(36.16, 36.2)).toBe('Europe/Istanbul') // Antakya
    expect(timeZoneAt(27.14, 38.42)).toBe('Europe/Istanbul') // İzmir
    expect(timeZoneAt(33.36, 35.34)).toBe('Asia/Famagusta') // Girne
    expect(timeZoneAt(23.73, 37.98)).toBeUndefined() // Atina
    expect(timeZoneAt(23.32, 42.7)).toBeUndefined() // Sofya
    expect(timeZoneAt(2.35, 48.86)).toBeUndefined() // Paris
  })

  it('knows the holidays only in Turkey', () => {
    expect(holidaysAt(28.97, 41.01)).toBe(isTurkishHoliday)
    expect(holidaysAt(2.35, 48.86)).toBeUndefined()
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
