import { featureFilter } from '@maplibre/maplibre-gl-style-spec'
import type { FilterSpecification } from 'maplibre-gl'
import { describe, expect, it } from 'vitest'
import { poiFilter } from './poiStyle.ts'

const filter = featureFilter(poiFilter() as FilterSpecification, 'filter')
const shows = (properties: Record<string, string>) =>
  filter.filter({ zoom: 17 }, { type: 1, properties, geometry: [] })

describe('poiFilter', () => {
  it('shows named places', () => {
    expect(shows({ class: 'cafe', subclass: 'cafe', name: 'Kahve' })).toBe(true)
  })

  it('hides small features, named or not', () => {
    expect(shows({ class: 'shelter', subclass: 'shelter' })).toBe(false)
    expect(shows({ class: 'garden', subclass: 'garden', name: 'Bahçe' })).toBe(
      false,
    )
    // Post boxes share the `post` class with post offices
    expect(shows({ class: 'post', subclass: 'post_box', name: 'PTT' })).toBe(
      false,
    )
  })

  it('needs a name, except for places useful without one', () => {
    expect(shows({ class: 'restaurant', subclass: 'restaurant' })).toBe(false)
    expect(shows({ class: 'atm', subclass: 'atm' })).toBe(true)
    expect(shows({ class: 'pharmacy', subclass: 'pharmacy' })).toBe(true)
  })
})
