import { describe, expect, it } from 'vitest'
import type { Place } from '../place/place.ts'
import {
  favoriteDetail,
  favoritePlace,
  favoriteTitle,
  mergeFavorites,
  readFavorites,
  toFavorite,
  withFavorite,
  type Favorite,
} from './favorites.ts'
import { fromGeoJSON, toGeoJSON } from './geojson.ts'

const place = (key: string, name: string, lngLat: [number, number]): Place => ({
  key,
  name,
  lngLat,
})

const kafe: Place = {
  key: 'N1',
  name: 'Kafe',
  category: 'Kafe',
  categoryKey: 'cafe',
  address: 'Moda Cd. 1',
  lngLat: [29.02, 40.98],
  osm: { type: 'N', id: 1 },
}

describe('toFavorite', () => {
  it('keeps what opens the place again, and a name of its own', () => {
    const f = toFavorite(kafe, 'star', { label: '  Sabah kahvesi ', now: 5 })
    expect(f).toEqual({
      kind: 'star',
      key: 'N1',
      name: 'Kafe',
      label: 'Sabah kahvesi',
      lngLat: [29.02, 40.98],
      category: 'Kafe',
      categoryKey: 'cafe',
      address: 'Moda Cd. 1',
      osm: { type: 'N', id: 1 },
      savedAt: 5,
    })
    expect(favoriteTitle(f)).toBe('Sabah kahvesi')
    expect(favoritePlace(f)).toEqual(kafe)
  })

  it('drops a name of its own that is only the place’s', () => {
    expect(toFavorite(kafe, 'star', { label: 'Kafe' }).label).toBeUndefined()
  })

  it('calls home and work by what they are', () => {
    expect(favoriteTitle(toFavorite(kafe, 'home'))).toBe('Ev')
    expect(favoriteTitle(toFavorite(kafe, 'work'))).toBe('İş')
  })
})

describe('favoriteDetail', () => {
  it('says what a saved place is under the name it is listed by', () => {
    expect(favoriteDetail(toFavorite(kafe, 'home'))).toBe('Kafe · Moda Cd. 1')
    expect(favoriteDetail(toFavorite(kafe, 'star'))).toBe('Moda Cd. 1')
    expect(favoriteDetail(toFavorite(kafe, 'star', { label: 'Sabah' }))).toBe(
      'Kafe · Moda Cd. 1',
    )
    const bare = { ...kafe, address: undefined }
    expect(favoriteDetail(toFavorite(bare, 'star'))).toBe('Kafe')
    const point = place('point:1,2', 'Seçilen nokta', [1, 2])
    expect(favoriteDetail(toFavorite(point, 'work'))).toBe('')
  })
})

describe('withFavorite', () => {
  const a = toFavorite(place('A', 'A', [29, 41]), 'star', { now: 1 })
  const b = toFavorite(place('B', 'B', [29.1, 41]), 'home', { now: 2 })

  it('saves a place once, as what it was saved as last', () => {
    const list = withFavorite([a], { ...a, kind: 'work', savedAt: 3 })
    expect(list).toHaveLength(1)
    expect(list[0].kind).toBe('work')
  })

  it('keeps one home: a new one takes the old one’s place', () => {
    const c = toFavorite(place('C', 'C', [30, 41]), 'home', { now: 4 })
    const list = withFavorite([a, b], c)
    expect(list.map((f) => f.key)).toEqual(['C', 'A'])
  })

  it('lists home, then work, then the starred, latest first', () => {
    const w = toFavorite(place('W', 'W', [31, 41]), 'work', { now: 0 })
    const s = toFavorite(place('S', 'S', [32, 41]), 'star', { now: 9 })
    const list = [a, b, w].reduce(withFavorite, [s] as Favorite[])
    expect(list.map((f) => f.key)).toEqual(['B', 'W', 'S', 'A'])
  })
})

describe('mergeFavorites', () => {
  const home = toFavorite(place('H', 'Ev', [29, 41]), 'home', { now: 1 })
  const star = toFavorite(kafe, 'star', { now: 2 })

  it('adds what is new and leaves out what is saved already', () => {
    const again = { ...star, key: 'other-key' }
    const near = toFavorite(place('poi:x', 'Kafe', [29.02005, 40.98]), 'star')
    const fresh = toFavorite(place('N2', 'Fırın', [29, 40]), 'star', { now: 3 })
    const { list, added } = mergeFavorites([home, star], [again, near, fresh])
    expect(added).toBe(1)
    expect(list.map((f) => f.key)).toEqual(['H', 'N2', 'N1'])
  })

  it('keeps the home saved already', () => {
    const other = toFavorite(place('H2', 'Başka ev', [30, 40]), 'home')
    expect(mergeFavorites([home], [other])).toEqual({ list: [home], added: 0 })
  })
})

describe('readFavorites', () => {
  it('keeps only entries that can be shown and opened', () => {
    const good = toFavorite(kafe, 'star', { now: 1 })
    const stored = JSON.stringify([
      good,
      { ...good, key: 'X', kind: 'nope' },
      { ...good, key: 'Y', lngLat: [500, 0] },
      { ...good, key: '', name: 'Z' },
      {
        ...good,
        key: 'Q',
        name: 'Q',
        lngLat: [1, 2],
        osm: { type: 'Z', id: 1 },
      },
      'junk',
      null,
    ])
    const list = readFavorites(stored)
    expect(list.map((f) => f.key)).toEqual(['N1', 'Q'])
    expect(list[1].osm).toBeUndefined()
  })

  it('reads nothing from what is no list', () => {
    expect(readFavorites(null)).toEqual([])
    expect(readFavorites('{')).toEqual([])
    expect(readFavorites('{"a":1}')).toEqual([])
  })
})

describe('GeoJSON', () => {
  it('writes saved places out and reads them back the same', () => {
    const list = [
      toFavorite(place('point:29,41', 'Seçilen nokta', [29, 41]), 'home', {
        point: true,
        now: Date.UTC(2026, 0, 1),
      }),
      toFavorite(kafe, 'star', { label: 'Sabah', now: Date.UTC(2026, 1, 1) }),
    ]
    const file = toGeoJSON(list)
    expect(file.features[1].properties).toMatchObject({
      name: 'Kafe',
      label: 'Sabah',
      kind: 'star',
      'marker-symbol': 'star',
      osm_type: 'node',
      osm_id: 1,
      saved_at: '2026-02-01T00:00:00.000Z',
    })
    expect(fromGeoJSON(JSON.stringify(file))).toEqual(list)
  })

  it('takes points from other tools, starred, and leaves out the rest', () => {
    const file = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [28.97, 41.01] },
          properties: { title: 'Galata' },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [0, 0],
              [1, 1],
            ],
          },
          properties: { name: 'Yol' },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [999, 0] },
          properties: {},
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [28.97, 41.01] },
          properties: { title: 'Galata' },
        },
        { type: 'Feature', geometry: null, properties: {} },
      ],
    }
    const list = fromGeoJSON(JSON.stringify(file), 7)
    expect(list).toEqual([
      {
        kind: 'star',
        key: 'saved:28.97,41.01',
        name: 'Galata',
        lngLat: [28.97, 41.01],
        savedAt: 7,
      },
    ])
  })

  it('reads a single feature, and turns down what is not GeoJSON', () => {
    const one = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [1, 2] },
      properties: { name: 'Bir', kind: 'work' },
    }
    expect(fromGeoJSON(JSON.stringify(one))?.[0].kind).toBe('work')
    expect(fromGeoJSON('not json')).toBeNull()
    expect(fromGeoJSON('[1,2]')).toBeNull()
    expect(fromGeoJSON('{"type":"Topology"}')).toBeNull()
  })
})
