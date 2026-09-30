import type { FeatureCollection, LineString } from 'geojson'
import { describe, expect, it } from 'vitest'
import { LANDMARKS } from './catalog.ts'
import { routesOnDecks } from './decks.ts'
import { offset } from './geometry.ts'

const bridge = LANDMARKS.find((l) => l.id === '15-temmuz-koprusu')!
const angle = bridge.deck!.angle

/** A point on the bridge's own grid: `u` along it, `v` across. */
const at = (u: number, v: number) =>
  offset(bridge.near, [
    u * Math.cos(angle) - v * Math.sin(angle),
    u * Math.sin(angle) + v * Math.cos(angle),
  ])

const route = (
  ...points: [number, number][]
): FeatureCollection<LineString, { selected: boolean }> => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: points },
      properties: { selected: true },
    },
  ],
})

describe('routesOnDecks', () => {
  it('runs a route over the bridge on its deck', () => {
    const { ground, decks } = routesOnDecks(
      route(at(-1000, 6), at(1000, 6)),
      LANDMARKS,
    )
    const onDeck = ground.features.filter((f) => f.properties.onDeck)
    const offDeck = ground.features.filter((f) => !f.properties.onDeck)
    expect(onDeck).toHaveLength(1)
    expect(offDeck).toHaveLength(2)
    // Casing and line, all the way across, up on the deck
    expect(decks.features.length).toBeGreaterThan(2 * 150)
    for (const { properties } of decks.features) {
      expect(properties!.base).toBeGreaterThan(bridge.deck!.height)
    }
  })

  it('leaves a road that passes under the bridge on the ground', () => {
    const { ground, decks } = routesOnDecks(
      route(at(-600, -300), at(-600, 300)),
      LANDMARKS,
    )
    expect(decks.features).toHaveLength(0)
    expect(ground.features.every((f) => !f.properties.onDeck)).toBe(true)
  })

  it('leaves routes elsewhere as they are', () => {
    const { ground, decks } = routesOnDecks(
      route([32.85, 39.92], [32.86, 39.93]),
      LANDMARKS,
    )
    expect(decks.features).toHaveLength(0)
    expect(ground.features).toHaveLength(1)
  })
})
