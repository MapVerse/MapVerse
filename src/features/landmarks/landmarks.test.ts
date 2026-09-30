import { describe, expect, it } from 'vitest'
import { LANDMARKS, MATERIAL_COLORS, landmarkExtrusions } from './landmarks.ts'

const width = (ring: number[][]) =>
  Math.max(...ring.map(([lng]) => lng)) - Math.min(...ring.map(([lng]) => lng))

describe('landmarkExtrusions', () => {
  const { features } = landmarkExtrusions(LANDMARKS, 'light')

  it('raises every piece above its base, in a colour of the theme', () => {
    const colors = Object.values(MATERIAL_COLORS.light)
    expect(features.length).toBeGreaterThan(20)
    for (const { properties } of features) {
      expect(properties!.height).toBeGreaterThan(properties!.base)
      expect(colors).toContain(properties!.color)
    }
  })

  it('narrows a sloped roof ring by ring, like a cone', () => {
    const galata = LANDMARKS.filter(({ id }) => id === 'galata')
    // The lead roof, above its eaves
    const roof = landmarkExtrusions(galata, 'light')
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

  it('follows the theme', () => {
    const dark = landmarkExtrusions(LANDMARKS, 'dark').features
    expect(dark[0].properties!.color).toBe(MATERIAL_COLORS.dark.concrete)
  })
})
