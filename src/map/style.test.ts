import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec'
import { describe, expect, it } from 'vitest'
import {
  TRAFFIC_LAYERS,
  TRAFFIC_SOURCE_ID,
  trafficSource,
} from '../features/traffic/traffic.ts'
import { MAP_STYLE } from './style.ts'

describe('MAP_STYLE', () => {
  it('passes the MapLibre style spec validator', () => {
    expect(validateStyleMin(MAP_STYLE)).toEqual([])
  })

  it('stays valid with the live traffic layers added', () => {
    const style = {
      ...MAP_STYLE,
      sources: {
        ...MAP_STYLE.sources,
        [TRAFFIC_SOURCE_ID]: trafficSource('test-key'),
      },
      layers: [...MAP_STYLE.layers, ...TRAFFIC_LAYERS],
    }
    expect(validateStyleMin(style)).toEqual([])
  })

  it('has unique layer ids', () => {
    const ids = MAP_STYLE.layers.map((layer) => layer.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
