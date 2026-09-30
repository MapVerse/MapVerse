import { describe, expect, it } from 'vitest'
import { QUICK_CATEGORIES, buildQuery, toSearchResult } from './overpass.ts'

const category = (key: string) => QUICK_CATEGORIES.find((c) => c.key === key)!

describe('buildQuery', () => {
  it('asks for named places of the category around a point', () => {
    expect(buildQuery(category('pharmacy'), [28.97412, 41.02563], 1000)).toBe(
      '[out:json][timeout:15];(nwr["amenity"="pharmacy"]["name"](around:1000,41.02563,28.97412););out center tags 200;',
    )
  })

  it('also takes unnamed places for categories that are often unnamed', () => {
    const query = buildQuery(category('atm'), [29, 41], 3000)
    expect(query).toContain(
      'nwr["amenity"="atm"](around:3000,41.00000,29.00000);',
    )
    expect(query).toContain('nwr["amenity"="bank"]["atm"="yes"](around:')
  })
})

describe('toSearchResult', () => {
  it('reads nodes, with the address from their tags', () => {
    const result = toSearchResult(
      {
        type: 'node',
        id: 42,
        lat: 41.03,
        lon: 28.98,
        tags: {
          amenity: 'cafe',
          name: 'Kahve Durağı',
          'addr:street': 'Galip Dede Cd.',
          'addr:housenumber': '5',
        },
      },
      category('cafe'),
    )
    expect(result).toMatchObject({
      key: 'N42',
      name: 'Kahve Durağı',
      detail: 'Galip Dede Cd. 5',
      address: 'Galip Dede Cd. 5',
      category: 'Kafe',
      categoryKey: 'cafe',
      lngLat: [28.98, 41.03],
      osm: { type: 'N', id: 42 },
    })
  })

  it('places ways at their centre and leaves a missing address to look up', () => {
    const result = toSearchResult(
      {
        type: 'way',
        id: 7,
        center: { lat: 41, lon: 29 },
        tags: { amenity: 'place_of_worship', religion: 'muslim', name: 'Cami' },
      },
      category('mosque'),
    )
    expect(result).toMatchObject({
      key: 'W7',
      lngLat: [29, 41],
      category: 'Cami',
      detail: 'Cami',
    })
    expect(result?.address).toBeUndefined()
  })

  it('names unnamed places by brand, operator or category', () => {
    const atm = (tags: Record<string, string>) =>
      toSearchResult(
        { type: 'node', id: 1, lat: 41, lon: 29, tags },
        category('atm'),
      )?.name
    expect(atm({ amenity: 'atm', operator: 'Ziraat Bankası' })).toBe(
      'Ziraat Bankası',
    )
    expect(atm({ amenity: 'atm' })).toBe('ATM')
  })

  it('skips elements without a position', () => {
    expect(
      toSearchResult({ type: 'relation', id: 3 }, category('park')),
    ).toBeNull()
  })
})
