import { describe, expect, it } from 'vitest'
import { followZoom, nearestBearing } from './camera.ts'
import { at } from './fixtures.ts'
import { distanceMeters } from '../place/place.ts'
import { smooth, speedOf, type Fix } from './smoothing.ts'

const fix = (x: number, y: number, accuracy: number, time: number): Fix => ({
  lngLat: at(x, y),
  accuracy,
  heading: null,
  speed: null,
  time,
})

describe('smooth', () => {
  it('starts where the first fix is', () => {
    const s = smooth(null, fix(0, 0, 10, 0))
    expect(s.lngLat).toEqual(at(0, 0))
    expect(s.variance).toBe(100)
  })

  it('moves little for a vague fix, and far for a sharp one', () => {
    const start = smooth(null, fix(0, 0, 5, 0))
    // Standing still, as the device says
    const still = (f: Fix) => ({ ...f, speed: 0 })
    const vague = smooth(start, still(fix(0, 50, 80, 1000)))
    const sharp = smooth(start, still(fix(0, 50, 3, 1000)))
    expect(distanceMeters(at(0, 0), vague.lngLat)).toBeLessThan(5)
    expect(distanceMeters(at(0, 0), sharp.lngLat)).toBeGreaterThan(35)
  })

  it('keeps up on the move', () => {
    const start = smooth(null, fix(0, 0, 10, 0))
    const moving = smooth(start, { ...fix(0, 15, 10, 1000), speed: 15 })
    expect(distanceMeters(at(0, 15), moving.lngLat)).toBeLessThan(4)
  })

  it('starts afresh after a long gap or a sure jump', () => {
    const start = smooth(null, fix(0, 0, 5, 0))
    expect(smooth(start, fix(0, 400, 10, 1000)).lngLat).toEqual(at(0, 400))
    expect(smooth(start, fix(0, 30, 60, 60_000)).lngLat).toEqual(at(0, 30))
  })
})

describe('speedOf', () => {
  it("takes the device's speed, eased in", () => {
    const now = smooth(null, fix(0, 0, 5, 0))
    expect(
      speedOf({ speed: 0, at: null }, { ...fix(0, 0, 5, 0), speed: 10 }, now),
    ).toBe(5)
  })

  it('works it out from the way moved when the device does not say', () => {
    const a = smooth(null, fix(0, 0, 3, 0))
    const b = { lngLat: at(0, 20), variance: 9, time: 2000 }
    expect(speedOf({ speed: 10, at: a }, fix(0, 20, 3, 2000), b)).toBeCloseTo(
      10,
      0,
    )
  })
})

describe('camera', () => {
  it('zooms out the faster one goes', () => {
    expect(followZoom(0, 'auto')).toBe(18)
    expect(followZoom(15, 'auto')).toBeCloseTo(16.4, 1)
    expect(followZoom(50, 'auto')).toBe(15.2)
    expect(followZoom(5, 'pedestrian')).toBe(followZoom(3, 'auto'))
  })

  it('turns the short way round', () => {
    expect(nearestBearing(350, 10)).toBe(370)
    expect(nearestBearing(10, 350)).toBe(-10)
    expect(nearestBearing(-10, 90)).toBe(90)
  })
})
