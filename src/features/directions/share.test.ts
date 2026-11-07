import { describe, expect, it } from 'vitest'
import {
  decodeDirections,
  directionsUrl,
  encodeDirections,
  readDirectionsParam,
  type SharedDirections,
} from './share.ts'

const trip: SharedDirections = {
  points: [
    null,
    { name: 'Kızılay Meydanı, Çankaya', lngLat: [32.85412, 39.92077] },
    { name: 'Anıtkabir', lngLat: [32.83693, 39.92496] },
  ],
  mode: 'auto',
  avoid: { tolls: true, highways: false, ferries: true },
  when: { kind: 'arrive', at: '2026-11-08T09:00' },
}

// Plain ASCII, so btoa takes it as it is
const pack = (value: unknown) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_')

describe('encodeDirections', () => {
  it('round-trips the points, stops, mode, options and time', () => {
    expect(decodeDirections(encodeDirections(trip))).toEqual(trip)
  })

  it('keeps to characters safe in a link', () => {
    expect(encodeDirections(trip)).toMatch(/^[\w-]+$/)
  })

  it('rounds the coordinates to about a metre', () => {
    const decoded = decodeDirections(
      encodeDirections({
        ...trip,
        points: [
          { name: 'A', lngLat: [32.123456789, 39.987654321] },
          { name: 'B', lngLat: [32.5, 39.5] },
        ],
      }),
    )
    expect(decoded?.points[0]?.lngLat).toEqual([32.12346, 39.98765])
  })

  it('leaves out the time when leaving now', () => {
    const now = { ...trip, when: { kind: 'now' } } as const
    expect(decodeDirections(encodeDirections(now))?.when).toEqual({
      kind: 'now',
    })
  })
})

describe('decodeDirections', () => {
  it('turns down what is not shared directions', () => {
    expect(decodeDirections('')).toBeNull()
    expect(decodeDirections('not base64!')).toBeNull()
    expect(decodeDirections(pack({ p: 'x' }))).toBeNull()
    // Too few or too many points
    expect(decodeDirections(pack({ p: [[39, 32, 'A']], m: 'auto' }))).toBeNull()
    expect(
      decodeDirections(pack({ p: Array(6).fill([39, 32, 'A']), m: 'auto' })),
    ).toBeNull()
    // Off the earth
    expect(
      decodeDirections(
        pack({
          p: [
            [95, 32, 'A'],
            [39, 32, 'B'],
          ],
          m: 'auto',
        }),
      ),
    ).toBeNull()
    // Nowhere to go
    expect(
      decodeDirections(pack({ p: [[39, 32, 'A'], 0], m: 'auto' })),
    ).toBeNull()
  })

  it('makes do with an unknown mode, options or time', () => {
    const decoded = decodeDirections(
      pack({
        p: [0, [39.9, 32.8, '']],
        m: 'rocket',
        a: 42,
        w: ['d', '2026-02-30T09:00'],
      }),
    )
    expect(decoded).toEqual({
      points: [null, { name: 'Paylaşılan nokta', lngLat: [32.8, 39.9] }],
      mode: 'auto',
      avoid: { tolls: false, highways: false, ferries: false },
      when: { kind: 'now' },
    })
  })

  it('opens public transport as shared', () => {
    const transit = { ...trip, mode: 'transit' } as const
    expect(decodeDirections(encodeDirections(transit))?.mode).toBe('transit')
  })
})

describe('directionsUrl', () => {
  it('carries the directions in its query string', () => {
    const url = new URL(
      directionsUrl(trip, 'https://mapverse.github.io/MapVerse/'),
    )
    expect(url.pathname).toBe('/MapVerse/')
    expect(decodeDirections(url.searchParams.get('dir')!)).toEqual(trip)
  })
})

describe('readDirectionsParam', () => {
  it('takes the directions out, leaving the rest of the query', () => {
    const value = encodeDirections(trip)
    expect(readDirectionsParam(`?place=abc&dir=${value}`)).toEqual({
      directions: trip,
      rest: '?place=abc',
    })
    expect(readDirectionsParam(`?dir=${value}`).rest).toBe('')
  })

  it('leaves a query without directions as it is', () => {
    expect(readDirectionsParam('?place=abc')).toEqual({
      directions: null,
      rest: '?place=abc',
    })
    expect(readDirectionsParam('')).toEqual({ directions: null, rest: '' })
  })

  it('takes out a broken parameter too', () => {
    expect(readDirectionsParam('?dir=broken')).toEqual({
      directions: null,
      rest: '',
    })
  })
})
