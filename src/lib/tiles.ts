/*
 * The z14 map tiles the app fetches OpenStreetMap data for the view in, a
 * piece of the map at a time, so each piece is asked for once.
 */

export const TILE_ZOOM = 14

export type Tile = { x: number; y: number }

const tileCount = 2 ** TILE_ZOOM

function tileX(lng: number) {
  return Math.floor(((lng + 180) / 360) * tileCount)
}

function tileY(lat: number) {
  const rad = (lat * Math.PI) / 180
  const y = (1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2
  return Math.floor(y * tileCount)
}

function tileLng(x: number) {
  return (x / tileCount) * 360 - 180
}

function tileLat(y: number) {
  const n = Math.PI - (2 * Math.PI * y) / tileCount
  return (Math.atan(Math.sinh(n)) * 180) / Math.PI
}

export const tileKey = ({ x, y }: Tile) => `${x}/${y}`

/** west, south, east, north */
export function tileBounds({ x, y }: Tile): [number, number, number, number] {
  return [tileLng(x), tileLat(y + 1), tileLng(x + 1), tileLat(y)]
}

/** Tiles covering a west, south, east, north box, nearest its centre first. */
export function tilesCovering([west, south, east, north]: [
  number,
  number,
  number,
  number,
]): Tile[] {
  const [x0, x1] = [tileX(west), tileX(east)]
  const [y0, y1] = [tileY(north), tileY(south)]
  const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2]
  const tiles: Tile[] = []
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) tiles.push({ x, y })
  }
  const distance = (t: Tile) => (t.x - cx) ** 2 + (t.y - cy) ** 2
  return tiles.sort((a, b) => distance(a) - distance(b))
}
