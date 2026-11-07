import { isTurkishHoliday, type HolidayCheck } from './openingHours.ts'

/*
 * Which time zone a place keeps, without a full map of the world's zones
 * (megabytes, for a map used mostly in Turkey): Turkey, and Northern
 * Cyprus, are told apart by rough outlines; anywhere else is taken to keep
 * the device's own time, which is right for a reader looking round where
 * they are and may be off by hours for a place far away.
 */

type Ring = [lng: number, lat: number][]

/**
 * Turkey, roughly: its land borders, and out to sea round its coasts,
 * passing between the coast and the nearest Greek islands.
 */
const TURKEY: Ring = [
  [26.03, 40.73],
  [26.35, 41.25],
  [26.6, 41.6],
  [26.32, 41.75],
  [26.6, 41.97],
  [27.6, 42.0],
  [28.05, 42.05],
  [29.5, 41.5],
  [31.5, 41.6],
  [33.5, 42.1],
  [35.2, 42.15],
  [36.5, 41.8],
  [38.5, 41.3],
  [40.5, 41.6],
  [41.55, 41.55],
  [42.8, 41.6],
  [43.47, 41.12],
  [43.6, 40.75],
  [43.7, 40.1],
  [44.4, 40.0],
  [44.8, 39.65],
  [44.4, 39.4],
  [44.2, 39.0],
  [44.3, 38.4],
  [44.2, 37.9],
  [44.6, 37.4],
  [44.79, 37.15],
  [44.3, 37.05],
  [43.4, 37.3],
  [42.36, 37.11],
  [41.2, 37.07],
  [40.0, 36.85],
  [39.0, 36.68],
  [38.0, 36.82],
  [37.0, 36.65],
  [36.65, 36.8],
  [36.55, 36.25],
  [36.15, 35.85],
  [35.92, 35.92],
  [35.6, 36.3],
  [35.0, 36.25],
  [33.5, 35.95],
  [32.5, 36.0],
  [31.5, 36.5],
  [30.6, 36.1],
  [29.6, 36.1],
  [29.0, 36.45],
  [28.3, 36.6],
  [27.5, 36.95],
  [27.2, 37.15],
  [27.2, 37.6],
  [26.6, 38.0],
  [26.3, 38.2],
  [26.25, 38.6],
  [26.6, 39.0],
  [26.05, 39.55],
  [25.6, 40.1],
  [25.6, 40.35],
  [26.0, 40.5],
]

/** Northern Cyprus, north of the Green Line, roughly. */
const NORTHERN_CYPRUS: Ring = [
  [32.7, 35.2],
  [32.9, 35.42],
  [34.6, 35.75],
  [34.0, 35.05],
  [33.75, 35.08],
  [33.35, 35.17],
  [33.0, 35.15],
]

/** Whether a point lies in a ring (even-odd rule). */
function inside([x, y]: [number, number], ring: Ring) {
  let hit = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      hit = !hit
    }
  }
  return hit
}

/** Whether a point is in Turkey, roughly. */
export const inTurkey = (lng: number, lat: number) => inside([lng, lat], TURKEY)

/**
 * The IANA time zone a point keeps: Turkey's, Northern Cyprus's (which
 * keeps Eastern European time, with summer time, as tzdata has it), or
 * else, not being known here, undefined for the device's own.
 */
export function timeZoneAt(lng: number, lat: number): string | undefined {
  if (inTurkey(lng, lat)) return 'Europe/Istanbul'
  if (inside([lng, lat], NORTHERN_CYPRUS)) return 'Asia/Famagusta'
  return undefined
}

/**
 * How to tell a public holiday where a point is: Turkey's fixed-date
 * national holidays there; elsewhere, not known.
 */
export const holidaysAt = (
  lng: number,
  lat: number,
): HolidayCheck | undefined =>
  inTurkey(lng, lat) ? isTurkishHoliday : undefined
