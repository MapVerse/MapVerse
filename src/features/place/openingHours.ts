/*
 * OpenStreetMap's `opening_hours`, in its everyday forms: `24/7`, or rules
 * such as `Mo-Fr 08:00-18:00; Sa 09:00-14:00; Su off`. Anything more (months,
 * week numbers, sunrise, holidays' own hours, comments) is left to be shown
 * as written.
 */

/** Minutes from midnight to minutes from midnight, past 24:00 if it runs on. */
export type Interval = [from: number, to: number]
/** Each day's hours, Monday first. */
export type Week = Interval[][]

const DAY_KEYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
export const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
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

/** The days a list such as `Mo-We,Fr` names, or null if it names only holidays. */
function days(list: string): number[] | null {
  const picked = new Set<number>()
  for (const part of list.split(',').map((p) => p.trim())) {
    if (/^PH$/i.test(part)) continue
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
  return picked.size ? [...picked] : null
}

/** A week's hours from `opening_hours`, or null if it says more than that. */
export function parseOpeningHours(spec: string): Week | null {
  const text = spec.trim()
  if (/^24\/7$/.test(text)) return DAY_KEYS.map(() => [[0, DAY]])
  const week: Week = DAY_KEYS.map(() => [])
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
    const picked = dayList ? days(dayList) : [0, 1, 2, 3, 4, 5, 6]
    // Holidays' own hours are left out
    if (dayList && /\bPH\b/i.test(dayList) && !picked) continue
    if (!picked) return null
    const intervals: Interval[] = /^(off|closed)$/i.test(times)
      ? []
      : times.split(',').map((range) => {
          const [from, to] = range.split('-').map((t) => minutes(t.trim()))
          return [from, to <= from ? to + DAY : to]
        })
    // A later rule overrides an earlier one for the days it names
    for (const d of picked) week[d] = intervals
  }
  return week
}

const isAlwaysOpen = (week: Week) =>
  week.every((day) => day.some(([from, to]) => from === 0 && to >= DAY))

/** Whether a place is open at a time, and when that next changes. */
export function openState(
  week: Week,
  now: Date,
): {
  open: boolean
  always?: boolean
  change?: { inDays: number; at: number }
} {
  if (isAlwaysOpen(week)) return { open: true, always: true }
  const today = (now.getDay() + 6) % 7
  const yesterday = (today + 6) % 7
  const m = now.getHours() * 60 + now.getMinutes()
  for (const [from, to] of week[today]) {
    if (m >= from && m < to) {
      return { open: true, change: { inDays: to >= DAY ? 1 : 0, at: to % DAY } }
    }
  }
  for (const [, to] of week[yesterday]) {
    if (to > DAY && m < to - DAY) {
      return { open: true, change: { inDays: 0, at: to - DAY } }
    }
  }
  for (let ahead = 0; ahead < 7; ahead++) {
    const starts = week[(today + ahead) % 7]
      .map(([from]) => from)
      .filter((from) => ahead > 0 || from > m)
      .sort((a, b) => a - b)
    if (starts.length)
      return { open: false, change: { inDays: ahead, at: starts[0] } }
  }
  return { open: false }
}

export const clock = (at: number) => {
  const m = at === DAY ? DAY : at % DAY
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** A line saying whether a place is open now, and until or from when. */
export function describeOpenState(week: Week, now: Date): string {
  const state = openState(week, now)
  if (state.always) return '24 saat açık'
  if (!state.change) return state.open ? 'Açık' : 'Kapalı'
  const { inDays, at } = state.change
  if (state.open) {
    return `Açık · Kapanış ${inDays ? 'gece ' : ''}${clock(at)}`
  }
  const when =
    inDays === 0
      ? ''
      : inDays === 1
        ? 'yarın '
        : `${DAY_NAMES[(((now.getDay() + 6) % 7) + inDays) % 7]} `
  return `Kapalı · Açılış ${when}${clock(at)}`
}

/** A day's hours, as written out for reading. */
export const dayHours = (day: Interval[]) =>
  day.length === 0
    ? 'Kapalı'
    : day.some(([from, to]) => from === 0 && to >= DAY)
      ? '24 saat'
      : day.map(([from, to]) => `${clock(from)}–${clock(to)}`).join(', ')

/** Today's hours, Monday being day 0. */
export const todayIndex = (now: Date) => (now.getDay() + 6) % 7

/** The week as lines, days with the same hours run together. */
export function weekLines(week: Week): { days: string; hours: string }[] {
  const hours = week.map(dayHours)
  const lines: { days: string; hours: string }[] = []
  for (let d = 0; d < 7;) {
    let end = d
    while (end + 1 < 7 && hours[end + 1] === hours[d]) end++
    lines.push({
      days: end === d ? DAY_NAMES[d] : `${DAY_NAMES[d]}–${DAY_NAMES[end]}`,
      hours: hours[d],
    })
    d = end + 1
  }
  return lines
}
