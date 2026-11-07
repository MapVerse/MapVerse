import { describe, expect, it } from 'vitest'
import { distanceMeters } from '../place/place.ts'
import {
  greatCircle,
  measureFeatures,
  measureLine,
  pathLength,
  type LngLat,
} from './measure.ts'

const ISTANBUL: LngLat = [28.9784, 41.0082]
const ANKARA: LngLat = [32.8597, 39.9334]
const IZMIR: LngLat = [27.1428, 38.4237]

describe('pathLength', () => {
  it('is nothing for no point or one', () => {
    expect(pathLength([])).toBe(0)
    expect(pathLength([ISTANBUL])).toBe(0)
  })

  it('adds up each leg', () => {
    expect(pathLength([ISTANBUL, ANKARA, IZMIR])).toBeCloseTo(
      distanceMeters(ISTANBUL, ANKARA) + distanceMeters(ANKARA, IZMIR),
    )
    // Istanbul to Ankara as the crow flies is about 350 km
    expect(pathLength([ISTANBUL, ANKARA]) / 1000).toBeCloseTo(350, -1)
  })
})

describe('greatCircle', () => {
  it('starts and ends at the two points', () => {
    const line = greatCircle(ISTANBUL, ANKARA, 8)
    expect(line).toHaveLength(9)
    expect(line[0][0]).toBeCloseTo(ISTANBUL[0])
    expect(line[0][1]).toBeCloseTo(ISTANBUL[1])
    expect(line[8][0]).toBeCloseTo(ANKARA[0])
    expect(line[8][1]).toBeCloseTo(ANKARA[1])
  })

  it('cuts the way into even pieces, as long as the whole', () => {
    const line = greatCircle(ISTANBUL, ANKARA, 4)
    const pieces = line.slice(1).map((p, i) => distanceMeters(line[i], p))
    for (const piece of pieces) {
      expect(piece).toBeCloseTo(pieces[0], 0)
    }
    expect(pathLength(line)).toBeCloseTo(distanceMeters(ISTANBUL, ANKARA), 0)
  })

  it('bows towards the pole on a long way east', () => {
    // New York to Madrid: the shortest way runs north of both
    const line = greatCircle([-74, 40.7], [-3.7, 40.4], 10)
    expect(Math.max(...line.map((p) => p[1]))).toBeGreaterThan(45)
  })

  it('crosses the date line without going round the world', () => {
    const line = greatCircle([170, 0], [-170, 0], 4)
    expect(line.at(-1)![0]).toBeCloseTo(190)
    for (let i = 1; i < line.length; i++) {
      expect(Math.abs(line[i][0] - line[i - 1][0])).toBeLessThan(10)
    }
  })

  it('stays put between the same point', () => {
    expect(greatCircle(ISTANBUL, ISTANBUL, 4)).toEqual([ISTANBUL, ISTANBUL])
  })
})

describe('measureLine', () => {
  it('draws short legs straight', () => {
    const near: LngLat = [28.99, 41.01]
    expect(measureLine([ISTANBUL, near])).toEqual([ISTANBUL, near])
  })

  it('bends long legs, passing through every point of the path', () => {
    const line = measureLine([ISTANBUL, ANKARA, IZMIR])
    expect(line.length).toBeGreaterThan(3)
    expect(line[0]).toEqual(ISTANBUL)
    const near = (a: LngLat, b: LngLat) =>
      Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9
    expect(line.some((p) => near(p, ANKARA))).toBe(true)
    expect(near(line.at(-1)!, IZMIR)).toBe(true)
  })
})

describe('measureFeatures', () => {
  it('draws a line only from two points', () => {
    expect(measureFeatures([]).features).toEqual([])
    expect(measureFeatures([ISTANBUL]).features).toEqual([])
    const [line] = measureFeatures([ISTANBUL, ANKARA]).features
    expect(line.geometry.type).toBe('LineString')
  })
})
