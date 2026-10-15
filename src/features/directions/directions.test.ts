import { describe, expect, it } from 'vitest'
import {
  decodePolyline6,
  formatArrival,
  formatDuration,
  maneuverIcon,
  routeLabels,
  routeVia,
} from './directions.ts'
import { parseRoutes, type Route } from './valhalla.ts'

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
      streets: [],
      at: 0,
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

describe('formatArrival', () => {
  it('adds the travel time to the clock', () => {
    const now = new Date(2026, 8, 30, 9, 47)
    expect(formatArrival(1020, now)).toBe('10:04')
    expect(formatArrival(60 * 60 * 15, now)).toBe('00:47')
  })
})

describe('maneuverIcon', () => {
  it('maps turns to icons and falls back to straight ahead', () => {
    expect(maneuverIcon(10)).toBe('right')
    expect(maneuverIcon(15)).toBe('left')
    expect(maneuverIcon(26)).toBe('roundabout')
    expect(maneuverIcon(8)).toBe('straight')
  })
})

describe('routes of several legs', () => {
  it('count where each maneuver starts along the whole route', () => {
    const leg = (instruction: string) => ({
      shape: encode(line),
      maneuvers: [
        {
          instruction,
          type: 10,
          length: 1,
          time: 60,
          street_names: ['Barbaros Bulvarı'],
          begin_shape_index: 1,
        },
      ],
    })
    const [route] = parseRoutes({
      trip: {
        summary: { length: 2, time: 120 },
        legs: [leg('Birinci'), leg('İkinci')],
      },
    })
    expect(route.shape).toHaveLength(6)
    expect(route.maneuvers.map((m) => m.at)).toEqual([1, 4])
    expect(route.maneuvers[0].streets).toEqual(['Barbaros Bulvarı'])
  })
})

const route = (meters: number, streets: [string, number][]): Route => ({
  meters,
  seconds: meters / 10,
  shape: [],
  maneuvers: streets.map(([street, m], at) => ({
    instruction: '',
    type: 10,
    meters: m,
    seconds: m / 10,
    streets: street ? [street] : [],
    at,
  })),
})

describe('routeVia', () => {
  it('names the street the route runs along furthest, in total', () => {
    expect(
      routeVia(
        route(3000, [
          ['Cumhuriyet Caddesi', 400],
          ['Dolmabahçe Caddesi', 900],
          ['Barbaros Bulvarı', 700],
          ['Dolmabahçe Caddesi', 600],
          ['', 400],
        ]),
      ),
    ).toBe('Dolmabahçe Caddesi')
    expect(routeVia(route(100, [['', 100]]))).toBeUndefined()
  })
})

describe('routeLabels', () => {
  it('suggests the first route, and marks a clearly shorter other', () => {
    expect(
      routeLabels([route(3000, []), route(2600, []), route(3400, [])]),
    ).toEqual(['Önerilen', 'Daha kısa', undefined])
    expect(routeLabels([route(3000, []), route(2950, [])])).toEqual([
      'Önerilen',
      undefined,
    ])
    expect(routeLabels([route(3000, [])])).toEqual([undefined])
  })
})
