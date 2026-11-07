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

const kilometres = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 })

/** A distance as it is said, rounded as one would: "450 metre",
 *  "1,5 kilometre". */
export function spokenDistance(meters: number): string {
  if (meters >= 950) {
    return `${kilometres.format(Math.round(meters / 100) / 10)} kilometre`
  }
  const step = meters >= 300 ? 50 : 10
  return `${Math.max(step, Math.round(meters / step) * step)} metre`
}

/** "500 metre sonra, Atatürk Bulvarı caddesine doğru sağa dönün." */
const inDistance = (meters: number, text: string) =>
  `${spokenDistance(meters)} sonra, ${text}`

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
    text = inDistance(toNext, verbal.alert ?? verbal.pre ?? m.instruction)
  }
  return { text, said: { maneuver: next, stage } }
}

/** What is said as the way starts: the first maneuver, as Valhalla says it. */
export function departure(maneuvers: Maneuver[]): string {
  const first = maneuvers[0]
  return first ? (first.verbal?.pre ?? first.instruction) : ''
}
