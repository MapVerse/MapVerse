import { describe, expect, it } from 'vitest'
import { buildAreaQuery, toAreaName } from './areaNames.ts'

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
