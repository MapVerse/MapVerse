import type { TravelMode } from '../directions/valhalla.ts'

/** How far the map leans while following, in degrees. */
export const FOLLOW_PITCH = 50

/** Zoom by speed, in metres a second: close in on foot, further out the
 *  faster one goes, to see the next turn coming in time. */
const ZOOMS: [speed: number, zoom: number][] = [
  [0, 18],
  [3, 17.6],
  [10, 16.8],
  [20, 16],
  [33, 15.2],
]

export function followZoom(speed: number, mode: TravelMode): number {
  // On foot the map need not pull out for a jog
  const at = mode === 'pedestrian' ? Math.min(speed, 3) : Math.max(0, speed)
  for (let i = 1; i < ZOOMS.length; i++) {
    const [s1, z1] = ZOOMS[i]
    if (at <= s1) {
      const [s0, z0] = ZOOMS[i - 1]
      return z0 + ((at - s0) / (s1 - s0)) * (z1 - z0)
    }
  }
  return ZOOMS[ZOOMS.length - 1][1]
}

/** A new way round, reached the short way from the last: from 350° to
 *  10° turns 20°, not 340° back. */
export function nearestBearing(from: number, to: number): number {
  const d = ((((to - from) % 360) + 540) % 360) - 180
  return from + d
}
