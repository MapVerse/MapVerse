import { describe, expect, it } from 'vitest'
import {
  buildAreaQuery,
  tileBounds,
  tileKey,
  tilesCovering,
  toAreaName,
} from './areaNames.ts'

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

describe('buildAreaQuery', () => {
  it('asks for named residential and industrial areas in each tile', () => {
    expect(buildAreaQuery([{ x: 9680, y: 6204 }])).toBe(
      '[out:json][timeout:20];(wr["landuse"~"^(residential|industrial)$"]["name"](39.96028,32.69531,39.97712,32.71729););out center tags;',
    )
  })
})

describe('toAreaName', () => {
  it('labels an area at its centre, by its Turkish name if it has one', () => {
    expect(
      toAreaName({
        type: 'way',
        id: 5,
        center: { lat: 39.96, lon: 32.706 },
        tags: { landuse: 'residential', name: 'Yeşil Vadi Sitesi' },
      }),
    ).toEqual({
      id: 'way5',
      name: 'Yeşil Vadi Sitesi',
      lngLat: [32.706, 39.96],
    })
  })

  it('skips areas without a name or a centre', () => {
    expect(toAreaName({ type: 'way', id: 1, tags: { name: 'X' } })).toBeNull()
    expect(
      toAreaName({ type: 'way', id: 2, center: { lat: 0, lon: 0 }, tags: {} }),
    ).toBeNull()
  })
})
