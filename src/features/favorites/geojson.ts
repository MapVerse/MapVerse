import type { Feature, FeatureCollection, Point } from 'geojson'
import {
  LABEL_MAX,
  mergeFavorites,
  type Favorite,
  type FavoriteKind,
} from './favorites.ts'

/** How many places a file may bring in, and how large it may be. */
const MAX_FEATURES = 2000
export const MAX_FILE_BYTES = 5_000_000

/** The symbol other GeoJSON tools (geojson.io, uMap…) draw for each kind. */
const SYMBOLS: Record<FavoriteKind, string> = {
  home: 'building',
  work: 'suitcase',
  star: 'star',
}

const LONG_TYPES: Record<string, string> = {
  N: 'node',
  W: 'way',
  R: 'relation',
}

/** Saved places as a GeoJSON file, each a point with what was saved of it. */
export function toGeoJSON(list: Favorite[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: list.map((f) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: f.lngLat },
      properties: {
        name: f.name,
        ...(f.label && { label: f.label }),
        kind: f.kind,
        'marker-symbol': SYMBOLS[f.kind],
        ...(f.category && { category: f.category }),
        ...(f.categoryKey && { categoryKey: f.categoryKey }),
        ...(f.address && { address: f.address }),
        ...(f.osm && {
          osm_type: LONG_TYPES[f.osm.type] ?? f.osm.type,
          osm_id: f.osm.id,
        }),
        ...(f.point && { point: true }),
        key: f.key,
        saved_at: new Date(f.savedAt || 0).toISOString(),
      },
    })),
  }
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const text = (value: unknown, max = 200) =>
  typeof value === 'string' && value.trim()
    ? value.trim().slice(0, max)
    : typeof value === 'number' && Number.isFinite(value)
      ? String(value)
      : undefined

/** One GeoJSON feature as a saved place, or undefined if it is not a point. */
function fromFeature(feature: unknown, now: number): Favorite | undefined {
  if (!feature || typeof feature !== 'object') return undefined
  const { type, geometry, properties } = feature as Partial<Feature>
  if (type !== 'Feature' || !geometry || geometry.type !== 'Point') return
  const [lng, lat] = geometry.coordinates ?? []
  if (!isNumber(lng) || !isNumber(lat)) return undefined
  if (Math.abs(lng) > 180 || Math.abs(lat) > 90) return undefined
  const p = (
    properties && typeof properties === 'object' ? properties : {}
  ) as Record<string, unknown>
  const kind: FavoriteKind =
    p.kind === 'home' || p.kind === 'work' ? p.kind : 'star'
  const label = text(p.label, LABEL_MAX)
  const name = text(p.name) ?? text(p.title) ?? label ?? 'Kayıtlı yer'
  const typeLetter =
    typeof p.osm_type === 'string'
      ? ({ node: 'N', way: 'W', relation: 'R' }[p.osm_type] ??
        p.osm_type.toUpperCase())
      : undefined
  const osm =
    typeLetter &&
    ['N', 'W', 'R'].includes(typeLetter) &&
    isNumber(p.osm_id) &&
    p.osm_id > 0
      ? { type: typeLetter, id: Math.floor(p.osm_id) }
      : undefined
  const point = p.point === true
  const lngLat: [number, number] = [lng, lat]
  const key =
    text(p.key) ??
    (osm
      ? `${osm.type}${osm.id}`
      : point
        ? `point:${lngLat.join()}`
        : `saved:${lngLat.join()}`)
  const savedAt = typeof p.saved_at === 'string' ? Date.parse(p.saved_at) : NaN
  const category = text(p.category)
  const categoryKey = text(p.categoryKey, 40)
  const address = text(p.address) ?? text(p.description)
  return {
    kind,
    key,
    name,
    ...(label && label !== name && { label }),
    lngLat,
    ...(category && { category }),
    ...(categoryKey && { categoryKey }),
    ...(address && { address }),
    ...(osm && { osm }),
    ...(point && { point: true }),
    savedAt: Number.isFinite(savedAt) ? savedAt : now,
  }
}

/**
 * The saved places in a GeoJSON file, its points (lines and areas are
 * left out), or null if it is not GeoJSON at all.
 */
export function fromGeoJSON(
  source: string,
  now = Date.now(),
): Favorite[] | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const root = parsed as { type?: unknown; features?: unknown }
  const features =
    root.type === 'FeatureCollection' && Array.isArray(root.features)
      ? root.features
      : root.type === 'Feature'
        ? [root]
        : null
  if (!features) return null
  const found = features
    .slice(0, MAX_FEATURES)
    .map((feature) => fromFeature(feature, now))
    .filter((f) => f !== undefined)
  // The same place twice in the file comes in once
  return mergeFavorites([], found).list
}
