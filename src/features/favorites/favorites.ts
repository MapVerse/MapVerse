import { DICTIONARIES, t, type MessageKey } from '../../i18n/index.ts'
import type { StrokeName } from '../../icons/strokes.ts'
import type { Place } from '../place/place.ts'
import { categoryInfo } from '../place/categories.ts'
import { distanceMeters } from '../place/place.ts'

/** Home and work, one of each, and any number of starred places. */
export type FavoriteKind = 'home' | 'work' | 'star'

const KIND_KEYS: Record<FavoriteKind, MessageKey> = {
  home: 'saved.home',
  work: 'saved.work',
  star: 'saved.star',
}

/** What a kind of saved place is called, in the language in use. */
export const kindLabel = (kind: FavoriteKind) => t(KIND_KEYS[kind])

/** What a point on the map is named, in any language, when nothing is known of it. */
const POINT_NAMES = new Set(
  Object.values(DICTIONARIES).map((d) => d['common.selectedPoint']),
)

export const KIND_ICONS: Record<FavoriteKind, StrokeName> = {
  home: 'home',
  work: 'work',
  star: 'star',
}

/** A saved place: the place as it was when saved, and how it was saved. */
export type Favorite = {
  kind: FavoriteKind
  /** The place's own key, so it is known again wherever it shows */
  key: string
  /** The place's own name, which looking it up again goes by */
  name: string
  /** A name of one's own for it, if given */
  label?: string
  lngLat: [number, number]
  category?: string
  categoryKey?: string
  address?: string
  osm?: { type: string; id: number }
  /** A bare point on the map, rather than a place */
  point?: boolean
  /** When it was saved, in ms since 1970 */
  savedAt: number
}

/** How a saved place reads in a list: its own name for it, or the place's. */
export const favoriteTitle = (f: Favorite) =>
  f.kind === 'star' ? f.label || f.name : kindLabel(f.kind)

/** What a saved place is, under its name: the place's own name, or where. */
export function favoriteDetail(f: Favorite): string {
  const own = f.kind !== 'star' || f.label ? f.name : undefined
  const named = own && !POINT_NAMES.has(own) ? own : undefined
  const category = categoryInfo(f.categoryKey)?.label ?? f.category
  return [named, f.address ?? (named ? undefined : category)]
    .filter(Boolean)
    .join(' · ')
}

/** The place a saved one stands for, to open it as it was. */
export function favoritePlace(f: Favorite): Place {
  return {
    key: f.key,
    name: f.name,
    category: f.category,
    categoryKey: f.categoryKey,
    // A place saved without an address is looked up again
    address: f.address,
    lngLat: f.lngLat,
    osm: f.osm,
  }
}

/** A place, saved as `kind`. */
export function toFavorite(
  place: Place,
  kind: FavoriteKind,
  options: { label?: string; point?: boolean; now?: number } = {},
): Favorite {
  const label = options.label?.trim().slice(0, LABEL_MAX)
  return {
    kind,
    key: place.key,
    name: place.name,
    ...(label && label !== place.name && { label }),
    lngLat: place.lngLat,
    ...(place.category && { category: place.category }),
    ...(place.categoryKey && { categoryKey: place.categoryKey }),
    ...(place.address && { address: place.address }),
    ...(place.osm && { osm: { type: place.osm.type, id: place.osm.id } }),
    ...(options.point && { point: true }),
    savedAt: options.now ?? Date.now(),
  }
}

export const LABEL_MAX = 60
const NAME_MAX = 200
/** How close two saved places of one name may be and still be two, in m. */
const SAME_SPOT_M = 15

/** Whether two saved entries are the same place. */
export function samePlace(a: Favorite, b: Favorite): boolean {
  if (a.key === b.key) return true
  if (a.osm && b.osm) return a.osm.type === b.osm.type && a.osm.id === b.osm.id
  return a.name === b.name && distanceMeters(a.lngLat, b.lngLat) < SAME_SPOT_M
}

/** Home first, then work, then the starred, the latest first. */
export function sortFavorites(list: Favorite[]): Favorite[] {
  const rank = { home: 0, work: 1, star: 2 }
  return [...list].sort(
    (a, b) => rank[a.kind] - rank[b.kind] || b.savedAt - a.savedAt,
  )
}

/**
 * `list` with `favorite` saved in it: a place is saved once, so it
 * replaces what the place was saved as before; and there is one home and
 * one work, so a new one replaces the old.
 */
export function withFavorite(list: Favorite[], favorite: Favorite) {
  return sortFavorites([
    favorite,
    ...list.filter(
      (f) =>
        !samePlace(f, favorite) &&
        (favorite.kind === 'star' || f.kind !== favorite.kind),
    ),
  ])
}

/**
 * `list` with `incoming` added, leaving out what is saved already; a home
 * or work coming in only takes the place of none. Says how many came in.
 */
export function mergeFavorites(
  list: Favorite[],
  incoming: Favorite[],
): { list: Favorite[]; added: number } {
  const merged = [...list]
  let added = 0
  for (const favorite of incoming) {
    if (merged.some((f) => samePlace(f, favorite))) continue
    if (
      favorite.kind !== 'star' &&
      merged.some((f) => f.kind === favorite.kind)
    )
      continue
    merged.push(favorite)
    added++
  }
  return { list: sortFavorites(merged), added }
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const text = (value: unknown, max = NAME_MAX) =>
  typeof value === 'string' && value.trim()
    ? value.trim().slice(0, max)
    : undefined

const isKind = (value: unknown): value is FavoriteKind =>
  value === 'home' || value === 'work' || value === 'star'

function lngLatOf(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined
  const [lng, lat] = value
  if (!isNumber(lng) || !isNumber(lat)) return undefined
  if (Math.abs(lng) > 180 || Math.abs(lat) > 90) return undefined
  return [lng, lat]
}

function osmOf(type: unknown, id: unknown) {
  const letter =
    typeof type === 'string'
      ? ({ node: 'N', way: 'W', relation: 'R' }[type] ?? type.toUpperCase())
      : undefined
  return letter && ['N', 'W', 'R'].includes(letter) && isNumber(id) && id > 0
    ? { type: letter, id: Math.floor(id) }
    : undefined
}

/** One saved entry as stored, or undefined if it can't be one. */
function favoriteOf(entry: unknown): Favorite | undefined {
  if (!entry || typeof entry !== 'object') return undefined
  const r = entry as Record<string, unknown>
  const lngLat = lngLatOf(r.lngLat)
  const name = text(r.name)
  const key = text(r.key)
  if (!lngLat || !name || !key || !isKind(r.kind)) return undefined
  const osm =
    r.osm && typeof r.osm === 'object'
      ? osmOf(
          (r.osm as Record<string, unknown>).type,
          (r.osm as Record<string, unknown>).id,
        )
      : undefined
  const label = text(r.label, LABEL_MAX)
  const category = text(r.category)
  const categoryKey = text(r.categoryKey, 40)
  const address = text(r.address)
  return {
    kind: r.kind,
    key,
    name,
    ...(label && { label }),
    lngLat,
    ...(category && { category }),
    ...(categoryKey && { categoryKey }),
    ...(address && { address }),
    ...(osm && { osm }),
    ...(r.point === true && { point: true }),
    savedAt: isNumber(r.savedAt) ? r.savedAt : 0,
  }
}

/**
 * Saved places as stored, keeping only entries that can still be shown
 * and opened: an older version, or another tab, may have left anything.
 */
export function readFavorites(stored: string | null): Favorite[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(stored ?? '[]')
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  let list: Favorite[] = []
  for (const entry of parsed) {
    const favorite = favoriteOf(entry)
    if (favorite) list = mergeFavorites(list, [favorite]).list
  }
  return list
}
