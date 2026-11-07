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
/** How far the selected route's ribbons stand over the others', in metres */
const SELECTED_LIFT = 0.2

type Route = { selected: boolean }

type LngLat = [number, number]
/** West, south, east, north */
type Box = [number, number, number, number]

/** A route split where it runs along a deck: see `splitOnDecks`. */
export type DeckSplit = {
  /** The route in runs, each along a deck or on the ground */
  runs: { coordinates: LngLat[]; onDeck: boolean }[]
  /** The raised ribbons along decks, as for an alternate route */
  ribbons: FeatureCollection<Polygon>['features']
}

/** Corners round a landmark's deck, a little wider, in degrees. */
function deckBox({ near, deck }: Landmark): Box {
  const { angle, from, to, halfWidth } = deck!
  const [c, s] = [Math.cos(angle), Math.sin(angle)]
  const w = halfWidth + 1
  const corners = [
    [from - 1, -w],
    [from - 1, w],
    [to + 1, -w],
    [to + 1, w],
  ].map(([u, v]) => offset(near, [u * c - v * s, u * s + v * c]))
  const lngs = corners.map(([lng]) => lng)
  const lats = corners.map(([, lat]) => lat)
  return [
    Math.min(...lngs),
    Math.min(...lats),
    Math.max(...lngs),
    Math.max(...lats),
  ]
}

const meets = (box: Box, a: LngLat, b: LngLat) =>
  Math.max(a[0], b[0]) >= box[0] &&
  Math.min(a[0], b[0]) <= box[2] &&
  Math.max(a[1], b[1]) >= box[1] &&
  Math.min(a[1], b[1]) <= box[3]

/** The deck a short piece of route runs along, if any. */
function deckUnder(decks: Landmark[], a: LngLat, b: LngLat) {
  return decks.find(({ near, deck }) => {
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
}

/**
 * A route's line split where it runs along one of the landmarks' raised
 * roads. Only near a deck is the line cut into short pieces to follow it;
 * elsewhere it keeps its own points. This is the costly part, done once
 * for each route: `placeOnDecks` then draws the routes, picked or not.
 */
export function splitOnDecks(
  shape: LngLat[],
  landmarks: Landmark[],
): DeckSplit {
  const decks = landmarks
    .filter((l) => l.deck)
    .map((landmark) => ({ landmark, box: deckBox(landmark) }))
  const runs: DeckSplit['runs'] = []
  const ribbons: DeckSplit['ribbons'] = []
  if (!shape.length) return { runs, ribbons }

  let run: LngLat[] = [shape[0]]
  let runDeck: Landmark | undefined
  const endRun = () => {
    if (run.length > 1) runs.push({ coordinates: run, onDeck: !!runDeck })
  }
  /** Adds a piece, a to b, along `deck` or on the ground. */
  const add = (a: LngLat, b: LngLat, deck: Landmark | undefined) => {
    if (deck !== runDeck) {
      endRun()
      run = [a]
      runDeck = deck
    }
    run.push(b)
    if (deck) ribbons.push(...ribbon(deck, a, b))
  }

  for (let i = 1; i < shape.length; i++) {
    const [a, b] = [shape[i - 1], shape[i]]
    const near = decks.filter(({ box }) => meets(box, a, b))
    if (!near.length) {
      add(a, b, undefined)
      continue
    }
    // Short pieces, each on a deck or not
    const candidates = near.map(({ landmark }) => landmark)
    const n = Math.max(1, Math.ceil(Math.hypot(...metres(a, b)) / STEP))
    let from = a
    for (let j = 1; j <= n; j++) {
      const to: LngLat =
        j === n
          ? b
          : [a[0] + ((b[0] - a[0]) * j) / n, a[1] + ((b[1] - a[1]) * j) / n]
      add(from, to, deckUnder(candidates, from, to))
      from = to
    }
  }
  endRun()
  return { runs, ribbons }
}

/**
 * Routes over the landmarks' raised roads, from their `splitOnDecks`. The
 * map draws routes on the ground, which on a bridge is the water far below
 * its deck; so where a route runs along a deck it is marked `onDeck` (for
 * the map to leave out close up, where the deck is drawn) and drawn again
 * on the deck, as raised ribbons: a casing, and the route's own line over
 * it. Cheap, so it can be run again as another route is picked.
 */
export function placeOnDecks<P extends Route>(
  routes: { split: DeckSplit; properties: P }[],
): {
  ground: FeatureCollection<LineString, P & { onDeck: boolean }>
  decks: FeatureCollection<Polygon>
} {
  return {
    ground: {
      type: 'FeatureCollection',
      features: routes.flatMap(({ split, properties }) =>
        split.runs.map(({ coordinates, onDeck }) => ({
          type: 'Feature' as const,
          geometry: { type: 'LineString' as const, coordinates },
          properties: { ...properties, onDeck },
        })),
      ),
    },
    decks: {
      type: 'FeatureCollection',
      features: routes.flatMap(({ split, properties }) =>
        split.ribbons.map((feature) => {
          // The selected route over the others where they share the deck
          const lift = properties.selected ? SELECTED_LIFT : 0
          const { base, height } = feature.properties as {
            base: number
            height: number
          }
          return {
            ...feature,
            properties: {
              ...feature.properties,
              ...properties,
              base: base + lift,
              height: height + lift,
            },
          }
        }),
      ),
    },
  }
}

/** Routes over the landmarks' raised roads: `splitOnDecks` and
 *  `placeOnDecks` in one. */
export function routesOnDecks<P extends Route>(
  lines: FeatureCollection<LineString, P>,
  landmarks: Landmark[],
): {
  ground: FeatureCollection<LineString, P & { onDeck: boolean }>
  decks: FeatureCollection<Polygon>
} {
  return placeOnDecks(
    lines.features.map(({ geometry, properties }) => ({
      split: splitOnDecks(geometry.coordinates as LngLat[], landmarks),
      properties,
    })),
  )
}

/**
 * A short piece of route on a deck, as a casing and a line over it (as
 * for an alternate route: `placeOnDecks` lifts the selected one's).
 */
function ribbon(
  { near, deck, terrain }: Landmark,
  a: LngLat,
  b: LngLat,
): FeatureCollection<Polygon>['features'] {
  const [ax, ay] = metres(near, a)
  const [bx, by] = metres(near, b)
  const length = Math.hypot(bx - ax, by - ay) || 1
  const [dx, dy] = [(bx - ax) / length, (by - ay) / length]
  const height = deck!.height
  return (
    [
      ['casing', CASING, height + 0.05, height + 0.3],
      ['line', LINE, height + 0.3, height + 0.5],
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
        selected: false,
        part,
        base,
        height: top,
        // Set on the terrain as its landmark is
        ground: terrain === 'sea' ? null : near,
      },
    }
  })
}
