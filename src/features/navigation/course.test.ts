import { describe, expect, it } from 'vitest'
import { prepareCourse, progressAt } from './course.ts'
import { DESTINATION, ROUTE, STOP } from './fixtures.ts'

const course = prepareCourse(ROUTE, [{ number: 1, lngLat: STOP }], DESTINATION)

describe('prepareCourse', () => {
  it('places each maneuver and stop along the line', () => {
    expect(course.turns.map(Math.round)).toEqual([0, 600, 1000, 1000, 1300])
    expect(course.stops).toHaveLength(1)
    expect(course.stops[0].along).toBeCloseTo(1000, 0)
  })

  it('numbers stops as planned on a route asked for again', () => {
    // Asked for again after the first stop, the second is its first
    const again = prepareCourse(
      ROUTE,
      [{ number: 2, lngLat: STOP }],
      DESTINATION,
    )
    expect(again.maneuvers[2]).toMatchObject({
      stop: 2,
      instruction: '2. durak sağınızda.',
      verbal: { alert: '2. durak sağınızda kalacak.' },
    })
    expect(again.stops[0].number).toBe(2)
  })
})

describe('progressAt', () => {
  it('starts with the first turn next', () => {
    const p = progressAt(course, 0)
    expect(p.next).toBe(1)
    expect(p.toNext).toBeCloseTo(600, 0)
    expect(p.meters).toBeCloseTo(1300, 0)
    expect(p.seconds).toBeCloseTo(130, 0)
  })

  it('counts what is left of the maneuver one is on at its pace', () => {
    const p = progressAt(course, 300)
    expect(p.toNext).toBeCloseTo(300, 0)
    expect(p.seconds).toBeCloseTo(30 + 40 + 30, 0)
  })

  it('moves on to the next once a turn is reached', () => {
    expect(progressAt(course, 596).next).toBe(2)
    expect(progressAt(course, 700).next).toBe(2)
    expect(progressAt(course, 700).toNext).toBeCloseTo(300, 0)
  })

  it('ends at the arrival', () => {
    const p = progressAt(course, 1300)
    expect(p.next).toBe(4)
    expect(p.toNext).toBeCloseTo(0, 1)
    expect(p.meters).toBeCloseTo(0, 1)
  })
})
