import { describe, expect, it } from 'vitest'
import { parseAvoid } from './avoid.ts'
import { googleTransitUrl } from './transit.ts'
import {
  AVOID_NOTHING,
  buildRequest,
  parseRoutes,
  type RouteRequest,
  type ValhallaResponse,
} from './valhalla.ts'

const from: [number, number] = [32.85, 39.92]
const stop: [number, number] = [32.86, 39.93]
const to: [number, number] = [32.8, 39.95]

const base: RouteRequest = {
  points: [from, to],
  mode: 'auto',
  avoid: AVOID_NOTHING,
  when: { kind: 'now' },
}

describe('buildRequest', () => {
  it('asks for alternatives between two points, now', () => {
    expect(buildRequest(base)).toEqual({
      locations: [
        { lon: 32.85, lat: 39.92 },
        { lon: 32.8, lat: 39.95 },
      ],
      costing: 'auto',
      alternates: 2,
      directions_options: { units: 'kilometers', language: 'tr-TR' },
    })
  })

  it('goes through the stops in order, without alternatives', () => {
    const request = buildRequest({ ...base, points: [from, stop, to] })
    expect(request.locations).toEqual([
      { lon: 32.85, lat: 39.92 },
      { lon: 32.86, lat: 39.93 },
      { lon: 32.8, lat: 39.95 },
    ])
    expect(request).not.toHaveProperty('alternates')
  })

  it('keeps a car off tolls, motorways and ferries', () => {
    const avoid = { tolls: true, highways: true, ferries: true }
    expect(buildRequest({ ...base, avoid }).costing_options).toEqual({
      auto: { use_tolls: 0, use_highways: 0, use_ferry: 0 },
    })
    expect(
      buildRequest({ ...base, avoid: { ...AVOID_NOTHING, tolls: true } })
        .costing_options,
    ).toEqual({ auto: { use_tolls: 0 } })
  })

  it('keeps walking and cycling off ferries only', () => {
    const avoid = { tolls: true, highways: true, ferries: true }
    for (const mode of ['pedestrian', 'bicycle'] as const) {
      expect(buildRequest({ ...base, mode, avoid }).costing_options).toEqual({
        [mode]: { use_ferry: 0 },
      })
    }
    expect(
      buildRequest({
        ...base,
        mode: 'bicycle',
        avoid: { ...AVOID_NOTHING, tolls: true },
      }),
    ).not.toHaveProperty('costing_options')
  })

  it('leaves at or arrives by a time', () => {
    expect(
      buildRequest({
        ...base,
        when: { kind: 'depart', at: '2026-11-08T09:00' },
      }).date_time,
    ).toEqual({ type: 1, value: '2026-11-08T09:00' })
    expect(
      buildRequest({
        ...base,
        when: { kind: 'arrive', at: '2026-11-08T18:30' },
      }).date_time,
    ).toEqual({ type: 2, value: '2026-11-08T18:30' })
    expect(buildRequest(base)).not.toHaveProperty('date_time')
  })

  it('leads on the way the start is faced, when it is given', () => {
    const request = buildRequest({ ...base, heading: -90 })
    expect(request.locations[0]).toEqual({
      lon: 32.85,
      lat: 39.92,
      heading: 270,
      heading_tolerance: 45,
    })
    expect(request.locations[1]).toEqual({ lon: 32.8, lat: 39.95 })
  })
})

// Reference encoder, to build fixtures (precision 6)
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

describe('parseRoutes with stops', () => {
  // Two legs of two points each, as Valhalla gives them (precision 6)
  const leg = (shape: string, arrival: number, instruction: string) => ({
    shape,
    maneuvers: [
      {
        instruction: 'Kuzeye doğru ilerleyin.',
        type: 1,
        length: 1,
        time: 60,
        begin_shape_index: 0,
      },
      { instruction, type: arrival, length: 0, time: 0, begin_shape_index: 1 },
    ],
  })
  const data: ValhallaResponse = {
    trip: {
      summary: { length: 2, time: 120 },
      locations: [
        { date_time: '2026-11-08T08:27' },
        { date_time: '2026-11-08T08:35' },
        { date_time: '2026-11-08T09:00' },
      ],
      legs: [
        leg(encode([from, stop]), 5, 'Hedefiniz sağda.'),
        leg(encode([stop, to]), 4, 'Hedefinize vardınız.'),
      ],
    },
  }

  it('tells the arrival at a stop from the arrival at the end', () => {
    const [route] = parseRoutes(data)
    const arrivals = route.maneuvers.filter((m) => [4, 5, 6].includes(m.type))
    expect(arrivals.map((m) => [m.instruction, m.stop])).toEqual([
      ['1. durak sağınızda.', 1],
      ['Hedefinize vardınız.', undefined],
    ])
  })

  it("places each leg's maneuvers along the whole route", () => {
    const [route] = parseRoutes(data)
    expect(route.shape).toHaveLength(4)
    expect(route.maneuvers.map((m) => m.at)).toEqual([0, 1, 2, 3])
  })

  it('says the arrival at a stop aloud as it is written', () => {
    const [route] = parseRoutes(data)
    expect(route.maneuvers[1].verbal).toEqual({
      alert: '1. durak sağınızda kalacak.',
      pre: '1. durak sağınızda.',
    })
    expect(route.maneuvers[0].verbal).toBeUndefined()
  })

  it('takes the clock times it leaves and arrives at', () => {
    const [route] = parseRoutes(data)
    expect(route.departs).toBe('2026-11-08T08:27')
    expect(route.arrives).toBe('2026-11-08T09:00')
  })
})

describe('parseRoutes aloud', () => {
  it("takes Valhalla's spoken instructions", () => {
    const [route] = parseRoutes({
      trip: {
        summary: { length: 1, time: 60 },
        legs: [
          {
            shape: encode([from, to]),
            maneuvers: [
              {
                instruction: 'Sağa dönün.',
                type: 10,
                length: 1,
                time: 60,
                verbal_transition_alert_instruction: 'Sağa dönün.',
                verbal_pre_transition_instruction:
                  'Atatürk Bulvarı caddesine sağa dönün.',
                verbal_post_transition_instruction:
                  '1 kilometre boyunca devam edin.',
              },
            ],
          },
        ],
      },
    })
    expect(route.maneuvers[0].verbal).toEqual({
      alert: 'Sağa dönün.',
      pre: 'Atatürk Bulvarı caddesine sağa dönün.',
      post: '1 kilometre boyunca devam edin.',
    })
  })
})

describe('parseAvoid', () => {
  it('reads the roads kept off, and nothing from anything else', () => {
    expect(parseAvoid('{"tolls":true,"ferries":true}')).toEqual({
      tolls: true,
      highways: false,
      ferries: true,
    })
    expect(parseAvoid(null)).toEqual(AVOID_NOTHING)
    expect(parseAvoid('{oops')).toEqual(AVOID_NOTHING)
    expect(parseAvoid('{"tolls":"yes"}')).toEqual(AVOID_NOTHING)
  })
})

describe('googleTransitUrl', () => {
  it('opens the trip by public transport in Google Maps', () => {
    const url = new URL(googleTransitUrl(from, to))
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      api: '1',
      origin: '39.92,32.85',
      destination: '39.95,32.8',
      travelmode: 'transit',
    })
  })

  it('leaves from where the opener is without a start', () => {
    const url = new URL(googleTransitUrl(null, to))
    expect(url.searchParams.has('origin')).toBe(false)
    expect(url.searchParams.get('destination')).toBe('39.95,32.8')
  })
})
