import { describe, expect, it } from 'vitest'
import {
  angleDelta,
  compassHeading,
  easeHeading,
  normalizeAngle,
  shouldTurn,
} from './heading.ts'

describe('normalizeAngle', () => {
  it('brings any angle into a turn', () => {
    expect(normalizeAngle(0)).toBe(0)
    expect(normalizeAngle(360)).toBe(0)
    expect(normalizeAngle(-90)).toBe(270)
    expect(normalizeAngle(725)).toBe(5)
  })
})

describe('angleDelta', () => {
  it('turns the short way round', () => {
    expect(angleDelta(10, 30)).toBe(20)
    expect(angleDelta(30, 10)).toBe(-20)
    expect(angleDelta(350, 10)).toBe(20)
    expect(angleDelta(10, 350)).toBe(-20)
    expect(angleDelta(0, 180)).toBe(180)
  })
})

describe('compassHeading', () => {
  it("takes Safari's compass heading as it is", () => {
    expect(
      compassHeading({ webkitCompassHeading: 75, alpha: 12, absolute: false }),
    ).toBe(75)
  })

  it('turns an absolute alpha, counterclockwise, into a heading', () => {
    expect(compassHeading({ alpha: 0, absolute: true })).toBe(0)
    expect(compassHeading({ alpha: 90, absolute: true })).toBe(270)
    expect(compassHeading({ alpha: 300, absolute: true })).toBe(60)
  })

  it('adds how far the screen is turned', () => {
    expect(compassHeading({ alpha: 0, absolute: true }, 90)).toBe(90)
    expect(
      compassHeading(
        { webkitCompassHeading: 300, alpha: null, absolute: false },
        90,
      ),
    ).toBe(30)
  })

  it('has nothing to say without a compass', () => {
    // Relative to how the device lay when the page opened
    expect(compassHeading({ alpha: 120, absolute: false })).toBeNull()
    // A desktop's empty reading
    expect(compassHeading({ alpha: null, absolute: true })).toBeNull()
    // Safari before the compass has settled
    expect(
      compassHeading({
        webkitCompassHeading: -1,
        alpha: null,
        absolute: false,
      }),
    ).toBeNull()
  })
})

describe('easeHeading', () => {
  it('starts at the first reading', () => {
    expect(easeHeading(null, 400, 0.2)).toBe(40)
  })

  it('eases the short way round, across north', () => {
    expect(easeHeading(350, 10, 0.5)).toBe(0)
    expect(easeHeading(10, 350, 0.25)).toBe(5)
  })
})

describe('shouldTurn', () => {
  const smooth = { minDegrees: 2, interval: 200 }

  it('turns for a real change, once in a while', () => {
    expect(shouldTurn(0, 10, 250, smooth)).toBe(true)
    expect(shouldTurn(355, 5, 250, smooth)).toBe(true)
  })

  it('lets small wobbles and quick repeats go', () => {
    expect(shouldTurn(0, 1, 250, smooth)).toBe(false)
    expect(shouldTurn(359, 0.5, 250, smooth)).toBe(false)
    expect(shouldTurn(0, 40, 100, smooth)).toBe(false)
  })
})
