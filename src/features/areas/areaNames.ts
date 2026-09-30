import { overpass, type OverpassElement } from '../../lib/overpass.ts'

/**
 * Names of residential estates (sites) and industrial areas. The map's
 * vector tiles leave these out, so they are fetched from OpenStreetMap for
 * the area in view, a z14 tile at a time.
 */
export type AreaName = {
  id: string
  name: string
  lngLat: [number, number]
}

export const AREA_TILE_ZOOM = 14

export type Tile = { x: number; y: number }

const tileCount = 2 ** AREA_TILE_ZOOM

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

export function buildAreaQuery(tiles: Tile[]): string {
  const parts = tiles.map((tile) => {
    const [w, s, e, n] = tileBounds(tile).map((v) => v.toFixed(5))
    return `wr["landuse"~"^(residential|industrial)$"]["name"](${s},${w},${n},${e});`
  })
  return `[out:json][timeout:20];(${parts.join('')});out center tags;`
}

export function toAreaName(element: OverpassElement): AreaName | null {
  const name = element.tags?.['name:tr'] || element.tags?.name
  if (!name || !element.center) return null
  return {
    id: `${element.type}${element.id}`,
    name,
    lngLat: [element.center.lon, element.center.lat],
  }
}

export async function fetchAreaNames(
  tiles: Tile[],
  signal?: AbortSignal,
): Promise<AreaName[]> {
  const elements = await overpass(buildAreaQuery(tiles), signal)
  return elements.map(toAreaName).filter((area) => area !== null)
}
