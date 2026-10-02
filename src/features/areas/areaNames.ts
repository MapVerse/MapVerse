import { overpass, type OverpassElement } from '../../lib/overpass.ts'
import { tileBounds, type Tile } from '../../lib/tiles.ts'

/**
 * Names of residential estates (sites) and industrial areas. The map's
 * vector tiles leave these out, so they are fetched from OpenStreetMap for
 * the area in view, a tile at a time.
 */
export type AreaName = {
  id: string
  name: string
  lngLat: [number, number]
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
