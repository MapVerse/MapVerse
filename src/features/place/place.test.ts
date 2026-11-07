import { describe, expect, it } from 'vitest'
import { categoryInfo, categoryLabel, labelColor } from './categories.ts'
import { distanceMeters, formatDistance } from './place.ts'
import { findPoiLayerIds } from './poi.ts'

describe('formatDistance', () => {
  it('uses metres nearby and Turkish-formatted kilometres further out', () => {
    expect(formatDistance(846)).toBe('850 m')
    expect(formatDistance(2345)).toBe('2,3 km')
    expect(formatDistance(351_400)).toBe('351 km')
  })

  it('switches to kilometres once metres would round up to 1000', () => {
    expect(formatDistance(994)).toBe('990 m')
    expect(formatDistance(995)).toBe('1,0 km')
    expect(formatDistance(999)).toBe('1,0 km')
    expect(formatDistance(1000)).toBe('1,0 km')
    expect(formatDistance(9_960)).toBe('10 km')
  })
})

describe('distanceMeters', () => {
  it('measures the great-circle distance', () => {
    const istanbulToAnkara = distanceMeters(
      [28.9784, 41.0082],
      [32.8597, 39.9334],
    )
    expect(istanbulToAnkara / 1000).toBeCloseTo(350, -1)
  })
})

describe('categoryLabel', () => {
  it('prefers the first known key and humanizes unknown ones', () => {
    expect(categoryLabel('bicycle', 'shop')).toBe('Mağaza')
    expect(categoryLabel('escape_game')).toBe('Escape game')
    expect(categoryLabel('constructor')).toBe('Constructor')
    expect(categoryLabel('yes', undefined)).toBeUndefined()
  })
})

describe('categoryInfo', () => {
  it('gives the glyph and group colour of the first known key', () => {
    expect(categoryInfo('bicycle', 'shop')).toMatchObject({
      key: 'shop',
      label: 'Mağaza',
      glyph: 'bag',
      color: '#3b82f6',
    })
    expect(categoryInfo('escape_game')).toBeUndefined()
  })

  it('shades colours for map labels', () => {
    expect(labelColor('#3b82f6')).toBe('rgb(42 94 177)')
    expect(labelColor('#3b82f6', 'dark')).toBe('rgb(118 168 249)')
  })
})

describe('findPoiLayerIds', () => {
  it('picks the layers drawn from the poi source layer', () => {
    const ids = findPoiLayerIds({
      version: 8,
      sources: {},
      layers: [
        { id: 'bg', type: 'background' },
        { id: 'poi_r1', type: 'symbol', source: 'omt', 'source-layer': 'poi' },
        { id: 'roads', type: 'line', source: 'omt', 'source-layer': 'road' },
      ],
    })
    expect(ids).toEqual(['poi_r1'])
  })
})
