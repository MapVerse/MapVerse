import { describe, expect, it } from 'vitest'
import { prepareCourse } from './course.ts'
import { at, DESTINATION, ROUTE, STOP } from './fixtures.ts'
import type { LngLat } from './geometry.ts'
import {
  advance,
  isOffRoute,
  mayReroute,
  rejoin,
  remaining,
  startNavigation,
  type Navigation,
} from './session.ts'
import type { Fix } from './smoothing.ts'

const course = () =>
  prepareCourse(ROUTE, [{ number: 1, lngLat: STOP }], DESTINATION)

let clock = 0
const fix = (lngLat: LngLat, accuracy = 5): Fix => ({
  lngLat,
  accuracy,
  heading: null,
  speed: 10,
  time: (clock += 10_000),
})

/** Drives along a list of points, a fix at each. */
const drive = (nav: Navigation, points: LngLat[], accuracy?: number) =>
  points.reduce((n, p) => advance(n, fix(p, accuracy)), nav)

describe('advance', () => {
  it('follows the route, drawn on it, turned along it', () => {
    const nav = drive(startNavigation(course()), [at(0, 3), at(100, 4)])
    expect(nav.onRoute).toBe(true)
    expect(nav.position![1]).toBeCloseTo(at(0, 0)[1], 6)
    expect(nav.along).toBeGreaterThan(50)
    expect(nav.heading).toBeCloseTo(90, 0)
    expect(nav.progress.next).toBe(1)
  })

  it('moves on past a turn, and not back for a wobble', () => {
    let nav = drive(startNavigation(course()), [
      at(400, 0),
      at(500, 0),
      at(600, 0),
      at(602, 60),
      at(600, 120),
    ])
    expect(nav.progress.next).toBe(2)
    expect(nav.heading).toBeCloseTo(0, 0)
    // Fixes falling back along the road leave it where it was
    const along = nav.along
    nav = drive(nav, [at(600, 40), at(600, 20), at(600, 10)])
    expect(nav.along).toBeGreaterThanOrEqual(along)
    expect(nav.progress.next).toBe(2)
  })

  it('reaches the stop, then the destination', () => {
    let nav = drive(startNavigation(course()), [
      at(200, 0),
      at(400, 0),
      at(600, 0),
      at(600, 200),
      at(600, 380),
    ])
    expect(nav.reached).toEqual([1])
    expect(nav.arrived).toBe(false)
    nav = drive(nav, [at(600, 500), at(600, 600), at(600, 690), at(600, 700)])
    expect(nav.arrived).toBe(true)
  })

  it('smooths a fix that jumps about', () => {
    const steady = drive(startNavigation(course()), [at(100, 0), at(110, 0)])
    // A wide, wild fix 60 m off barely moves it
    const nav = advance(steady, fix(at(120, 60), 60))
    expect(nav.onRoute).toBe(true)
    expect(nav.offFixes).toBe(0)
  })
})

describe('off the route', () => {
  it('is off after a few sure fixes away from it', () => {
    let nav = drive(startNavigation(course()), [at(100, 0), at(200, 0)])
    nav = drive(nav, [at(250, 80), at(260, 120)])
    expect(isOffRoute(nav)).toBe(false)
    nav = drive(nav, [at(270, 160), at(280, 200)])
    expect(isOffRoute(nav)).toBe(true)
    expect(nav.onRoute).toBe(false)
  })

  it('is not, on fixes too vague to tell', () => {
    let nav = drive(startNavigation(course()), [at(100, 0), at(200, 0)])
    nav = drive(nav, [at(250, 90), at(260, 95), at(270, 90), at(280, 95)], 150)
    expect(isOffRoute(nav)).toBe(false)
  })

  it('asks again at most every 15 s', () => {
    expect(mayReroute(null, 0)).toBe(true)
    expect(mayReroute(1000, 10_000)).toBe(false)
    expect(mayReroute(1000, 16_000)).toBe(true)
  })

  it('asks for the stops left and the destination, and goes on from there', () => {
    let nav = drive(startNavigation(course()), [at(100, 0)])
    expect(remaining(nav).stops).toEqual([{ number: 1, lngLat: STOP }])
    nav = drive(nav, [at(400, 0), at(600, 0), at(600, 300), at(600, 400)])
    expect(remaining(nav).stops).toEqual([])
    expect(remaining(nav).destination).toEqual(DESTINATION)

    const again = rejoin(
      { ...nav, offFixes: 5 },
      prepareCourse(ROUTE, [], DESTINATION),
    )
    expect(again.offFixes).toBe(0)
    expect(again.reached).toEqual([1])
    expect(again.position).not.toBeNull()
  })
})
