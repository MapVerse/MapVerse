import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec'
import { describe, expect, it } from 'vitest'
import { MAP_STYLE } from './style.ts'

describe('MAP_STYLE', () => {
  it('passes the MapLibre style spec validator', () => {
    expect(validateStyleMin(MAP_STYLE)).toEqual([])
  })

  it('has unique layer ids', () => {
    const ids = MAP_STYLE.layers.map((layer) => layer.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
