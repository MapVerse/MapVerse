import { distanceMeters } from '../place/place.ts'
import { progressAt, type Course, type Progress } from './course.ts'
import { bearing, snap, type LngLat, type Snap } from './geometry.ts'
import { smooth, speedOf, type Fix, type Smoothed } from './smoothing.ts'

/** Within this of the route, the position is drawn on it, in metres. */
export const SNAP_M = 30
/** Further than this from the route (or than the fix's accuracy, if that
 *  is wider) is off it, in metres. */
export const OFF_ROUTE_M = 40
/** Off it this many fixes running is taken as off the route. */
export const OFF_ROUTE_FIXES = 3
/** A fix less sure than this says nothing of being on or off the route. */
const VAGUE_M = 120
/** Within this of a stop or the destination is there, in metres. */
export const REACHED_M = 30
/** Moved this far, the way one moved is the way one is going, in metres. */
const HEADING_M = 4

export type Navigation = {
  course: Course
  /** The position smoothed over the fixes, as the device put it */
  smoothed: Smoothed | null
  /** Where it is drawn: on the route when near it, else as smoothed */
  position: LngLat | null
  /** Where it falls on the route */
  snapped: Snap | null
  onRoute: boolean
  /** How far along the route, in metres; it only goes on */
  along: number
  progress: Progress
  /** Which way one is going, in degrees from north, once known */
  heading: number | null
  /** In metres a second */
  speed: number
  /** Fixes running that were off the route */
  offFixes: number
  /** The stops reached so far, by their numbers */
  reached: number[]
  arrived: boolean
  /** The accuracy of the last fix, in metres */
  accuracy: number
}

export function startNavigation(course: Course): Navigation {
  return {
    course,
    smoothed: null,
    position: null,
    snapped: null,
    onRoute: true,
    along: 0,
    progress: progressAt(course, 0),
    heading: null,
    speed: 0,
    offFixes: 0,
    reached: [],
    arrived: false,
    accuracy: Infinity,
  }
}

/**
 * On along a new course, as one asked for again from where one is: what
 * is known of the position, heading and stops reached carries over.
 */
export function rejoin(last: Navigation, course: Course): Navigation {
  const fresh = startNavigation(course)
  const next = {
    ...fresh,
    smoothed: last.smoothed,
    heading: last.heading,
    speed: last.speed,
    reached: last.reached,
    accuracy: last.accuracy,
  }
  return last.smoothed ? place(next, last.smoothed.lngLat) : next
}

/** Where a position falls on the course, and how far on that is. */
function place(nav: Navigation, at: LngLat): Navigation {
  const { course } = nav
  const snapped = snap(
    course.line,
    at,
    nav.snapped ? { along: nav.along } : undefined,
  )
  const onRoute = snapped.distance <= SNAP_M
  // Only on: a fix wavering back along the road doesn't undo a turn
  const along =
    snapped.distance <= Math.max(OFF_ROUTE_M, nav.accuracy)
      ? Math.max(nav.along, snapped.along)
      : nav.along
  return {
    ...nav,
    snapped,
    onRoute,
    position: onRoute ? snapped.point : at,
    along,
    progress: progressAt(course, along),
  }
}

/** The next fix from the device, taken into where one is on the way. */
export function advance(nav: Navigation, fix: Fix): Navigation {
  if (nav.arrived) return nav
  const smoothed = smooth(nav.smoothed, fix)
  const speed = speedOf({ speed: nav.speed, at: nav.smoothed }, fix, smoothed)
  let next = place(
    { ...nav, smoothed, speed, accuracy: fix.accuracy },
    smoothed.lngLat,
  )

  // The way one is going: the route's own, on it (steady), else the way
  // one moved, else the device's
  let heading = nav.heading
  if (next.onRoute && next.snapped) heading = next.snapped.bearing
  else if (
    nav.smoothed &&
    distanceMeters(nav.smoothed.lngLat, smoothed.lngLat) >= HEADING_M
  ) {
    heading = bearing(nav.smoothed.lngLat, smoothed.lngLat)
  } else if (
    fix.heading !== null &&
    Number.isFinite(fix.heading) &&
    speed > 1
  ) {
    heading = fix.heading
  }

  // Off the route only on fixes sure enough to tell
  const distance = next.snapped?.distance ?? 0
  let offFixes = nav.offFixes
  if (fix.accuracy <= VAGUE_M) {
    offFixes = distance > Math.max(OFF_ROUTE_M, fix.accuracy) ? offFixes + 1 : 0
  }

  // The stops on the way, in order, each once it is near
  const { stops, destination, line } = next.course
  const reached = [...nav.reached]
  for (const stop of stops) {
    if (reached.includes(stop.number)) continue
    const near =
      next.along >= stop.along - REACHED_M ||
      distanceMeters(smoothed.lngLat, stop.lngLat) <= REACHED_M
    if (!near) break
    reached.push(stop.number)
  }
  const stopsLeft = stops.some((s) => !reached.includes(s.number))
  const arrived =
    !stopsLeft &&
    (line.length - next.along <= REACHED_M ||
      (distanceMeters(smoothed.lngLat, destination) <= REACHED_M &&
        next.progress.next >= next.course.maneuvers.length - 2))

  next = { ...next, heading, offFixes, reached, arrived }
  return next
}

/** Whether to ask for the route again: off it for a few fixes running. */
export const isOffRoute = (nav: Navigation) =>
  !nav.arrived && nav.offFixes >= OFF_ROUTE_FIXES

/** At most this often is the route asked for again, in ms. */
export const REROUTE_EVERY_MS = 15_000

/** Whether the route may be asked for again now, the last time it was
 *  being `last` (in ms, or never). */
export const mayReroute = (last: number | null, now: number) =>
  last === null || now - last >= REROUTE_EVERY_MS

/** Where the route asked for again goes: the stops not reached yet, and
 *  the destination. */
export function remaining(nav: Navigation) {
  const stops = nav.course.stops
    .filter((s) => !nav.reached.includes(s.number))
    .map(({ number, lngLat }) => ({ number, lngLat }))
  return { stops, destination: nav.course.destination }
}
