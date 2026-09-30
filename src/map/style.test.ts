import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec'
import { describe, expect, it } from 'vitest'
import type { Theme } from '../theme/theme.ts'
import { mapStyle } from './style.ts'

const variants = [
  ['light', false],
  ['dark', false],
  ['light', true],
  ['dark', true],
] as const

describe.each(variants)('%s map style, terrain %s', (theme, terrain) => {
  const style = mapStyle(theme, terrain)

  it('passes the MapLibre style spec validator', () => {
    expect(validateStyleMin(style)).toEqual([])
  })

  it('has unique layer ids', () => {
    const ids = style.layers.map((layer) => layer.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

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

  it('returns the same object for the same options', () => {
    expect(mapStyle('dark', true)).toBe(mapStyle('dark', true))
  })
})
