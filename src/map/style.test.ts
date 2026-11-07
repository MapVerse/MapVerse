import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec'
import { describe, expect, it } from 'vitest'
import type { Theme } from '../theme/theme.ts'
import { MAP_DESIGNS } from './designSetting.ts'
import { mapStyle } from './style.ts'

const variants = MAP_DESIGNS.flatMap((design) =>
  (['light', 'dark'] as const).flatMap((theme) =>
    [false, true].flatMap((terrain) =>
      [false, true].map(
        (satellite) => [design, theme, terrain, satellite] as const,
      ),
    ),
  ),
)

describe.each(variants)(
  '%s %s map style, terrain %s, satellite %s',
  (design, theme, terrain, satellite) => {
    const style = mapStyle(theme, terrain, design, satellite)

    it('passes the MapLibre style spec validator', () => {
      expect(validateStyleMin(style)).toEqual([])
    })

    it('has unique layer ids', () => {
      const ids = style.layers.map((layer) => layer.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  },
)

describe('map styles', () => {
  const ids = (theme: Theme, terrain: boolean) =>
    mapStyle(theme, terrain).layers.map((layer) => layer.id)

  // Switching themes then only restyles layers, and code that looks layers
  // up by id keeps working
  it('share the same layers across themes', () => {
    expect(ids('dark', false)).toEqual(ids('light', false))
    expect(ids('dark', true)).toEqual(ids('light', true))
  })

  it('add terrain and hillshade only when asked', () => {
    expect(mapStyle('light', false).terrain).toBeUndefined()
    expect(ids('light', false)).not.toContain('hillshade')
    expect(mapStyle('light', true).terrain?.source).toBe('terrain-dem')
    expect(ids('light', true)).toEqual(
      ids('light', false).toSpliced(
        ids('light', false).indexOf('water'),
        0,
        'hillshade',
      ),
    )
  })

  // Landmarks, traffic lights and search results find their place by id
  it('share the same layers across designs', () => {
    for (const design of MAP_DESIGNS) {
      expect(
        mapStyle('light', true, design).layers.map((layer) => layer.id),
      ).toEqual(ids('light', true))
    }
  })

  it('returns the same object for the same options', () => {
    expect(mapStyle('dark', true)).toBe(mapStyle('dark', true))
    expect(mapStyle('dark', true, 'vintage', true)).toBe(
      mapStyle('dark', true, 'vintage', true),
    )
    expect(mapStyle('dark', true, 'vintage', true)).not.toBe(
      mapStyle('dark', true, 'vintage'),
    )
  })

  it('add satellite imagery only when asked, over the background', () => {
    expect(mapStyle('light', false).sources.satellite).toBeUndefined()
    expect(ids('light', false)).not.toContain('satellite')
    const style = mapStyle('light', true, 'standard', true)
    expect(style.sources.satellite).toMatchObject({
      type: 'raster',
      tileSize: 256,
      attribution: expect.stringContaining('Esri'),
    })
    expect(style.layers.map((layer) => layer.id)).toEqual(
      ids('light', true).toSpliced(1, 0, 'satellite'),
    )
  })

  it('hide the fills the imagery shows, but keep roads and labels', () => {
    const style = mapStyle('dark', false, 'san-andreas', true)
    const visibility = (id: string) => {
      const layer = style.layers.find((l) => l.id === id)
      return layer && 'layout' in layer ? layer.layout?.visibility : undefined
    }
    for (const id of ['landcover', 'park', 'water', 'building-3d']) {
      expect(visibility(id)).toBe('none')
    }
    for (const id of ['road-fill', 'road-name', 'poi-r1', 'place-city']) {
      expect(visibility(id)).toBeUndefined()
    }
  })
})
