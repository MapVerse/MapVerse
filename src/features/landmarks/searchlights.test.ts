import { describe, expect, it } from 'vitest'
import { LANDMARKS } from './catalog.ts'
import { TONES, aim, mercator, pose, project } from './searchlights.ts'

describe('searchlights', () => {
  it('point their beams up, leaning out between 8° and 40°', () => {
    for (let seconds = 0; seconds < 60; seconds += 0.7) {
      const { tilt } = pose(3, 8, seconds)
      expect(tilt).toBeGreaterThanOrEqual((8 * Math.PI) / 180 - 1e-9)
      expect(tilt).toBeLessThanOrEqual((40 * Math.PI) / 180 + 1e-9)
      const [east, north, up] = aim(tilt, pose(3, 8, seconds).azimuth)
      expect(Math.hypot(east, north, up)).toBeCloseTo(1, 9)
      expect(up).toBeGreaterThan(0.7)
    }
  })

  it('sweep round the sky, neighbours turning opposite ways', () => {
    const turn = (i: number) => pose(i, 8, 1).azimuth - pose(i, 8, 0).azimuth
    expect(turn(0)).toBeLessThan(0)
    expect(turn(1)).toBeGreaterThan(0)
    expect(Math.abs(turn(0))).toBeCloseTo(Math.abs(turn(1)), 9)
  })

  it('keep still when time stands still', () => {
    expect(pose(2, 8, 0)).toEqual(pose(2, 8, 0))
  })

  it('stand round RAMS Park, mostly white, with gold and red', () => {
    const lights = LANDMARKS.find((l) => l.id === 'rams-park')!.searchlights!
    expect(lights).toHaveLength(8)
    const tones = lights.map(({ tone }) => tone)
    expect(tones.filter((t) => t === 'white')).toHaveLength(4)
    expect(new Set(tones)).toEqual(new Set(Object.keys(TONES)))
    // Out on the plaza, beyond the façade
    for (const { at } of lights) expect(Math.hypot(...at)).toBeGreaterThan(95)
  })
})

describe('mercator', () => {
  it('puts the meeting of the equator and Greenwich in the middle', () => {
    const { x, y, metre } = mercator([0, 0])
    expect(x).toBeCloseTo(0.5, 12)
    expect(y).toBeCloseTo(0.5, 12)
    expect(1 / metre).toBeCloseTo(2 * Math.PI * 6_371_008.8, 3)
  })

  it('runs east to the right and north upwards, metres longer further north', () => {
    const here = mercator([29, 41.1], 10)
    const east = mercator([29.001, 41.1])
    const north = mercator([29, 41.101])
    expect(east.x).toBeGreaterThan(here.x)
    expect(north.y).toBeLessThan(here.y)
    expect(here.z).toBeCloseTo(10 * here.metre, 15)
    expect(here.metre).toBeGreaterThan(mercator([29, 0]).metre)
  })
})

describe('project', () => {
  it('puts a point through a column-major matrix', () => {
    // Scale x by 2, move y by 3, and keep w at 1
    const m = [2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 3, 0, 1]
    expect(project(m, [1, 1, 1])).toEqual([2, 4, 1, 1])
  })
})
