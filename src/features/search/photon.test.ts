import { describe, expect, it } from 'vitest'
import { toPlace } from './photon.ts'

describe('toPlace', () => {
  it('uses the name and lists the rest of the address as detail', () => {
    const place = toPlace({
      geometry: { coordinates: [28.9741, 41.0256] },
      properties: {
        osm_type: 'W',
        osm_id: 42,
        name: 'Galata Kulesi',
        street: 'Bereketzade',
        district: 'Beyoğlu',
        city: 'İstanbul',
        state: 'İstanbul',
        country: 'Türkiye',
      },
    })
    expect(place).toEqual({
      id: 'W42',
      name: 'Galata Kulesi',
      detail: 'Bereketzade, Beyoğlu, İstanbul, Türkiye',
      lngLat: [28.9741, 41.0256],
      bbox: undefined,
    })
  })

  it('falls back to street and house number for unnamed addresses', () => {
    const place = toPlace({
      geometry: { coordinates: [32.85, 39.92] },
      properties: {
        street: 'Atatürk Bulvarı',
        housenumber: '12',
        city: 'Ankara',
      },
    })
    expect(place.name).toBe('Atatürk Bulvarı 12')
    expect(place.detail).toBe('Ankara')
    expect(place.id).toBe('32.85,39.92')
  })

  it("reorders Photon's extent into a west, south, east, north bbox", () => {
    const place = toPlace({
      geometry: { coordinates: [35, 39] },
      properties: {
        name: 'Türkiye',
        country: 'Türkiye',
        extent: [26, 42, 45, 36],
      },
    })
    expect(place.detail).toBe('')
    expect(place.bbox).toEqual([26, 36, 45, 42])
  })
})
