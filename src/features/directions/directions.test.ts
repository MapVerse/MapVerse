import { describe, expect, it } from 'vitest'
import { decodePolyline6, formatDuration, maneuverArrow } from './directions.ts'
import { parseRoutes } from './valhalla.ts'

// Reference encoder, to build fixtures
function encode(points: [number, number][]): string {
  let out = ''
  let prev = [0, 0]
  for (const [lng, lat] of points) {
    const next = [Math.round(lat * 1e6), Math.round(lng * 1e6)]
    for (const axis of [0, 1]) {
      let value = next[axis] - prev[axis]
      value = value < 0 ? ~(value << 1) : value << 1
      while (value >= 0x20) {
        out += String.fromCharCode((0x20 | (value & 0x1f)) + 63)
        value >>= 5
      }
      out += String.fromCharCode(value + 63)
    }
    prev = next
  }
  return out
}

const line: [number, number][] = [
  [28.974101, 41.025601],
  [28.977, 41.035],
  [28.9612, 41.0082],
]

describe('decodePolyline6', () => {
  it('round-trips [lng, lat] points at six decimals', () => {
    expect(decodePolyline6(encode(line))).toEqual(line)
  })
})

describe('parseRoutes', () => {
  it('turns the trip and its alternates into routes in metres', () => {
    const trip = (km: number, seconds: number) => ({
      summary: { length: km, time: seconds },
      legs: [
        {
          shape: encode(line),
          maneuvers: [
            {
              instruction: 'Kuzeye doğru ilerleyin.',
              type: 1,
              length: km,
              time: seconds,
            },
            {
              instruction: 'Hedefinize ulaştınız.',
              type: 4,
              length: 0,
              time: 0,
            },
          ],
        },
      ],
    })
    const routes = parseRoutes({
      trip: trip(7.4, 1080),
      alternates: [{ trip: trip(6.9, 1260) }],
    })
    expect(routes).toHaveLength(2)
    expect(routes[0]).toMatchObject({
      meters: 7400,
      seconds: 1080,
      shape: line,
    })
    expect(routes[0].maneuvers[0]).toEqual({
      instruction: 'Kuzeye doğru ilerleyin.',
      type: 1,
      meters: 7400,
      seconds: 1080,
    })
    expect(routes[1].meters).toBeCloseTo(6900)
  })
})

describe('formatDuration', () => {
  it('shows minutes, then hours and minutes', () => {
    expect(formatDuration(20)).toBe('1 dk')
    expect(formatDuration(1080)).toBe('18 dk')
    expect(formatDuration(3900)).toBe('1 sa 5 dk')
    expect(formatDuration(7200)).toBe('2 sa')
  })
})

describe('maneuverArrow', () => {
  it('maps turns to arrows and falls back to straight ahead', () => {
    expect(maneuverArrow(10)).toBe('→')
    expect(maneuverArrow(15)).toBe('←')
    expect(maneuverArrow(8)).toBe('↑')
  })
})
