/*
 * The z14 map tiles the app fetches OpenStreetMap data for the view in, a
 * piece of the map at a time, so each piece is asked for once.
 */

export const TILE_ZOOM = 14

export type Tile = { x: number; y: number }

const tileCount = 2 ** TILE_ZOOM

/** Web Mercator stops here: beyond it, tiles don't exist. */
const MAX_LAT = 85.0511

const wrapX = (x: number) => ((x % tileCount) + tileCount) % tileCount
const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v))

/** Where a longitude falls in tile units, not wrapped into the world. */
const unwrappedX = (lng: number) => ((lng + 180) / 360) * tileCount

function positionY(lat: number) {
  const rad = (clamp(lat, -MAX_LAT, MAX_LAT) * Math.PI) / 180
  return ((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * tileCount
}

const tileY = (lat: number) =>
  clamp(Math.floor(positionY(lat)), 0, tileCount - 1)

/**
 * Where a point falls in tile units, fractions included: wrapped into the
 * world across the antimeridian, and kept within Web Mercator's latitudes.
 */
export function tilePosition(lng: number, lat: number): Tile {
  return {
    x: wrapX(unwrappedX(lng)),
    y: clamp(positionY(lat), 0, tileCount),
  }
}

/** Distance in tiles between two positions, the short way round the world. */
export function tileDistance(a: Tile, b: Tile): number {
  const dx = Math.abs(wrapX(a.x) - wrapX(b.x))
  return Math.hypot(Math.min(dx, tileCount - dx), a.y - b.y)
}

/** A tile's middle, in tile units. */
export const tileCenter = ({ x, y }: Tile): Tile => ({ x: x + 0.5, y: y + 0.5 })

function tileLng(x: number) {
  return (x / tileCount) * 360 - 180
}

function tileLat(y: number) {
  const n = Math.PI - (2 * Math.PI * y) / tileCount
  return (Math.atan(Math.sinh(n)) * 180) / Math.PI
}

export const tileKey = ({ x, y }: Tile) => `${x}/${y}`

/** west, south, east, north */
export function tileBounds(tile: Tile): [number, number, number, number] {
  const x = wrapX(Math.floor(tile.x))
  const y = clamp(Math.floor(tile.y), 0, tileCount - 1)
  return [tileLng(x), tileLat(y + 1), tileLng(x + 1), tileLat(y)]
}

/**
 * Tiles covering a west, south, east, north box, nearest `center` (a
 * longitude and latitude) first, or nearest the box's centre without one.
 * The box may run past ±180° where the map shows copies of the world; the
 * tiles are wrapped back into it, each once.
 */
export function tilesCovering(
  [west, south, east, north]: [number, number, number, number],
  center?: [number, number],
): Tile[] {
  let [x0, x1] = [Math.floor(unwrappedX(west)), Math.floor(unwrappedX(east))]
  if (x1 < x0) [x0, x1] = [x1, x0]
  if (x1 - x0 + 1 >= tileCount) [x0, x1] = [0, tileCount - 1]
  const [y0, y1] = [tileY(north), tileY(south)]
  const middle = center
    ? tilePosition(...center)
    : { x: (x0 + x1) / 2 + 0.5, y: (y0 + y1) / 2 + 0.5 }
  const tiles: Tile[] = []
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) tiles.push({ x: wrapX(x), y })
  }
  const distance = (t: Tile) => tileDistance(tileCenter(t), middle)
  return tiles.sort((a, b) => distance(a) - distance(b))
}
