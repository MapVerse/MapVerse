import { describe, expect, it } from 'vitest'
import {
  TILE_ZOOM,
  tileBounds,
  tileDistance,
  tileKey,
  tilePosition,
  tilesCovering,
} from './tiles.ts'

describe('tiles', () => {
  it('covers a box with z14 tiles, nearest its centre first', () => {
    // Around Ankara, Etimesgut
    const tiles = tilesCovering([32.69, 39.955, 32.72, 39.965])
    expect(tiles.map(tileKey)).toEqual([
      '9680/6204',
      '9680/6205',
      '9679/6204',
      '9679/6205',
      '9681/6204',
      '9681/6205',
    ])
  })

  it('gives each tile its west, south, east and north edges', () => {
    const [w, s, e, n] = tileBounds({ x: 9680, y: 6204 })
    expect(w).toBeCloseTo(32.69531, 5)
    expect(s).toBeCloseTo(39.96028, 5)
    expect(e).toBeCloseTo(32.71729, 5)
    expect(n).toBeCloseTo(39.97712, 5)
  })
})

describe('tiles at the edges of the world', () => {
  const n = 2 ** TILE_ZOOM

  it('wraps tiles past the antimeridian back into the world', () => {
    // A view over Fiji, with the map showing the next world copy east
    const tiles = tilesCovering([179.99, -17, 180.03, -16.99])
    const xs = new Set(tiles.map((t) => t.x))
    expect(xs).toEqual(new Set([n - 1, 0, 1]))
    for (const tile of tiles) {
      const [w, s, e, nn] = tileBounds(tile)
      expect(w).toBeGreaterThanOrEqual(-180)
      expect(e).toBeLessThanOrEqual(180)
      expect(w).toBeLessThan(e)
      expect(s).toBeLessThan(nn)
    }
  })

  it('wraps a view wholly in a world copy', () => {
    const copy = tilesCovering([32.69 + 360, 39.955, 32.72 + 360, 39.965])
    expect(copy.map(tileKey)).toEqual(
      tilesCovering([32.69, 39.955, 32.72, 39.965]).map(tileKey),
    )
  })

  it('covers each tile once however many world copies show', () => {
    const tiles = tilesCovering([-540, 0.001, 540, 0.002])
    expect(tiles).toHaveLength(n)
    expect(new Set(tiles.map(tileKey)).size).toBe(n)
  })

  it('keeps latitudes within Web Mercator', () => {
    const tiles = tilesCovering([0, -90, 0.01, -89])
    expect(tiles.map((t) => t.y)).toEqual([n - 1])
    const [, s, , north] = tileBounds({ x: 0, y: n - 1 })
    expect(s).toBeCloseTo(-85.0511, 3)
    expect(north).toBeLessThan(0)
    expect(tilesCovering([0, 89, 0.01, 90]).map((t) => t.y)).toEqual([0])
  })

  it('orders by a given centre, the short way round', () => {
    const [first] = tilesCovering([179.9, 0, 180.1, 0.01], [-179.95, 0.005])
    expect(first.x).toBe(tilePosition(-179.95, 0).x | 0)
    expect(tileDistance({ x: 0.5, y: 0 }, { x: n - 0.5, y: 0 })).toBe(1)
  })
})
