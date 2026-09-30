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

  it('leaves a courtyard open inside walls', () => {
    const [walls] = landmarkExtrusions(
      [landmark('rumeli-hisari')],
      'light',
    ).features
    expect(walls.geometry.coordinates).toHaveLength(2)
  })

  it('floodlights its walls at night, brightest at their foot', () => {
    const dark = landmarkExtrusions([landmark('atakule')], 'dark').features
    const shaft = dark.filter(
      ({ properties }) => properties!.base < 86 && properties!.height <= 86,
    )
    const brightness = (color: string) =>
      [1, 3, 5].reduce((sum, i) => sum + parseInt(color.slice(i, i + 2), 16), 0)
    const [foot, top] = [shaft[0], shaft.at(-1)!].map(({ properties }) =>
      brightness(properties!.color),
    )
    expect(foot).toBeGreaterThan(top)
    expect(shaft.at(-1)!.properties!.color).toBe(MATERIAL_COLORS.dark.concrete)
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
    const [zone] = hideZones([landmark('atakule')])
    expect(zone.center).toEqual(landmark('atakule').near)
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
