import { describe, expect, it } from 'vitest'
import { tileBounds, tileKey, tilesCovering } from './tiles.ts'

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
