import { currentLocale, translate, type Locale } from '../../i18n/index.ts'
import { formatNumber } from '../../i18n/format.ts'
import type { Maneuver, TravelMode } from '../directions/valhalla.ts'
import { isArrival } from './course.ts'

/**
 * How far before a maneuver it is said, in metres: well before, a little
 * before, and at it. On foot or by bike things come slower, and nearer.
 */
export const STAGES: Record<TravelMode, [number, number, number]> = {
  auto: [500, 100, 25],
  bicycle: [250, 60, 15],
  pedestrian: [150, 40, 10],
}

/** What has been said of a maneuver: up to which stage, by index. */
export type Said = { maneuver: number; stage: number }

/** A distance as it is said, rounded as one would: "450 metre",
 *  "1,5 kilometre"; in English, "450 meters", "1.5 kilometers". */
export function spokenDistance(
  meters: number,
  locale: Locale = currentLocale(),
): string {
  if (meters >= 950) {
    const km = Math.round(meters / 100) / 10
    return translate(locale, 'voice.kilometers', {
      n: formatNumber(km, { maximumFractionDigits: 1 }, locale),
      count: km,
    })
  }
  const step = meters >= 300 ? 50 : 10
  const n = Math.max(step, Math.round(meters / step) * step)
  return translate(locale, 'voice.meters', { n })
}

/** "500 metre sonra, Atatürk Bulvarı caddesine doğru sağa dönün." */
function inDistance(meters: number, text: string, locale: Locale) {
  // In English the instruction goes on the sentence: "In 500 meters, turn…"
  const rest =
    locale === 'en' ? text.charAt(0).toLowerCase() + text.slice(1) : text
  return translate(locale, 'voice.inDistance', {
    distance: spokenDistance(meters, locale),
    text: rest,
  })
}

/**
 * What to say now of the next maneuver, `toNext` metres ahead, if
 * anything: the nearest stage it has come within, once, unless a nearer
 * one was said already. So a maneuver close after another is said only
 * once, as it comes, rather than every stage at once. At an arrival
 * nothing is said at the last stage, as its arrival is said instead.
 */
export function announcement(
  maneuvers: Maneuver[],
  next: number,
  toNext: number,
  mode: TravelMode,
  said: Said | null,
  locale: Locale = currentLocale(),
): { text: string; said: Said } | null {
  const m = maneuvers[next]
  if (!m) return null
  const stages = STAGES[mode]
  let stage = -1
  for (let s = 0; s < stages.length; s++) if (toNext <= stages[s]) stage = s
  if (stage < 0) return null
  if (said && said.maneuver === next && said.stage >= stage) return null
  const verbal = m.verbal ?? {}
  let text: string
  if (stage === 2) {
    if (isArrival(m)) return null
    text = verbal.pre ?? m.instruction
  } else {
    text = inDistance(
      toNext,
      verbal.alert ?? verbal.pre ?? m.instruction,
      locale,
    )
  }
  return { text, said: { maneuver: next, stage } }
}

/** What is said as the way starts: the first maneuver, as Valhalla says it. */
export function departure(maneuvers: Maneuver[]): string {
  const first = maneuvers[0]
  return first ? (first.verbal?.pre ?? first.instruction) : ''
}
