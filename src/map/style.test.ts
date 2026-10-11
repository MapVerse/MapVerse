import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec'
import { describe, expect, it } from 'vitest'
import type { Theme } from '../theme/theme.ts'
import { MAP_DESIGNS } from './designSetting.ts'
import { mapStyle } from './style.ts'

const variants = MAP_DESIGNS.flatMap((design) =>
  (['light', 'dark'] as const).flatMap((theme) =>
    [false, true].map((terrain) => [design, theme, terrain] as const),
  ),
)

describe.each(variants)(
  '%s %s map style, terrain %s',
  (design, theme, terrain) => {
    const style = mapStyle(theme, terrain, design)

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
  })
})
