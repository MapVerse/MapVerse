import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec'
import { describe, expect, it } from 'vitest'
import { MAP_STYLES } from './style.ts'

describe.each(['light', 'dark'] as const)('%s map style', (theme) => {
  const style = MAP_STYLES[theme]

  it('passes the MapLibre style spec validator', () => {
    expect(validateStyleMin(style)).toEqual([])
  })

  it('has unique layer ids', () => {
    const ids = style.layers.map((layer) => layer.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('map styles', () => {
  // Switching themes then only restyles layers, and code that looks layers
  // up by id keeps working
  it('share the same layers', () => {
    const ids = (theme: 'light' | 'dark') =>
      MAP_STYLES[theme].layers.map((layer) => layer.id)
    expect(ids('dark')).toEqual(ids('light'))
  })
})
