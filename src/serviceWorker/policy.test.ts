import { describe, expect, it } from 'vitest'
import { handlingFor, tilesToDrop } from './policy.ts'

const scope = 'https://mapverse.github.io/MapVerse/'
const precached = new Set([
  'https://mapverse.github.io/MapVerse/index.html',
  'https://mapverse.github.io/MapVerse/assets/index-abc.js',
  'https://mapverse.github.io/MapVerse/assets/maplibre-gl-def.js',
])
const get = (url: string, mode = 'cors') => ({ method: 'GET', url, mode })

describe('handlingFor', () => {
  it("answers the app's own files from what was installed", () => {
    expect(
      handlingFor(get(`${scope}assets/index-abc.js`), scope, precached),
    ).toBe('shell')
    // A query doesn't make it another file
    expect(
      handlingFor(
        get(`${scope}assets/maplibre-gl-def.js?v=1`),
        scope,
        precached,
      ),
    ).toBe('shell')
  })

  it('answers the page itself, under the subpath, with the app', () => {
    expect(handlingFor(get(scope, 'navigate'), scope, precached)).toBe('page')
    expect(
      handlingFor(get(`${scope}#12/41/29`, 'navigate'), scope, precached),
    ).toBe('page')
    expect(
      handlingFor(get(`${scope}index.html`, 'navigate'), scope, precached),
    ).toBe('page')
    // Not another page opened on its own
    expect(
      handlingFor(get(`${scope}og-image.png`, 'navigate'), scope, precached),
    ).toBeNull()
  })

  it("leaves alone what isn't the app's or isn't under its path", () => {
    expect(
      handlingFor(get(`${scope}assets/unknown.js`), scope, precached),
    ).toBeNull()
    expect(
      handlingFor(
        get('https://mapverse.github.io/other/index.html', 'navigate'),
        scope,
        precached,
      ),
    ).toBeNull()
  })

  it('keeps map style, tiles and glyphs', () => {
    for (const url of [
      'https://tiles.openfreemap.org/planet',
      'https://tiles.openfreemap.org/planet/20260101_001001_pt/14/9000/6000.pbf',
      'https://tiles.openfreemap.org/fonts/Noto%20Sans%20Regular/0-255.pbf',
      'https://tiles.openfreemap.org/sprites/ofm_f384/ofm.json',
    ]) {
      expect(handlingFor(get(url), scope, precached)).toBe('tiles')
    }
  })

  it('never keeps searches, places, outlines or routes', () => {
    for (const url of [
      'https://photon.komoot.io/api/?q=Galata',
      'https://photon.komoot.io/reverse?lon=29&lat=41',
      'https://overpass-api.de/api/interpreter?data=x',
      'https://nominatim.openstreetmap.org/lookup?osm_ids=R1',
      'https://valhalla1.openstreetmap.de/route?json={}',
    ]) {
      expect(handlingFor(get(url), scope, precached)).toBeNull()
    }
    expect(
      handlingFor(
        { method: 'POST', url: 'https://overpass-api.de/api/interpreter' },
        scope,
        precached,
      ),
    ).toBeNull()
    expect(
      handlingFor(
        { method: 'POST', url: 'https://tiles.openfreemap.org/planet' },
        scope,
        precached,
      ),
    ).toBeNull()
  })
})

describe('tilesToDrop', () => {
  it('keeps everything up to the most kept', () => {
    expect(tilesToDrop(0, 2000)).toBe(0)
    expect(tilesToDrop(2000, 2000)).toBe(0)
  })

  it('drops the oldest down to nine tenths once past it', () => {
    expect(tilesToDrop(2001, 2000)).toBe(201)
    expect(tilesToDrop(2500, 2000)).toBe(700)
  })
})
