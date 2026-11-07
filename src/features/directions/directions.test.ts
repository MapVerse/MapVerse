import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  decodePolyline6,
  formatArrival,
  formatDuration,
  maneuverIcon,
  routeLabels,
  routeVia,
  shapeBounds,
} from './directions.ts'
import {
  AVOID_NOTHING,
  getRoutes,
  NoRouteError,
  noRouteReason,
  parseRoutes,
  type Route,
} from './valhalla.ts'

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
    expect(formatArrival(60 * 60 * 14, now)).toBe('23:47')
  })

  it('marks an arrival on a later day', () => {
    const now = new Date(2026, 8, 30, 9, 47)
    expect(formatArrival(60 * 60 * 15, now)).toBe('00:47 (+1 gün)')
    expect(formatArrival(60 * 60 * 24, now)).toBe('09:47 (+1 gün)')
    expect(formatArrival(60 * 60 * 62, now)).toBe('23:47 (+2 gün)')
    // Just before midnight, a few minutes on is already tomorrow
    expect(formatArrival(5 * 60, new Date(2026, 8, 30, 23, 58))).toBe(
      '00:03 (+1 gün)',
    )
  })
})

describe('shapeBounds', () => {
  it('finds the corners round a line', () => {
    expect(shapeBounds(line)).toEqual([
      [28.9612, 41.0082],
      [28.977, 41.035],
    ])
    expect(shapeBounds([])).toBeNull()
  })

  it('copes with a very long route', () => {
    const shape = Array.from(
      { length: 300_000 },
      (_, i) => [29 + i / 1e6, 41 - i / 1e6] as [number, number],
    )
    expect(shapeBounds(shape)).toEqual([
      [29, 41 - 299_999 / 1e6],
      [29 + 299_999 / 1e6, 41],
    ])
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

describe('noRouteReason', () => {
  it("reads why there is no route from Valhalla's error code", () => {
    const body = (code: number) =>
      JSON.stringify({ error_code: code, error: '', status_code: 400 })
    expect(noRouteReason(body(154))).toBe('too-far')
    expect(noRouteReason(body(171))).toBe('off-road')
    expect(noRouteReason(body(442))).toBe('none')
    expect(noRouteReason('Bad Request')).toBe('none')
  })
})

describe('getRoutes', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('rejects a 400 with the reason there is no route', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error_code: 154 }), { status: 400 }),
      ),
    )
    const error = await getRoutes({
      points: [
        [29, 41],
        [32.8, 39.9],
      ],
      mode: 'pedestrian',
      avoid: AVOID_NOTHING,
      when: { kind: 'now' },
    }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(NoRouteError)
    expect((error as NoRouteError).reason).toBe('too-far')
  })
})
