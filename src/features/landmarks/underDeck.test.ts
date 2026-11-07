import { featureFilter } from '@maplibre/maplibre-gl-style-spec'
import { describe, expect, it } from 'vitest'
import { DECK_LANDMARKS } from './deckLandmarks.ts'
import { clearUnderDecks } from './decks.ts'
import { offset } from './geometry.ts'

const Z = 14
const EXTENT = 8192
const bridge = DECK_LANDMARKS[0]
const { angle, from, to } = bridge.deck!

/** The z14 tile a point is in, and the point in that tile's units */
function tileOf([lng, lat]: [number, number]) {
  const n = 2 ** Z
  const x = ((lng + 180) / 360) * n
  const r = (lat * Math.PI) / 180
  const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n
  return { x: Math.floor(x), y: Math.floor(y), fx: x, fy: y }
}

/** Whether a line, given as metres along and across the deck, is kept */
function kept(
  points: [number, number][],
  brunnel?: string,
  options?: { bridgesOnly?: boolean },
) {
  const lngLats = points.map(([u, v]) =>
    offset(bridge.near, [
      u * Math.cos(angle) - v * Math.sin(angle),
      u * Math.sin(angle) + v * Math.cos(angle),
    ]),
  )
  const tile = tileOf(bridge.near)
  const geometry = [
    lngLats.map((p) => {
      const t = tileOf(p)
      return {
        x: Math.round((t.fx - tile.x) * EXTENT),
        y: Math.round((t.fy - tile.y) * EXTENT),
      }
    }),
  ]
  const filter = featureFilter(
    ['all', clearUnderDecks(DECK_LANDMARKS, options)] as never,
    'filter',
  )
  return filter.filter(
    { zoom: 16 },
    {
      type: 2,
      properties: brunnel ? { brunnel } : {},
      geometry,
    } as never,
    { z: Z, x: tile.x, y: tile.y } as never,
  )
}

describe('clearUnderDecks', () => {
  it('drops the bridge road the deck carries', () => {
    expect(
      kept(
        [
          [from + 10, 3],
          [to - 10, 3],
        ],
        'bridge',
      ),
    ).toBe(false)
    expect(
      kept(
        [
          [-100, -6],
          [100, -6],
        ],
        'bridge',
      ),
    ).toBe(false)
  })

  it('keeps the roads leading onto it, and anything not a bridge', () => {
    expect(
      kept(
        [
          [to + 5, 0],
          [to + 300, 0],
        ],
        'bridge',
      ),
    ).toBe(true)
    expect(
      kept(
        [
          [from - 300, 0],
          [from - 5, 0],
        ],
        'bridge',
      ),
    ).toBe(true)
    expect(
      kept([
        [-100, 0],
        [100, 0],
      ]),
    ).toBe(true)
  })

  it('keeps a bridge alongside, clear of the deck', () => {
    expect(
      kept(
        [
          [-100, 80],
          [100, 80],
        ],
        'bridge',
      ),
    ).toBe(true)
  })

  it('drops a road name along the deck, which has no bridge mark', () => {
    const names = { bridgesOnly: false }
    expect(
      kept(
        [
          [from - 200, 2],
          [to + 200, 2],
        ],
        undefined,
        names,
      ),
    ).toBe(false)
    expect(
      kept(
        [
          [to + 5, 0],
          [to + 300, 0],
        ],
        undefined,
        names,
      ),
    ).toBe(true)
  })
})
