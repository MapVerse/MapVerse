import { describe, expect, it } from 'vitest'
import {
  bearing,
  measure,
  pointAlong,
  snap,
  splitAt,
  type LngLat,
} from './geometry.ts'

// About 111 m a thousandth of a degree north; east a little less, here
const M = 1 / 111_195
const east = (m: number, from: LngLat = [29, 41]): LngLat => [
  from[0] + (m * M) / Math.cos((from[1] * Math.PI) / 180),
  from[1],
]
const north = (m: number, from: LngLat = [29, 41]): LngLat => [
  from[0],
  from[1] + m * M,
]

// 200 m east, then 200 m north
const corner = east(200)
const line = measure([[29, 41], corner, north(200, corner)])

describe('measure', () => {
  it('measures along the line', () => {
    expect(line.along[1]).toBeCloseTo(200, 0)
    expect(line.length).toBeCloseTo(400, 0)
  })
})

describe('bearing', () => {
  it('is the way from one point to another, from north', () => {
    expect(bearing([29, 41], north(100))).toBeCloseTo(0, 1)
    expect(bearing([29, 41], east(100))).toBeCloseTo(90, 1)
    expect(bearing(east(100), [29, 41])).toBeCloseTo(270, 1)
  })
})

describe('snap', () => {
  it('finds the nearest place on the line, and how far along it is', () => {
    const s = snap(line, north(15, east(80)))
    expect(s.distance).toBeCloseTo(15, 0)
    expect(s.along).toBeCloseTo(80, 0)
    expect(s.segment).toBe(0)
    expect(s.bearing).toBeCloseTo(90, 0)
  })

  it('takes the second piece past the corner', () => {
    const s = snap(line, east(10, north(120, corner)))
    expect(s.segment).toBe(1)
    expect(s.along).toBeCloseTo(320, 0)
    expect(s.bearing).toBeCloseTo(0, 0)
  })

  it('keeps to where one was where the route passes twice', () => {
    // Out 2 km east and back along the same road
    const there = east(2000)
    const loop = measure([[29, 41], there, north(2, [29, 41])])
    const p = north(1, east(100))
    expect(snap(loop, p, { along: 90 }).along).toBeCloseTo(100, -1)
    expect(snap(loop, p, { along: 3880 }).along).toBeCloseTo(3900, -1)
  })

  it('goes elsewhere when that is clearly nearer', () => {
    const s = snap(line, east(5, north(180, corner)), { along: 20 })
    expect(s.segment).toBe(1)
  })
})

describe('pointAlong and splitAt', () => {
  it('finds the point a way along', () => {
    const p = pointAlong(line, 300)
    expect(snap(line, p).distance).toBeLessThan(0.5)
    expect(snap(line, p).along).toBeCloseTo(300, 0)
  })

  it('cuts the line in two at a point along it', () => {
    const [behind, ahead] = splitAt(line, 100)
    expect(behind).toHaveLength(2)
    expect(ahead).toHaveLength(3)
    expect(behind[1]).toEqual(ahead[0])
    expect(measure(behind).length).toBeCloseTo(100, 0)
    expect(measure(ahead).length).toBeCloseTo(300, 0)
  })

  it('keeps it whole at either end', () => {
    expect(splitAt(line, 0)).toEqual([[], line.points])
    expect(splitAt(line, 1000)).toEqual([line.points, []])
  })
})
