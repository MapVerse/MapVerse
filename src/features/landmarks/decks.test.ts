import type { FeatureCollection, LineString } from 'geojson'
import { describe, expect, it } from 'vitest'
import { LANDMARKS } from './catalog.ts'
import { placeOnDecks, routesOnDecks, splitOnDecks } from './decks.ts'
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

describe('splitOnDecks', () => {
  it('keeps the points of a route that comes nowhere near a deck', () => {
    const shape: [number, number][] = [
      [32.85, 39.92],
      [32.852, 39.921],
      [32.86, 39.93],
      [32.87, 39.925],
    ]
    const { runs, ribbons } = splitOnDecks(shape, LANDMARKS)
    expect(ribbons).toHaveLength(0)
    expect(runs).toEqual([{ coordinates: shape, onDeck: false }])
  })

  it('cuts a route into pieces only near the deck', () => {
    // Along the shore to the bridge's end, over it, then on the far side
    const shape = [
      at(-3000, 2000),
      at(-2000, 1000),
      at(-1000, 6),
      at(1000, 6),
      at(2000, -1000),
      at(3000, -2000),
    ]
    const { runs } = splitOnDecks(shape, LANDMARKS)
    expect(runs.map((r) => r.onDeck)).toEqual([false, true, false])
    // The far-off points stay as they were
    expect(runs[0].coordinates.slice(0, 3)).toEqual(shape.slice(0, 3))
    expect(runs[2].coordinates.slice(-3)).toEqual(shape.slice(-3))
    expect(runs[0].coordinates.at(-1)).toEqual(runs[1].coordinates[0])
  })
})

describe('placeOnDecks', () => {
  it('lifts the selected route over the others on a deck', () => {
    const split = splitOnDecks([at(-1000, 6), at(1000, 6)], LANDMARKS)
    const { ground, decks } = placeOnDecks([
      { split, properties: { selected: false } },
      { split, properties: { selected: true } },
    ])
    expect(ground.features).toHaveLength(6)
    const base = (selected: boolean) =>
      decks.features.find(
        (f) =>
          f.properties!.selected === selected &&
          f.properties!.part === 'casing',
      )!.properties!.base as number
    expect(base(true)).toBeGreaterThan(base(false))
  })
})
