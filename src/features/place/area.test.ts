import { describe, expect, it } from 'vitest'
import type { OverpassElement } from '../../lib/overpass.ts'
import {
  areaKind,
  areaQuery,
  elementShape,
  joinRings,
  pickArea,
} from './area.ts'

const pts = (...xy: [number, number][]) =>
  xy.map(([lon, lat]) => ({ lat, lon }))

// A square way, 0..size on both sides
const square = (id: number, size: number, tags = {}): OverpassElement => ({
  type: 'way',
  id,
  tags,
  geometry: pts([0, 0], [size, 0], [size, size], [0, size], [0, 0]),
})

describe('areaKind', () => {
  it('looks for areas of kinds that usually are one', () => {
    expect(areaKind({ class: 'park', subclass: 'park' })).toBe('park')
    expect(areaKind({ class: 'school', subclass: 'kindergarten' })).toBe(
      'kindergarten',
    )
    expect(areaKind({ class: 'cafe', subclass: 'cafe' })).toBeUndefined()
  })
})

describe('areaQuery', () => {
  it('asks for the areas of its kind that a place lies in', () => {
    const query = areaQuery({ lngLat: [32.75, 39.97] }, 'park')
    expect(query).toContain('is_in(39.970000,32.750000)->.a;')
    expect(query).toContain('way(pivot.a)[~"^(leisure|')
    expect(query).toContain('~"^park$"]')
    expect(query).toContain('out geom;')
  })

  it('asks for its element when it is known to be a way or relation', () => {
    expect(areaQuery({ lngLat: [0, 0], osm: { type: 'W', id: 7 } })).toBe(
      '[out:json][timeout:12];way(7);out geom;',
    )
  })

  it('asks nothing for a point of a kind that is no area', () => {
    expect(areaQuery({ lngLat: [0, 0], osm: { type: 'N', id: 7 } })).toBeNull()
  })
})

describe('joinRings', () => {
  it('joins pieces end to end, turning them round where needed', () => {
    const rings = joinRings([
      [
        [0, 0],
        [1, 0],
        [1, 1],
      ],
      // Runs the other way
      [
        [0, 0],
        [0, 1],
        [1, 1],
      ],
    ])
    expect(rings).toHaveLength(1)
    const [ring] = rings
    expect(ring[0]).toEqual(ring[ring.length - 1])
    expect(ring).toHaveLength(5)
  })

  it('drops pieces that never close', () => {
    expect(
      joinRings([
        [
          [0, 0],
          [1, 0],
        ],
      ]),
    ).toEqual([])
  })
})

describe('elementShape', () => {
  it('makes a closed way a polygon, and an open one nothing', () => {
    expect(elementShape(square(1, 1))?.coordinates).toHaveLength(1)
    const open = { ...square(1, 1), geometry: pts([0, 0], [1, 0], [1, 1]) }
    expect(elementShape(open)).toBeNull()
  })

  it('stitches a relation, putting its holes in the outer ring round them', () => {
    const relation: OverpassElement = {
      type: 'relation',
      id: 9,
      members: [
        {
          type: 'way',
          ref: 1,
          role: 'outer',
          geometry: pts([0, 0], [4, 0], [4, 4]),
        },
        {
          type: 'way',
          ref: 2,
          role: 'outer',
          geometry: pts([4, 4], [0, 4], [0, 0]),
        },
        {
          type: 'way',
          ref: 3,
          role: 'inner',
          geometry: pts([1, 1], [2, 1], [2, 2], [1, 1]),
        },
      ],
    }
    const shape = elementShape(relation)
    expect(shape?.coordinates).toHaveLength(1)
    expect(shape?.coordinates[0]).toHaveLength(2)
  })
})

describe('pickArea', () => {
  it('takes the one of its name, else the smallest round it', () => {
    const big = square(1, 10, { name: 'Gençlik Parkı' })
    const small = square(2, 2)
    expect(pickArea([big, small], { name: 'Gençlik Parkı' })).toEqual(
      elementShape(big),
    )
    expect(pickArea([big, small], { name: 'Park' })).toEqual(
      elementShape(small),
    )
    expect(pickArea([], { name: 'Park' })).toBeNull()
  })
})
