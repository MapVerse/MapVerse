import { describe, expect, it } from 'vitest'
import {
  LANDMARKS,
  MATERIAL_COLORS,
  fallbackFor,
  findBuilding,
  hideZone,
  landmarkExtrusions,
  metres,
  offset,
  type Landmark,
  type TileBuilding,
  type XY,
} from './landmarks.ts'

const landmark = (id: string) => LANDMARKS.find((l) => l.id === id)!

const width = (ring: number[][]) =>
  Math.max(...ring.map(([lng]) => lng)) - Math.min(...ring.map(([lng]) => lng))

/** A tile building: a footprint in metres round a point, at a height. */
function building(
  near: [number, number],
  footprint: XY[],
  height: number,
): TileBuilding {
  const ring = footprint.map((p) => offset(near, p))
  return {
    geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]]] },
    properties: { render_height: height },
  }
}

const square = (x: number, y: number, half: number): XY[] => [
  [x - half, y - half],
  [x + half, y - half],
  [x + half, y + half],
  [x - half, y + half],
]

describe('findBuilding', () => {
  const atakule = landmark('atakule')

  it('finds the tower though its point is 100 m off', () => {
    const found = findBuilding(atakule, [
      building(atakule.near, square(-100, 20, 7), 125),
      building(atakule.near, square(-60, 40, 30), 18),
    ])!
    const [x, y] = metres(atakule.near, found.center)
    expect(x).toBeCloseTo(-100, 0)
    expect(y).toBeCloseTo(20, 0)
    expect(found.height).toBe(125)
    expect(found.radius).toBeCloseTo(7 * Math.SQRT2, 0)
  })

  it('puts a building cut at a tile edge back together', () => {
    const found = findBuilding(atakule, [
      building(
        atakule.near,
        [
          [-10, -8],
          [0, -8],
          [0, 8],
          [-10, 8],
        ],
        125,
      ),
      building(
        atakule.near,
        [
          [0, -8],
          [10, -8],
          [10, 8],
          [0, 8],
        ],
        125,
      ),
    ])!
    const [x] = metres(atakule.near, found.center)
    expect(x).toBeCloseTo(0, 0)
    expect(found.radius).toBeGreaterThan(12)
  })

  it('takes the next tallest for a second tower', () => {
    const second = landmark('sabanci-2')
    const found = findBuilding(second, [
      building(second.near, square(-30, 0, 16), 158),
      building(second.near, square(30, 0, 16), 138),
    ])!
    expect(found.height).toBe(138)
    expect(metres(second.near, found.center)[0]).toBeCloseTo(30, 0)
  })

  it('takes the largest building when asked by area', () => {
    const anitkabir = landmark('anitkabir')
    const found = findBuilding(anitkabir, [
      building(anitkabir.near, square(0, 0, 28), 17),
      building(anitkabir.near, square(90, 0, 6), 20),
    ])!
    expect(found.height).toBe(17)
  })

  it('finds nothing when no building fits', () => {
    expect(
      findBuilding(atakule, [building(atakule.near, square(0, 0, 10), 20)]),
    ).toBeNull()
  })
})

describe('landmarkExtrusions', () => {
  const placedAll = LANDMARKS.map((l: Landmark) => ({
    landmark: l,
    found: fallbackFor(l),
  }))
  const { features } = landmarkExtrusions(placedAll, 'light')

  it('raises every piece above its base, in a colour of the theme', () => {
    const colors = Object.values(MATERIAL_COLORS.light)
    expect(features.length).toBeGreaterThan(50)
    for (const { properties } of features) {
      expect(properties!.height).toBeGreaterThan(properties!.base)
      expect(colors).toContain(properties!.color)
    }
  })

  it('narrows a sloped roof ring by ring, like a cone', () => {
    const galata = landmark('galata')
    // The lead roof, above its eaves
    const roof = landmarkExtrusions(
      [{ landmark: galata, found: fallbackFor(galata) }],
      'light',
    )
      .features.filter(
        ({ properties }) =>
          properties!.color === MATERIAL_COLORS.light.lead &&
          properties!.base >= 52.3,
      )
      .sort((a, b) => a.properties!.base - b.properties!.base)
    expect(roof.length).toBeGreaterThan(5)
    const widths = roof.map(({ geometry }) => width(geometry.coordinates[0]))
    expect(widths).toEqual([...widths].sort((a, b) => b - a))
  })

  it('builds a footprint landmark on the building it was found at', () => {
    const anitkabir = landmark('anitkabir')
    const found = {
      ...fallbackFor(anitkabir),
      center: offset(anitkabir.near, [50, 0]),
    }
    const [plinth] = landmarkExtrusions(
      [{ landmark: anitkabir, found }],
      'light',
    ).features
    const xs = plinth.geometry.coordinates[0].map(
      (p) => metres(anitkabir.near, p as [number, number])[0],
    )
    expect(Math.min(...xs)).toBeCloseTo(50 - 28.7, 0)
    expect(Math.max(...xs)).toBeCloseTo(50 + 28.7, 0)
  })

  it('follows the theme', () => {
    const dark = landmarkExtrusions(placedAll, 'dark').features
    expect(dark[0].properties!.color).toBe(MATERIAL_COLORS.dark.concrete)
  })
})

describe('hideZone', () => {
  it('clears a landmark’s own building, not the lower ones round it', () => {
    const atakule = landmark('atakule')
    const zone = hideZone(atakule, fallbackFor(atakule))
    expect(zone.tallerThan).toBe(62.5)
    expect(zone.within).toBeCloseTo(8.5, 1)
  })

  it('clears the whole rock for Kız Kulesi', () => {
    const kiz = landmark('kiz-kulesi')
    expect(hideZone(kiz, fallbackFor(kiz))).toMatchObject({
      within: 45,
      tallerThan: 0,
    })
  })
})
