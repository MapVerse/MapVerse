import { currentLocale, intlLocale, type Locale } from './locale.ts'

const numberFormats = new Map<string, Intl.NumberFormat>()
const dateFormats = new Map<string, Intl.DateTimeFormat>()

/** A number written the way the language in use writes it. */
export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {},
  locale: Locale = currentLocale(),
): string {
  const tag = intlLocale(locale)
  const key = `${tag}|${JSON.stringify(options)}`
  let format = numberFormats.get(key)
  if (!format) {
    format = new Intl.NumberFormat(tag, options)
    numberFormats.set(key, format)
  }
  return format.format(value)
}

function dateFormat(tag: string, options: Intl.DateTimeFormatOptions) {
  const key = `${tag}|${JSON.stringify(options)}`
  let format = dateFormats.get(key)
  if (!format) {
    format = new Intl.DateTimeFormat(tag, options)
    dateFormats.set(key, format)
  }
  return format
}

/** A date written the way the language in use writes it. */
export function formatDate(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  locale: Locale = currentLocale(),
): string {
  return dateFormat(intlLocale(locale), options).format(date)
}

/** Whether the language in use tells the time on a 12-hour clock. */
export function usesTwelveHours(locale: Locale = currentLocale()): boolean {
  return !!dateFormat(intlLocale(locale), {
    hour: 'numeric',
  }).resolvedOptions().hour12
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * A time of day, given as minutes from midnight (24:00 being the end of
 * the day): 09:30 and 24:00 on a 24-hour clock, 9:30 AM and 12:00 AM on a
 * 12-hour one.
 */
export function formatMinutes(
  minutes: number,
  locale: Locale = currentLocale(),
): string {
  if (!usesTwelveHours(locale)) {
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
  }
  const at = new Date(Date.UTC(2000, 0, 1, 0, minutes % (24 * 60)))
  return dateFormat(intlLocale(locale), {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(at)
}

/** A date's clock time, as {@link formatMinutes} writes it. */
export const formatTime = (date: Date, locale: Locale = currentLocale()) =>
  formatMinutes(date.getHours() * 60 + date.getMinutes(), locale)
