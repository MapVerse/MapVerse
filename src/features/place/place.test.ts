import { describe, expect, it } from 'vitest'
import { categoryLabel } from './categories.ts'
import { distanceMeters, formatDistance } from './place.ts'
import { findPoiLayerIds } from './poi.ts'

describe('formatDistance', () => {
  it('uses metres nearby and Turkish-formatted kilometres further out', () => {
    expect(formatDistance(846)).toBe('850 m')
    expect(formatDistance(2345)).toBe('2,3 km')
    expect(formatDistance(351_400)).toBe('351 km')
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
    expect(categoryLabel('water_park')).toBe('Water park')
    expect(categoryLabel('constructor')).toBe('Constructor')
    expect(categoryLabel('yes', undefined)).toBeUndefined()
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
