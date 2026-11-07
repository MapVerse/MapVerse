import type { Mode } from './transit.ts'
import { parseLocal } from './when.ts'
import type { Avoid, When } from './valhalla.ts'

/** A point of shared directions; null for the opener's own location. */
export type SharedPoint = { name: string; lngLat: [number, number] } | null

/** Directions as shared in a link: from the start, through any stops, to
 *  the destination, how to travel and when. */
export type SharedDirections = {
  points: SharedPoint[]
  mode: Mode
  avoid: Avoid
  when: When
}

/** The query parameter shared directions travel in. */
export const DIRECTIONS_PARAM = 'dir'

/** Start and destination, and up to this many stops between. */
export const MAX_STOPS = 3

const MODES: readonly Mode[] = ['auto', 'pedestrian', 'bicycle', 'transit']
const NAME_LENGTH = 80

// As written in the link, kept short: [lat, lng, name] or 0 for "my
// location", the mode, the roads avoided as letters, and the time
type Packed = {
  p: ([number, number, string] | 0)[]
  m: Mode
  a?: string
  w?: ['d' | 'a', string]
}

const round = (n: number) => Math.round(n * 1e5) / 1e5

function toBase64Url(text: string): string {
  let binary = ''
  for (const byte of new TextEncoder().encode(text)) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): string {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(
    Uint8Array.from(binary, (c) => c.charCodeAt(0)),
  )
}

/** Directions packed into a short, link-safe text. */
export function encodeDirections(directions: SharedDirections): string {
  const { points, mode, avoid, when } = directions
  const packed: Packed = {
    p: points.map((point) =>
      point
        ? [
            round(point.lngLat[1]),
            round(point.lngLat[0]),
            point.name.slice(0, NAME_LENGTH),
          ]
        : 0,
    ),
    m: mode,
  }
  const avoided =
    (avoid.tolls ? 't' : '') +
    (avoid.highways ? 'h' : '') +
    (avoid.ferries ? 'f' : '')
  if (avoided) packed.a = avoided
  if (when.kind !== 'now') {
    packed.w = [when.kind === 'depart' ? 'd' : 'a', when.at]
  }
  return toBase64Url(JSON.stringify(packed))
}

const isLat = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 90
const isLng = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 180

function readPoint(value: unknown): SharedPoint | undefined {
  if (value === 0) return null
  if (!Array.isArray(value)) return undefined
  const [lat, lng, name] = value as unknown[]
  if (!isLat(lat) || !isLng(lng)) return undefined
  return {
    name:
      typeof name === 'string' && name.trim()
        ? name.slice(0, NAME_LENGTH)
        : 'Paylaşılan nokta',
    lngLat: [lng, lat],
  }
}

/** Directions read back from a link, or null if it holds none that work. */
export function decodeDirections(text: string): SharedDirections | null {
  let packed: Partial<Packed>
  try {
    packed = JSON.parse(fromBase64Url(text)) as Partial<Packed>
  } catch {
    return null
  }
  if (!packed || typeof packed !== 'object' || !Array.isArray(packed.p)) {
    return null
  }
  if (packed.p.length < 2 || packed.p.length > MAX_STOPS + 2) return null
  const points = packed.p.map(readPoint)
  if (points.some((p) => p === undefined)) return null
  // Only one of them can be where the opener is, and the destination is set
  const mine = points.filter((p) => p === null).length
  if (mine > 1 || points.at(-1) === null) return null
  const mode = MODES.includes(packed.m as Mode) ? (packed.m as Mode) : 'auto'
  const a = typeof packed.a === 'string' ? packed.a : ''
  const w = packed.w
  const when: When =
    Array.isArray(w) &&
    (w[0] === 'd' || w[0] === 'a') &&
    typeof w[1] === 'string' &&
    parseLocal(w[1])
      ? { kind: w[0] === 'd' ? 'depart' : 'arrive', at: w[1] }
      : { kind: 'now' }
  return {
    points: points as SharedPoint[],
    mode,
    avoid: {
      tolls: a.includes('t'),
      highways: a.includes('h'),
      ferries: a.includes('f'),
    },
    when,
  }
}

/** A link that opens the app with these directions. */
export function directionsUrl(
  directions: SharedDirections,
  base = `${location.origin}${location.pathname}`,
): string {
  return `${base}?${DIRECTIONS_PARAM}=${encodeDirections(directions)}`
}

/**
 * Takes shared directions out of a page's query string: what they are,
 * and the query string left without them.
 */
export function readDirectionsParam(search: string): {
  directions: SharedDirections | null
  rest: string
} {
  const params = new URLSearchParams(search)
  const value = params.get(DIRECTIONS_PARAM)
  if (value === null) return { directions: null, rest: search }
  params.delete(DIRECTIONS_PARAM)
  const rest = params.toString()
  return { directions: decodeDirections(value), rest: rest ? `?${rest}` : '' }
}

let taken: SharedDirections | null | undefined

/**
 * Shared directions the page was opened with, read once: the parameter is
 * then taken off the address, leaving the rest of it (the map's place in
 * its hash) as it was.
 */
export function takeSharedDirections(): SharedDirections | null {
  if (taken !== undefined) return taken
  const { directions, rest } = readDirectionsParam(location.search)
  taken = directions
  if (rest !== location.search) {
    history.replaceState(
      history.state,
      '',
      `${location.pathname}${rest}${location.hash}`,
    )
  }
  return taken
}
