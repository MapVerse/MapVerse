import { distanceMeters } from '../place/place.ts'
import type { LngLat } from './geometry.ts'

/** A position from the device, as `watchPosition` gives it. */
export type Fix = {
  lngLat: LngLat
  /** How far off it may be, in metres */
  accuracy: number
  /** Which way it is moving, in degrees from north, if known */
  heading: number | null
  /** How fast, in metres a second, if known */
  speed: number | null
  /** When, in ms */
  time: number
}

/** A position smoothed over the fixes so far. */
export type Smoothed = {
  lngLat: LngLat
  /** How uncertain it still is, in square metres */
  variance: number
  time: number
}

/** How fast the position may wander between fixes at the least, in
 *  metres a second; on the move, as fast as one goes. More lets it keep
 *  up, less steadies it more. */
const WANDER_MPS = 3
/** Faster than this is a fix gone astray, not one's speed. */
const TOP_MPS = 70

/** A fix further than this from the last, and sure of itself, is taken
 *  as it is: a tunnel left, or the device woken after a while. */
const JUMP_M = 250
const STALE_MS = 30_000

/**
 * The next smoothed position (a simple Kalman filter): each fix pulls it
 * as far as it is surer than the position so far, so a jittery fix with a
 * wide accuracy moves it little, and a sharp one nearly all the way. The
 * faster one goes, the less the position so far is held to, so it keeps
 * up on the move and is steadied standing still.
 */
export function smooth(last: Smoothed | null, fix: Fix): Smoothed {
  const accuracy = Math.max(fix.accuracy, 1)
  const fresh = { lngLat: fix.lngLat, variance: accuracy ** 2, time: fix.time }
  if (!last) return fresh
  const dt = Math.max(0, fix.time - last.time) / 1000
  if (
    dt * 1000 > STALE_MS ||
    (distanceMeters(last.lngLat, fix.lngLat) > JUMP_M && accuracy < JUMP_M / 2)
  ) {
    return fresh
  }
  // As fast as the device says one goes, or as the fix has moved
  const moved = dt > 0 ? distanceMeters(last.lngLat, fix.lngLat) / dt : 0
  const pace =
    fix.speed !== null && Number.isFinite(fix.speed) && fix.speed >= 0
      ? fix.speed
      : moved
  const wander = Math.max(WANDER_MPS, Math.min(pace, TOP_MPS))
  const variance = last.variance + dt * wander ** 2
  const gain = variance / (variance + accuracy ** 2)
  return {
    lngLat: [
      last.lngLat[0] + gain * (fix.lngLat[0] - last.lngLat[0]),
      last.lngLat[1] + gain * (fix.lngLat[1] - last.lngLat[1]),
    ],
    variance: (1 - gain) * variance,
    time: fix.time,
  }
}

/** How fast one is going, in metres a second: as the device says, or from
 *  how far the position moved, eased into the last so it doesn't jump. */
export function speedOf(
  last: { speed: number; at: Smoothed | null },
  fix: Fix,
  now: Smoothed,
): number {
  let speed = fix.speed
  if (speed === null || !Number.isFinite(speed) || speed < 0) {
    const dt = last.at ? (now.time - last.at.time) / 1000 : 0
    if (!last.at || dt <= 0) return last.speed
    speed = distanceMeters(last.at.lngLat, now.lngLat) / dt
  }
  return last.speed + (speed - last.speed) * 0.5
}
