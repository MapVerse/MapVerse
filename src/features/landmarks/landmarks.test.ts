import { describe, expect, it } from 'vitest'
import { LANDMARKS } from './catalog.ts'
import { metres } from './geometry.ts'
import {
  MATERIAL_COLORS,
  hideBuildings,
  hideZones,
  landmarkExtrusions,
  landmarkLights,
  mix,
  onTerrain,
  type Landmark,
  type Part,
} from './landmarks.ts'

const landmark = (id: string) => LANDMARKS.find((l) => l.id === id)!

const width = (ring: number[][]) =>
  Math.max(...ring.map(([lng]) => lng)) - Math.min(...ring.map(([lng]) => lng))

/** How far a part reaches from its landmark's centre, in metres. */
function reach(part: Part): number {
  if (part.kind === 'block') {
    return Math.max(...part.footprint.map(([x, y]) => Math.hypot(x, y)))
  }
  const [x, y] = part.at ?? [0, 0]
  return Math.hypot(x, y) + Math.max(...part.outline.map(([r]) => r))
}

describe('the landmarks', () => {
  it('each have their own id', () => {
    const ids = LANDMARKS.map(({ id }) => id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all stand in Türkiye', () => {
    for (const { near } of LANDMARKS) {
      expect(near[0]).toBeGreaterThan(25.6)
      expect(near[0]).toBeLessThan(44.9)
      expect(near[1]).toBeGreaterThan(35.8)
      expect(near[1]).toBeLessThan(42.2)
    }
  })

  it('are drawn round their own centres, not somewhere else', () => {
    for (const { id, parts, hide } of LANDMARKS) {
      // The bridge is the widest, at 1.6 km end to end
      const limit = id === '15-temmuz-koprusu' ? 850 : 350
      for (const part of parts) expect(reach(part)).toBeLessThan(limit)
      for (const { at = [0, 0] } of hide) {
        expect(Math.hypot(...at)).toBeLessThan(limit)
      }
    }
  })
})

describe('landmarkExtrusions', () => {
  const { features } = landmarkExtrusions(LANDMARKS, 'light')

  it('raises every piece above its base, in a colour of the theme', () => {
    const colors = Object.values(MATERIAL_COLORS.light)
    expect(features.length).toBeGreaterThan(500)
    for (const { properties } of features) {
      expect(properties!.height).toBeGreaterThan(properties!.base)
      expect(colors).toContain(properties!.color)
    }
  })

  it('narrows a sloped roof ring by ring, like a cone', () => {
    // Galata Kulesi's lead roof, above its eaves
    const roof = landmarkExtrusions([landmark('galata')], 'light')
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

  it('puts each piece where the landmark stands', () => {
    const galata = landmark('galata')
    const [base] = landmarkExtrusions([galata], 'light').features
    for (const p of base.geometry.coordinates[0]) {
      const [x, y] = metres(galata.near, p as [number, number])
      expect(Math.hypot(x, y)).toBeCloseTo(8.3, 0)
    }
  })

  it('leaves an opening inside a ring', () => {
    // The stone edge round Anıtkabir's ceremonial field
    const edged = landmarkExtrusions([landmark('anitkabir')], 'light').features
    expect(
      edged.some(({ geometry }) => geometry.coordinates.length === 2),
    ).toBe(true)
  })

  it('floodlights its walls at night, brightest at their foot', () => {
    // Galata Kulesi's stone shaft
    const shaft = landmarkExtrusions(
      [landmark('galata')],
      'dark',
    ).features.filter(({ properties }) => properties!.height <= 43)
    const brightness = (color: string) =>
      [1, 3, 5].reduce((sum, i) => sum + parseInt(color.slice(i, i + 2), 16), 0)
    const [foot, top] = [shaft[0], shaft.at(-1)!].map(({ properties }) =>
      brightness(properties!.color),
    )
    expect(foot).toBeGreaterThan(top)
    expect(shaft.at(-1)!.properties!.color).toBe(MATERIAL_COLORS.dark.stone)
  })
})

describe('Anıtkabir', () => {
  const anitkabir = landmark('anitkabir')
  const blocks = anitkabir.parts.filter((p) => p.kind === 'block')

  it('has the Road of Lions, with 12 lions down each side facing it', () => {
    const heads = blocks.filter(
      (p) => p.material === 'whitewash' && p.base === 2,
    )
    expect(heads).toHaveLength(24)
    // Across the road, on the complex's grid, from its centre line
    const angle = (37.55 * Math.PI) / 180
    const across = ({ footprint }: { footprint: [number, number][] }) => {
      const u =
        footprint.reduce(
          (sum, [x, y]) => sum + x * Math.cos(angle) + y * Math.sin(angle),
          0,
        ) / footprint.length
      return Math.abs(u + 13.6)
    }
    // Each head is on the road side of its lion's plinth
    for (const head of heads) expect(across(head)).toBeLessThan(9.6)
  })

  it('has its 44 columns round the Hall of Honour', () => {
    const columns = blocks.filter(
      (p) => p.material === 'stone' && p.base === 5 && p.top === 19.5,
    )
    expect(columns).toHaveLength(44)
  })
})

describe('Atlantis', () => {
  const atlantis = landmark('atlantis')
  const blocks = atlantis.parts.filter((p) => p.kind === 'block')
  const [main] = blocks

  /** Whether a point is inside an outline, by counting its crossings. */
  const within = ([x, y]: [number, number], outline: [number, number][]) =>
    outline.reduce((inside, [x0, y0], i) => {
      const [x1, y1] = outline[(i + 1) % outline.length]
      const crosses =
        y0 > y !== y1 > y && x < x0 + ((y - y0) * (x1 - x0)) / (y1 - y0)
      return crosses ? !inside : inside
    }, false)

  it('lays its green roofs and glass vault along its main building', () => {
    const roofs = blocks.filter(
      (p) =>
        p.material === 'green' ||
        (p.material === 'windows' && p.base >= main.top),
    )
    expect(roofs).toHaveLength(6)
    for (const { footprint } of roofs) {
      for (const point of footprint) {
        expect(within(point, main.footprint)).toBe(true)
      }
    }
  })
})

describe('mosques', () => {
  const minarets = (mosque: Landmark) =>
    mosque.parts.filter(
      (p) => p.kind === 'round' && p.material === 'stone' && p.sides === 16,
    ).length

  it('have their minarets', () => {
    expect(minarets(landmark('sultanahmet'))).toBe(6)
    expect(minarets(landmark('ayasofya'))).toBe(4)
    expect(minarets(landmark('selimiye'))).toBe(4)
    expect(minarets(landmark('kocatepe'))).toBe(4)
  })
})

describe('hideZones', () => {
  it('clears a landmark’s own building, not the lower ones round it', () => {
    const [zone] = hideZones([landmark('galata')])
    expect(zone.center).toEqual(landmark('galata').near)
    expect(zone.tallerThan).toBe(30)
  })

  it('places a zone off the centre where it is asked to', () => {
    const kiz = landmark('kiz-kulesi')
    const [zone] = hideZones([kiz])
    const [x, y] = metres(kiz.near, zone.center)
    expect(x).toBeCloseTo(0, 5)
    expect(y).toBeCloseTo(6, 1)
    expect(zone).toMatchObject({ within: 18, tallerThan: 0 })
  })

  it('makes a filter that keeps buildings outside every zone', () => {
    const filter = hideBuildings(hideZones(LANDMARKS)) as unknown[]
    expect(filter[0]).toBe('all')
    expect(filter.length).toBe(2 + hideZones(LANDMARKS).length)
  })
})

describe('night lights', () => {
  it('puts a glow at every light of every landmark', () => {
    const count = LANDMARKS.reduce((n, l) => n + (l.lights?.length ?? 0), 0)
    expect(count).toBeGreaterThan(200)
    expect(landmarkLights(LANDMARKS).features).toHaveLength(count)
  })

  it('mixes colours part way', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(mix('#102030', '#102030', 0.7)).toBe('#102030')
  })
})

describe('onTerrain', () => {
  const near: [number, number] = [32.8, 39.9]
  const piece = (at: [number, number], base: number, height: number) => ({
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[at, [at[0] + 1e-5, at[1]], [at[0], at[1] + 1e-5], at]],
    },
    properties: { base, height, color: '#000000', ground: near },
  })
  // Ground rising 10 m for each 0.001° east
  const slope = ([lng]: [number, number]) => (lng - 32.8) * 10_000

  it('stands a landmark level on the ground at its centre', () => {
    const { features } = onTerrain(
      {
        type: 'FeatureCollection',
        features: [piece([32.799, 39.9], 5, 20), piece([32.801, 39.9], 5, 20)],
      },
      slope,
    )
    // Each is raised by the ground under it, so these even that out
    const tops = features.map(
      ({ geometry, properties }) =>
        slope(geometry.coordinates[0][0] as [number, number]) +
        properties!.height,
    )
    expect(tops[0]).toBeCloseTo(tops[1], 0)
    expect(tops[0]).toBeCloseTo(20, 0)
  })

  it('lets pieces on the ground reach down to it wherever they stand', () => {
    const [low] = onTerrain(
      { type: 'FeatureCollection', features: [piece([32.799, 39.9], 0, 8)] },
      slope,
    ).features
    expect(low.properties!.base).toBe(0)
    expect(low.properties!.height).toBeCloseTo(18, 0)
  })

  it('leaves a piece underground where the ground rises over it', () => {
    const [buried] = onTerrain(
      { type: 'FeatureCollection', features: [piece([32.802, 39.9], 0, 8)] },
      slope,
    ).features
    expect(buried.properties!.height).toBe(0)
  })

  it('measures a bridge from the sea', () => {
    const bridge = landmarkExtrusions([landmark('15-temmuz-koprusu')], 'light')
    expect(bridge.features.every(({ properties }) => !properties!.ground)).toBe(
      true,
    )
    const [first] = onTerrain(bridge, () => 30).features
    const [original] = bridge.features
    expect(first.properties!.height).toBeCloseTo(
      original.properties!.height - 30,
      5,
    )
  })
})
