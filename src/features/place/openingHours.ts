import { t } from '../../i18n/index.ts'
import { formatMinutes } from '../../i18n/format.ts'

/*
 * OpenStreetMap's `opening_hours`, in its everyday forms: `24/7`, or rules
 * such as `Mo-Fr 08:00-18:00; Sa 09:00-14:00; Su off; PH off`. Anything more
 * (months, week numbers, sunrise, comments) is left to be shown as written.
 */

/** Minutes from midnight to minutes from midnight, past 24:00 if it runs on. */
export type Interval = [from: number, to: number]
/** Each day's hours, Monday first. */
export type Week = Interval[][]
/**
 * A place's hours: its week, and its hours on public holidays when it
 * says what they are (`PH off`, `PH 10:00-14:00`).
 */
export type Hours = { week: Week; holiday?: Interval[] }

const DAY_KEYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
/** The days' short names in the language in use, Monday first. */
export const dayNames = () => t('days.short').split(',')
const DAY = 24 * 60

const DAYS = String.raw`(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)(?:\s*-\s*(?:Mo|Tu|We|Th|Fr|Sa|Su))?`
const TIME = String.raw`\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}`
const RULE = new RegExp(
  String.raw`^(?:(${DAYS}(?:\s*,\s*${DAYS})*)\s+)?(${TIME}(?:\s*,\s*${TIME})*|off|closed)$`,
  'i',
)

const minutes = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * The days a list such as `Mo-We,Fr` or `Sa,PH` names, and whether it
 * names public holidays; null if it names something else.
 */
function days(list: string): { days: number[]; holiday: boolean } | null {
  const picked = new Set<number>()
  let holiday = false
  for (const part of list.split(',').map((p) => p.trim())) {
    if (/^PH$/i.test(part)) {
      holiday = true
      continue
    }
    const [from, to = from] = part.split('-').map((d) => d.trim())
    const a = DAY_KEYS.findIndex((d) => d.toLowerCase() === from.toLowerCase())
    const b = DAY_KEYS.findIndex((d) => d.toLowerCase() === to.toLowerCase())
    if (a < 0 || b < 0) return null
    // A range may wrap round the week, as in Fr-Mo
    for (let d = a; ; d = (d + 1) % 7) {
      picked.add(d)
      if (d === b) break
    }
  }
  return picked.size || holiday ? { days: [...picked], holiday } : null
}

const EVERY_DAY = { days: [0, 1, 2, 3, 4, 5, 6], holiday: false }

/** A place's hours from `opening_hours`, or null if it says more than that. */
export function parseHours(spec: string): Hours | null {
  const text = spec.trim()
  if (/^24\/7$/.test(text)) return { week: DAY_KEYS.map(() => [[0, DAY]]) }
  const week: Week = DAY_KEYS.map(() => [])
  let holiday: Interval[] | undefined
  // A comma before a day starts another rule, as a semicolon would
  const rules = text
    .replace(/(?<=\d)\s*,\s*(?=(?:Mo|Tu|We|Th|Fr|Sa|Su|PH)\b)/g, '; ')
    .split(/\s*(?:;|\|\|)\s*/)
    .filter(Boolean)
  if (!rules.length) return null
  for (const rule of rules) {
    const match = RULE.exec(rule)
    if (!match) return null
    const [, dayList, times] = match
    const picked = dayList ? days(dayList) : EVERY_DAY
    if (!picked) return null
    const intervals: Interval[] = /^(off|closed)$/i.test(times)
      ? []
      : times.split(',').map((range) => {
          const [from, to] = range.split('-').map((t) => minutes(t.trim()))
          return [from, to <= from ? to + DAY : to]
        })
    // A later rule overrides an earlier one for the days it names
    for (const d of picked.days) week[d] = intervals
    if (picked.holiday) holiday = intervals
  }
  return holiday ? { week, holiday } : { week }
}

/** A week's hours from `opening_hours`, or null if it says more than that. */
export function parseOpeningHours(spec: string): Week | null {
  return parseHours(spec)?.week ?? null
}

/** Whether `opening_hours` says anything of public holidays. */
export const mentionsHolidays = (spec: string) => /\bPH\b/.test(spec)

/** A day on the calendar, its month counted from 1. */
export type CivilDate = { year: number; month: number; day: number }

/** The time as the clocks show it where a place is. */
export type WallClock = {
  date: CivilDate
  /** Monday being 0 */
  weekday: number
  /** Minutes since midnight */
  minutes: number
}

const WEEKDAYS: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
}

/**
 * What the clocks show at `now` in a time zone (the device's own if none
 * is given): the place's own time, not the reader's, tells if it is open.
 */
export function wallClock(now: Date, timeZone?: string): WallClock {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(now)
  } catch {
    // A zone this browser doesn't know: the device's own time
    if (timeZone) return wallClock(now)
    return {
      date: {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
      },
      weekday: (now.getDay() + 6) % 7,
      minutes: now.getHours() * 60 + now.getMinutes(),
    }
  }
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return {
    date: {
      year: Number(get('year')),
      month: Number(get('month')),
      day: Number(get('day')),
    },
    weekday: WEEKDAYS[get('weekday')] ?? (now.getDay() + 6) % 7,
    // Some engines write midnight as 24 even in a 23-hour cycle
    minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')),
  }
}

/** The day `days` after `date`. */
export function addDays({ year, month, day }: CivilDate, days: number) {
  const d = new Date(Date.UTC(year, month - 1, day + days))
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  }
}

/** Whether a day is a public holiday where a place is. */
export type HolidayCheck = (date: CivilDate) => boolean

/**
 * Turkey's national holidays that fall on the same date every year. The
 * religious ones (Ramazan and Kurban Bayramı) move with the lunar calendar
 * and are not known here.
 */
const TURKISH_HOLIDAYS = [
  [1, 1], // Yılbaşı
  [4, 23], // Ulusal Egemenlik ve Çocuk Bayramı
  [5, 1], // Emek ve Dayanışma Günü
  [5, 19], // Atatürk'ü Anma, Gençlik ve Spor Bayramı
  [7, 15], // Demokrasi ve Millî Birlik Günü
  [8, 30], // Zafer Bayramı
  [10, 29], // Cumhuriyet Bayramı
]

export const isTurkishHoliday: HolidayCheck = ({ month, day }) =>
  TURKISH_HOLIDAYS.some(([m, d]) => m === month && d === day)

const asHours = (hours: Hours | Week): Hours =>
  Array.isArray(hours) ? { week: hours } : hours

/** A day's hours, `offset` days on from the one `wall` is in. */
export function hoursOn(
  hours: Hours | Week,
  wall: WallClock,
  isHoliday?: HolidayCheck,
  offset = 0,
): Interval[] {
  const h = asHours(hours)
  if (h.holiday && isHoliday?.(addDays(wall.date, offset))) return h.holiday
  return h.week[(((wall.weekday + offset) % 7) + 7) % 7]
}

/** Whether today, where the place is, is a holiday with hours of its own. */
export const isHolidayToday = (
  hours: Hours,
  wall: WallClock,
  isHoliday?: HolidayCheck,
) => !!hours.holiday && !!isHoliday?.(wall.date)

export type OpenState = {
  open: boolean
  always?: boolean
  change?: { inDays: number; at: number }
}

/**
 * Whether a place is open at a time, and when that next changes. Hours
 * that run on into the next day, as round the clock on weekdays, are
 * followed to where they really end; it looks a full week ahead, to the
 * same day next week.
 */
export function openState(
  hours: Hours | Week,
  wall: WallClock,
  isHoliday?: HolidayCheck,
): OpenState {
  const m = wall.minutes
  // The hours from yesterday (which may run on into today) to a week on,
  // as minutes from today's midnight, those that touch run together
  const spans: Interval[] = []
  for (let k = -1; k <= 8; k++) {
    for (const [from, to] of hoursOn(hours, wall, isHoliday, k)) {
      spans.push([k * DAY + from, k * DAY + to])
    }
  }
  spans.sort((a, b) => a[0] - b[0])
  const merged: Interval[] = []
  for (const span of spans) {
    const last = merged[merged.length - 1]
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1])
    else merged.push([...span])
  }
  const current = merged.find(([from, to]) => from <= m && m < to)
  if (current) {
    // Open a week on end: it never closes
    if (current[1] - m >= 7 * DAY) return { open: true, always: true }
    const to = current[1]
    return {
      open: true,
      change: { inDays: Math.floor(to / DAY), at: to % DAY },
    }
  }
  const next = merged.find(([from]) => from > m && from <= 7 * DAY + DAY)
  if (!next) return { open: false }
  const from = next[0]
  return {
    open: false,
    change: { inDays: Math.floor(from / DAY), at: from % DAY },
  }
}

/** A time of day in minutes, as the language in use writes it. */
export const clock = (at: number) => formatMinutes(at === DAY ? DAY : at % DAY)

/** A line saying whether a place is open now, and until or from when. */
export function describeOpenState(
  hours: Hours | Week,
  wall: WallClock,
  isHoliday?: HolidayCheck,
): string {
  const state = openState(hours, wall, isHoliday)
  if (state.always) return t('hours.always')
  if (!state.change) return t(state.open ? 'hours.open' : 'hours.closed')
  const { inDays, at } = state.change
  const day = dayNames()[(wall.weekday + inDays) % 7]
  const time = clock(at)
  if (state.open) {
    const when =
      inDays === 0
        ? ''
        : inDays === 1
          ? t('hours.tonight')
          : t('hours.onDay', { day })
    return t('hours.openUntil', { when, time })
  }
  const when =
    inDays === 0
      ? ''
      : inDays === 1
        ? t('hours.tomorrow')
        : inDays === 7
          ? t('hours.nextWeek', { day })
          : t('hours.onDay', { day })
  return t('hours.closedUntil', { when, time })
}

/** A day's hours, as written out for reading. */
export const dayHours = (day: Interval[]) =>
  day.length === 0
    ? t('hours.closed')
    : day.some(([from, to]) => from === 0 && to >= DAY)
      ? t('hours.allDay')
      : day.map(([from, to]) => `${clock(from)}–${clock(to)}`).join(', ')

/**
 * The week as lines, days with the same hours run together; then public
 * holidays, if their hours are given.
 */
export function weekLines(
  week: Week,
  holiday?: Interval[],
): { days: string; hours: string }[] {
  const hours = week.map(dayHours)
  const names = dayNames()
  const lines: { days: string; hours: string }[] = []
  for (let d = 0; d < 7;) {
    let end = d
    while (end + 1 < 7 && hours[end + 1] === hours[d]) end++
    lines.push({
      days: end === d ? names[d] : `${names[d]}–${names[end]}`,
      hours: hours[d],
    })
    d = end + 1
  }
  if (holiday) {
    lines.push({ days: t('hours.holiday'), hours: dayHours(holiday) })
  }
  return lines
}
