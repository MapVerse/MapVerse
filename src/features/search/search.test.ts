import { describe, expect, it } from 'vitest'
import { findMatch } from './match.ts'
import { formatAddress, toSearchResult } from './photon.ts'

describe('toSearchResult', () => {
  it('describes a point of interest with its category and address', () => {
    const result = toSearchResult({
      geometry: { coordinates: [28.9741, 41.0256] },
      properties: {
        osm_type: 'N',
        osm_id: 42,
        osm_value: 'cafe',
        type: 'house',
        name: 'Kahve Durağı',
        street: 'Galip Dede Caddesi',
        housenumber: '5',
        district: 'Beyoğlu',
        city: 'İstanbul',
        state: 'İstanbul',
        country: 'Türkiye',
      },
    })
    expect(result).toEqual({
      key: 'N42',
      name: 'Kahve Durağı',
      detail: 'Galip Dede Caddesi 5, Beyoğlu, İstanbul, Türkiye',
      category: 'Kafe',
      address: 'Galip Dede Caddesi 5, Beyoğlu, İstanbul',
      lngLat: [28.9741, 41.0256],
      osm: { type: 'N', id: 42 },
      bbox: undefined,
    })
  })

  it("keeps an area's OSM reference and reorders its extent into a bbox", () => {
    const result = toSearchResult({
      geometry: { coordinates: [28.97, 41.01] },
      properties: {
        osm_type: 'R',
        osm_id: 7,
        osm_value: 'city',
        type: 'city',
        name: 'İstanbul',
        city: 'İstanbul',
        state: 'İstanbul',
        country: 'Türkiye',
        extent: [28, 41.6, 29.9, 40.8],
      },
    })
    expect(result).toMatchObject({
      category: 'Şehir',
      detail: 'Türkiye',
      address: 'Türkiye',
      osm: { type: 'R', id: 7 },
      bbox: [28, 40.8, 29.9, 41.6],
    })
  })

  it('names unnamed addresses after their street', () => {
    const result = toSearchResult({
      geometry: { coordinates: [32.85, 39.92] },
      properties: {
        type: 'house',
        osm_value: 'yes',
        street: 'Atatürk Bulvarı',
        housenumber: '12',
        city: 'Ankara',
      },
    })
    expect(result).toMatchObject({
      key: '32.85,39.92',
      name: 'Atatürk Bulvarı 12',
      category: 'Adres',
      address: 'Ankara',
    })
  })
})

describe('formatAddress', () => {
  it('returns null when there is nothing to show', () => {
    expect(formatAddress({ country: 'Türkiye' })).toBeNull()
  })
})

describe('findMatch', () => {
  it('matches case-insensitively with Turkish casing', () => {
    expect(findMatch('İstanbul Havalimanı', 'istan')).toEqual([0, 5])
    expect(findMatch('Galata Kulesi', 'KULE')).toEqual([7, 11])
    expect(findMatch('Galata', 'xyz')).toBeNull()
  })
})
