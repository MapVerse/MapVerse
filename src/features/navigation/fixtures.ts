import type { Maneuver, Route } from '../directions/valhalla.ts'
import type { LngLat } from './geometry.ts'

// Test routes laid out in metres, on a grid near Istanbul

const M = 1 / 111_195
const COS = Math.cos((41 * Math.PI) / 180)

/** A point some metres east and north of the grid's corner. */
export const at = (x: number, y: number): LngLat => [
  29 + (x * M) / COS,
  41 + y * M,
]

const maneuver = (
  type: number,
  at: number,
  meters: number,
  instruction: string,
  extra: Partial<Maneuver> = {},
): Maneuver => ({
  instruction,
  type,
  meters,
  seconds: meters / 10,
  streets: [],
  at,
  ...extra,
})

/**
 * 600 m east along Birinci Sokak, left onto İkinci Sokak for 400 m north,
 * to a stop there, then 300 m on to the destination.
 */
export const ROUTE: Route = {
  meters: 1300,
  seconds: 130,
  shape: [at(0, 0), at(300, 0), at(600, 0), at(600, 400), at(600, 700)],
  maneuvers: [
    maneuver(1, 0, 600, 'Doğuya doğru ilerleyin.', {
      streets: ['Birinci Sokak'],
      verbal: { pre: 'Birinci Sokak caddesinde doğuya ilerleyin.' },
    }),
    maneuver(15, 2, 400, 'İkinci Sokak caddesine doğru sola dönün.', {
      streets: ['İkinci Sokak'],
      verbal: {
        alert: 'İkinci Sokak caddesine doğru sola dönün.',
        pre: 'İkinci Sokak caddesine doğru sola dönün.',
        post: '400 metre boyunca devam edin.',
      },
    }),
    maneuver(5, 3, 0, '1. durak sağınızda.', { stop: 1 }),
    maneuver(1, 3, 300, 'Kuzeye doğru ilerleyin.'),
    maneuver(4, 4, 0, 'Varış noktanıza ulaştınız.'),
  ],
}

export const STOP = at(600, 400)
export const DESTINATION = at(600, 700)
