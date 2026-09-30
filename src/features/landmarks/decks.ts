import type { FeatureCollection, LineString, Polygon } from 'geojson'
import { metres, offset, type XY } from './geometry.ts'
import type { Landmark } from './landmarks.ts'

/** A road raised across a landmark, like a bridge's deck. */
export type Deck = {
  /** Along the deck, from east */
  angle: number
  /** Its ends, in metres along it from the landmark's centre */
  from: number
  to: number
  halfWidth: number
  /** Its road, above the landmark's ground (or the sea, for a bridge) */
  height: number
}

/** A route's width on a deck, in metres, casing and line. */
const CASING = 15
const LINE = 11
/** Pieces short enough to follow the deck, and the ground under it */
const STEP = 10

type Route = { selected: boolean }

/**
 * Routes over the landmarks' raised roads. The map draws routes on the
 * ground, which on a bridge is the water far below its deck; so where a
 * route runs along a deck it is marked `onDeck` (for the map to leave
 * out close up, where the deck is drawn) and drawn again on the deck, as
 * raised ribbons: a casing, and the route's own line over it.
 */
export function routesOnDecks<P extends Route>(
  lines: FeatureCollection<LineString, P>,
  landmarks: Landmark[],
): {
  ground: FeatureCollection<LineString, P & { onDeck: boolean }>
  decks: FeatureCollection<Polygon>
} {
  const decks = landmarks.filter((l) => l.deck)
  const ground: FeatureCollection<LineString, P & { onDeck: boolean }> = {
    type: 'FeatureCollection',
    features: [],
  }
  const ribbons: FeatureCollection<Polygon> = {
    type: 'FeatureCollection',
    features: [],
  }

  /** The deck a short piece of route runs along, if any. */
  const deckUnder = (a: [number, number], b: [number, number]) =>
    decks.find(({ near, deck }) => {
      const { angle, from, to, halfWidth } = deck!
      const [c, s] = [Math.cos(angle), Math.sin(angle)]
      const along = ([x, y]: XY): XY => [x * c + y * s, -x * s + y * c]
      const [u0, v0] = along(metres(near, a))
      const [u1, v1] = along(metres(near, b))
      const [u, v] = [(u0 + u1) / 2, (v0 + v1) / 2]
      const length = Math.hypot(u1 - u0, v1 - v0)
      // Along it, not under it: a road crossing beneath runs across it
      const lengthwise = length === 0 || Math.abs(u1 - u0) / length > 0.9
      return lengthwise && u >= from && u <= to && Math.abs(v) <= halfWidth
    })

  for (const { geometry, properties } of lines.features) {
    // Short pieces, each on a deck or not
    const points: [number, number][] = [
      geometry.coordinates[0] as [number, number],
    ]
    for (let i = 1; i < geometry.coordinates.length; i++) {
      const a = geometry.coordinates[i - 1] as [number, number]
      const b = geometry.coordinates[i] as [number, number]
      const n = Math.max(1, Math.ceil(Math.hypot(...metres(a, b)) / STEP))
      for (let j = 1; j <= n; j++) {
        points.push([
          a[0] + ((b[0] - a[0]) * j) / n,
          a[1] + ((b[1] - a[1]) * j) / n,
        ])
      }
    }
    let run: [number, number][] = [points[0]]
    let runDeck: Landmark | undefined
    const endRun = () => {
      if (run.length > 1) {
        ground.features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: run },
          properties: { ...properties, onDeck: !!runDeck },
        })
      }
    }
    for (let i = 1; i < points.length; i++) {
      const [a, b] = [points[i - 1], points[i]]
      const deck = deckUnder(a, b)
      if (deck !== runDeck) {
        endRun()
        run = [a]
        runDeck = deck
      }
      run.push(b)
      if (deck) ribbons.features.push(...ribbon(deck, a, b, properties))
    }
    endRun()
  }
  return { ground, decks: ribbons }
}

/** A short piece of route on a deck, as a casing and a line over it. */
function ribbon(
  { near, deck, terrain }: Landmark,
  a: [number, number],
  b: [number, number],
  properties: Route,
): FeatureCollection<Polygon>['features'] {
  const [ax, ay] = metres(near, a)
  const [bx, by] = metres(near, b)
  const length = Math.hypot(bx - ax, by - ay) || 1
  const [dx, dy] = [(bx - ax) / length, (by - ay) / length]
  const height = deck!.height
  // The selected route over the others where they share the deck
  const lift = properties.selected ? 0.2 : 0
  return (
    [
      ['casing', CASING, height + 0.05 + lift, height + 0.3 + lift],
      ['line', LINE, height + 0.3 + lift, height + 0.5 + lift],
    ] as const
  ).map(([part, width, base, top]) => {
    const [nx, ny] = [(-dy * width) / 2, (dx * width) / 2]
    // A little longer than the piece, so the pieces meet without a gap
    const [ex, ey] = [dx * 0.5, dy * 0.5]
    const corners: XY[] = [
      [ax - ex + nx, ay - ey + ny],
      [bx + ex + nx, by + ey + ny],
      [bx + ex - nx, by + ey - ny],
      [ax - ex - nx, ay - ey - ny],
    ]
    const ring = corners.map((p) => offset(near, p))
    return {
      type: 'Feature' as const,
      geometry: { type: 'Polygon' as const, coordinates: [[...ring, ring[0]]] },
      properties: {
        ...properties,
        part,
        base,
        height: top,
        // Set on the terrain as its landmark is
        ground: terrain === 'sea' ? null : near,
      },
    }
  })
}
