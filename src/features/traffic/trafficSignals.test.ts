import { describe, expect, it } from 'vitest'
import { buildSignalQuery, toTrafficSignal } from './trafficSignals.ts'

describe('buildSignalQuery', () => {
  it('asks for the lights at junctions and at crossings in each tile', () => {
    expect(buildSignalQuery([{ x: 9680, y: 6204 }])).toBe(
      '[out:json][timeout:20];(' +
        'node["highway"="traffic_signals"](39.96028,32.69531,39.97712,32.71729);' +
        'node["crossing"="traffic_signals"](39.96028,32.69531,39.97712,32.71729);' +
        ');out;',
    )
  })
})

describe('toTrafficSignal', () => {
  it('places a junction’s lights where OpenStreetMap has them', () => {
    expect(
      toTrafficSignal({
        type: 'node',
        id: 7,
        lat: 39.9703,
        lon: 32.7164,
        tags: { highway: 'traffic_signals' },
      }),
    ).toEqual({ id: 'node7', lngLat: [32.7164, 39.9703], crossing: false })
  })

  it('tells lights at a crossing from a junction’s', () => {
    expect(
      toTrafficSignal({
        type: 'node',
        id: 8,
        lat: 39.97,
        lon: 32.71,
        tags: { highway: 'crossing', crossing: 'traffic_signals' },
      })?.crossing,
    ).toBe(true)
  })

  it('skips anything without a place of its own', () => {
    expect(toTrafficSignal({ type: 'way', id: 9 })).toBeNull()
  })
})
