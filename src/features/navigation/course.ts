import {
  stopAhead,
  stopArrival,
  type Maneuver,
  type Route,
} from '../directions/valhalla.ts'
import { measure, type Line, type LngLat } from './geometry.ts'

/** A stop on the way, numbered as it was planned. */
export type Stop = { number: number; lngLat: LngLat }

/** A route made ready to be followed. */
export type Course = {
  route: Route
  line: Line
  maneuvers: Maneuver[]
  /** How far along the line each maneuver starts, in metres */
  turns: number[]
  /** The stops still on the way, and how far along each is */
  stops: (Stop & { along: number })[]
  destination: LngLat
}

/**
 * A route made ready to be followed, to `stops` on the way (in order, as
 * the route was asked for) and then `destination`. A route asked for
 * again on the way numbers its stops from 1; they are numbered here as
 * they were planned, so the second stop stays the second once the first
 * is behind.
 */
export function prepareCourse(
  route: Route,
  stops: Stop[],
  destination: LngLat,
): Course {
  const line = measure(route.shape)
  const maneuvers = route.maneuvers.map((m) => {
    const stop = m.stop !== undefined ? stops[m.stop - 1] : undefined
    if (!stop) return m
    return {
      ...m,
      stop: stop.number,
      instruction: stopArrival(m.type, stop.number),
      verbal: {
        alert: stopAhead(m.type, stop.number),
        pre: stopArrival(m.type, stop.number),
      },
    }
  })
  const turns = maneuvers.map((m) => line.along[m.at] ?? line.length)
  // Each stop where its arrival is, or else nearest along the line
  const reached = maneuvers.flatMap((m, i) =>
    m.stop !== undefined ? [turns[i]] : [],
  )
  return {
    route,
    line,
    maneuvers,
    turns,
    stops: stops.map((stop, i) => ({
      ...stop,
      along: reached[i] ?? line.length,
    })),
    destination,
  }
}

/** Valhalla's arrival maneuvers: at, on the right of, on the left of. */
export const isArrival = (m: Maneuver) => m.type >= 4 && m.type <= 6

/** How near a maneuver counts as passed, in metres: as it is reached,
 *  with room for the position along to waver round it. */
export const PASSED_M = 6

export type Progress = {
  /** The next maneuver, by its index */
  next: number
  /** To it, in metres */
  toNext: number
  /** To the destination, in metres and seconds */
  meters: number
  seconds: number
}

/**
 * How far on one is, `along` the line: the next maneuver and how far it
 * is, and how much of the way is left. The time left takes each
 * maneuver's own pace (Valhalla's), so a slow street ahead counts slow.
 */
export function progressAt(course: Course, along: number): Progress {
  const { turns, maneuvers, line } = course
  let next = 1
  while (next < turns.length - 1 && turns[next] - along <= PASSED_M) next++
  next = Math.min(next, maneuvers.length - 1)
  const toNext = Math.max(0, turns[next] - along)
  // The rest of the maneuver one is on, at its pace, and those after it
  const current = Math.max(0, next - 1)
  const span = turns[next] - turns[current]
  const share = span > 0 ? Math.min(1, toNext / span) : 0
  let seconds = maneuvers[current].seconds * share
  for (let i = next; i < maneuvers.length; i++) seconds += maneuvers[i].seconds
  return {
    next,
    toNext,
    meters: Math.max(0, line.length - along),
    seconds,
  }
}
