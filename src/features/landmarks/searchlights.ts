import type { Tone } from './landmarks.ts'

const DEG = Math.PI / 180

/** The length of the whole way round the Earth, in metres, as the map has it. */
const EARTH_CIRCUMFERENCE = 2 * Math.PI * 6_371_008.8

const lerp = (from: number, to: number, t: number) => from + (to - from) * t

/** How long a searchlight takes to sweep once round the sky, in seconds. */
const SWEEP = 26
/** How long it takes to lean out and back, and to breathe, in seconds. */
const LEAN = 15
const BREATH = 6

/** How a searchlight stands at a time: where it points and how bright. */
export function pose(index: number, count: number, seconds: number) {
  const phase = (index / count) * 2 * Math.PI
  // Neighbours sweep opposite ways, so their beams cross
  const way = index % 2 ? 1 : -1
  const lean = 0.5 + 0.5 * Math.sin((2 * Math.PI * seconds) / LEAN + phase * 3)
  return {
    azimuth: phase + (way * 2 * Math.PI * seconds) / SWEEP,
    tilt: lerp(8, 40, lean) * DEG,
    brightness:
      0.85 + 0.15 * Math.sin((2 * Math.PI * seconds) / BREATH + phase),
  }
}

/**
 * Which way a beam points: metres east, north and up for each metre along
 * it, from its tilt off the vertical and its azimuth from east.
 */
export function aim(tilt: number, azimuth: number): [number, number, number] {
  return [
    Math.sin(tilt) * Math.cos(azimuth),
    Math.sin(tilt) * Math.sin(azimuth),
    Math.cos(tilt),
  ]
}

/**
 * A place on the map's unit square, `[0, 0]` at the top left of the world
 * and `[1, 1]` at the bottom right, and how long a metre is there on it.
 */
export function mercator(
  [lng, lat]: [number, number],
  metres = 0,
): { x: number; y: number; z: number; metre: number } {
  const metre = 1 / (EARTH_CIRCUMFERENCE * Math.cos(lat * DEG))
  return {
    x: (180 + lng) / 360,
    y:
      (180 -
        (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * DEG) / 2))) /
      360,
    z: metres * metre,
    metre,
  }
}

/** A point put through a column-major 4 × 4 matrix, to clip space. */
export function project(
  m: ArrayLike<number>,
  [x, y, z]: [number, number, number],
): [number, number, number, number] {
  return [0, 1, 2, 3].map(
    (i) => m[i] * x + m[4 + i] * y + m[8 + i] * z + m[12 + i],
  ) as [number, number, number, number]
}

/** The colours of the beams, as red, green and blue from 0 to 1. */
export const TONES: Record<Tone, [number, number, number]> = {
  white: [1, 0.95, 0.84],
  gold: [1, 0.78, 0.4],
  red: [1, 0.34, 0.26],
}
