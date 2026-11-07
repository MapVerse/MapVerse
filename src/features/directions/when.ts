import { currentLocale, t } from '../../i18n/index.ts'
import { formatDate, formatTime } from '../../i18n/format.ts'
import type { Route, When } from './valhalla.ts'

const pad = (n: number) => String(n).padStart(2, '0')

/** A date as a local clock time, like 2026-11-08T09:00. */
export function localValue(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/** A local clock time like 2026-11-08T09:00 as a date, if it is one. */
export function parseLocal(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!m) return null
  const [year, month, day, hour, minute] = m.slice(1).map(Number)
  const date = new Date(year, month - 1, day, hour, minute)
  // Not a day or time that exists, like 2026-02-30
  return date.getMonth() === month - 1 &&
    date.getDate() === day &&
    hour < 24 &&
    minute < 60
    ? date
    : null
}

/** Calendar days from one date to another (rounded, as a day may be an
 *  hour short or long). */
function daysApart(from: Date, to: Date): number {
  const day = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.round((day(to) - day(from)) / 86_400_000)
}

/** A clock time like 09:00, marked with the days off a given day, like
 *  00:16 (+1 gün). */
export function formatClock(at: Date, day: Date): string {
  const time = formatTime(at)
  const days = daysApart(day, at)
  if (days > 0) return t('time.laterDay', { time, days })
  if (days < 0) return t('time.earlierDay', { time, days: -days })
  return time
}

/**
 * When a route leaves and arrives: by the clock times Valhalla gives, or
 * else worked out from its time asked for (or now) and how long it takes.
 */
export function routeTimes(
  route: Pick<Route, 'seconds' | 'departs' | 'arrives'>,
  when: When,
  now = new Date(),
): { departs: Date; arrives: Date } {
  const given = route.departs && route.arrives
  const departs = given && parseLocal(route.departs!)
  const arrives = given && parseLocal(route.arrives!)
  if (departs && arrives) return { departs, arrives }
  const at = (when.kind !== 'now' && parseLocal(when.at)) || now
  const by = route.seconds * 1000
  return when.kind === 'arrive'
    ? { departs: new Date(at.getTime() - by), arrives: at }
    : { departs: at, arrives: new Date(at.getTime() + by) }
}

const MONTHS = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
]

/** A day said shortly: nothing for today, yarın, or like 8 Kas. */
export function dayLabel(date: Date, now = new Date()): string {
  const days = daysApart(now, date)
  if (days === 0) return ''
  if (days === 1) return t('day.tomorrow')
  if (days === -1) return t('day.yesterday')
  if (currentLocale() !== 'tr') {
    return formatDate(date, { day: 'numeric', month: 'short' })
  }
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`
}

/** What the time button says: Şimdi çık, Çıkış 09:00, Varış yarın 09:00… */
export function whenLabel(when: When, now = new Date()): string {
  if (when.kind === 'now') return t('directions.leaveNow')
  const at = parseLocal(when.at)
  if (!at) return t('directions.leaveNow')
  const day = dayLabel(at, now)
  return t('directions.whenLabel', {
    kind: t(when.kind === 'depart' ? 'directions.depart' : 'directions.arrive'),
    day: day ? `${day} ` : '',
    time: formatTime(at),
  })
}
