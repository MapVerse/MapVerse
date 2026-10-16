import type { MultiPolygon, Position } from 'geojson'
import { overpass, type OverpassElement } from '../../lib/overpass.ts'
import type { Place } from './place.ts'

/**
 * Kinds of place that are often an area on the map rather than a point,
 * as OpenMapTiles names them (after OpenStreetMap's tag values): looked
 * for as an area round a place picked on the map.
 */
const AREA_KINDS = new Set([
  'park',
  'garden',
  'playground',
  'dog_park',
  'pitch',
  'stadium',
  'sports_centre',
  'track',
  'golf_course',
  'nature_reserve',
  'recreation_ground',
  'zoo',
  'theme_park',
  'water_park',
  'school',
  'college',
  'university',
  'kindergarten',
  'hospital',
  'cemetery',
  'grave_yard',
  'place_of_worship',
  'museum',
  'castle',
  'fort',
  'ruins',
  'attraction',
  'parking',
  'marketplace',
  'mall',
  'camp_site',
  'prison',
  'townhall',
  'courthouse',
  'library',
  'theatre',
  'bus_station',
])

/** The keys a kind of place may be tagged under in OpenStreetMap. */
const KEYS =
  'leisure|amenity|tourism|landuse|historic|shop|building|sport|aeroway'

const ELEMENTS = { W: 'way', R: 'relation' } as const

/** What a place picked on the map is, as OpenMapTiles has it. */
export type PlaceKind = { class?: string; subclass?: string }

/** The kind of area to look for round a place, if it is likely one. */
export function areaKind({ class: klass, subclass }: PlaceKind) {
  const kind = [subclass, klass].find((k) => k && AREA_KINDS.has(k))
  return kind?.replace(/[^a-z_]/g, '')
}

/**
 * The Overpass query for a place's area: by its element when it is known
 * to be a way or relation, as for search results, or else the areas of
 * its kind that it lies in.
 */
export function areaQuery(
  place: Pick<Place, 'lngLat' | 'osm'>,
  kind?: string,
): string | null {
  const head = '[out:json][timeout:12];'
  const element = place.osm && ELEMENTS[place.osm.type as 'W' | 'R']
  if (element) return `${head}${element}(${place.osm!.id});out geom;`
  if (!kind) return null
  const [lng, lat] = place.lngLat
  const filter = `(pivot.a)[~"^(${KEYS})$"~"^${kind}$"]`
  return `${head}is_in(${lat.toFixed(6)},${lng.toFixed(6)})->.a;(way${filter};relation${filter};);out geom;`
}

const same = (a: Position, b: Position) => a[0] === b[0] && a[1] === b[1]

/** Joins pieces of line into closed rings, as a relation's ways are. */
export function joinRings(pieces: Position[][]): Position[][] {
  const left = pieces.filter((p) => p.length > 1).map((p) => [...p])
  const rings: Position[][] = []
  while (left.length) {
    const ring = left.pop()!
    while (!same(ring[0], ring[ring.length - 1])) {
      const end = ring[ring.length - 1]
      const i = left.findIndex(
        (p) => same(p[0], end) || same(p[p.length - 1], end),
      )
      if (i < 0) break
      const [next] = left.splice(i, 1)
      ring.push(...(same(next[0], end) ? next : next.reverse()).slice(1))
    }
    if (ring.length > 3 && same(ring[0], ring[ring.length - 1])) {
      rings.push(ring)
    }
  }
  return rings
}

/** Whether a point lies in a ring (even-odd rule). */
function inside([x, y]: Position, ring: Position[]) {
  let hit = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      hit = !hit
    }
  }
  return hit
}

/** A ring's area, in square degrees: enough to tell which is smaller. */
function ringArea(ring: Position[]) {
  let sum = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1])
  }
  return Math.abs(sum / 2)
}

const line = (points: { lat: number; lon: number }[]): Position[] =>
  points.map(({ lat, lon }) => [lon, lat])

/** An element's shape, if it is an area: a closed way, or a multipolygon. */
export function elementShape(element: OverpassElement): MultiPolygon | null {
  if (element.type === 'way' && element.geometry) {
    const [ring] = joinRings([line(element.geometry)])
    return ring ? { type: 'MultiPolygon', coordinates: [[ring]] } : null
  }
  if (element.type !== 'relation' || !element.members) return null
  const ways = (role: string) =>
    element.members!.filter(
      (m) => m.type === 'way' && m.geometry && m.role === role,
    )
  const outers = joinRings(
    [...ways('outer'), ...ways('')].map((m) => line(m.geometry!)),
  )
  if (!outers.length) return null
  const polygons: Position[][][] = outers.map((outer) => [outer])
  for (const hole of joinRings(ways('inner').map((m) => line(m.geometry!)))) {
    polygons.find(([outer]) => inside(hole[0], outer))?.push(hole)
  }
  return { type: 'MultiPolygon', coordinates: polygons }
}

const shapeArea = (shape: MultiPolygon) =>
  shape.coordinates.reduce((sum, [outer]) => sum + ringArea(outer), 0)

/**
 * The area that is the place: the one of its name if it has one, or else
 * the smallest of those found, the one most closely round it.
 */
export function pickArea(
  elements: OverpassElement[],
  place: Pick<Place, 'name'>,
): MultiPolygon | null {
  const shapes = elements
    .map((element) => ({ element, shape: elementShape(element) }))
    .filter((s): s is { element: OverpassElement; shape: MultiPolygon } =>
      Boolean(s.shape),
    )
  const named = shapes.find(({ element: { tags } }) =>
    [tags?.name, tags?.['name:tr']].includes(place.name),
  )
  if (named) return named.shape
  return (
    shapes.sort((a, b) => shapeArea(a.shape) - shapeArea(b.shape))[0]?.shape ??
    null
  )
}

const cache = new Map<string, Promise<MultiPolygon | null>>()

/** A place's shape on the ground, if it is an area: null if not, or unknown. */
export function fetchPlaceArea(
  place: Place,
  kind: PlaceKind = {},
): Promise<MultiPolygon | null> {
  const known = cache.get(place.key)
  if (known) return known
  const query = areaQuery(place, areaKind(kind))
  if (!query) return Promise.resolve(null)
  const found = overpass(query).then((elements) => pickArea(elements, place))
  cache.set(place.key, found)
  // Asked again after a failure, it is tried again
  found.catch(() => cache.delete(place.key))
  return found
}
