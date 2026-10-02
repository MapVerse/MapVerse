import { overpass, type OverpassElement } from '../../lib/overpass.ts'
import { tileBounds, type Tile } from '../../lib/tiles.ts'

/**
 * Traffic lights, at junctions and at pedestrian crossings. The map's
 * vector tiles leave them out, so they are fetched from OpenStreetMap for
 * the area in view, a tile at a time.
 */
export type TrafficSignal = {
  id: string
  lngLat: [number, number]
  /** Lights for people crossing, rather than for a junction */
  crossing: boolean
}

export function buildSignalQuery(tiles: Tile[]): string {
  const parts = tiles.map((tile) => {
    const [w, s, e, n] = tileBounds(tile).map((v) => v.toFixed(5))
    const box = `(${s},${w},${n},${e})`
    return `node["highway"="traffic_signals"]${box};node["crossing"="traffic_signals"]${box};`
  })
  return `[out:json][timeout:20];(${parts.join('')});out;`
}

export function toTrafficSignal(
  element: OverpassElement,
): TrafficSignal | null {
  if (element.type !== 'node' || element.lat == null || element.lon == null) {
    return null
  }
  return {
    id: `node${element.id}`,
    lngLat: [element.lon, element.lat],
    crossing: element.tags?.highway !== 'traffic_signals',
  }
}

export async function fetchTrafficSignals(
  tiles: Tile[],
  signal?: AbortSignal,
): Promise<TrafficSignal[]> {
  const elements = await overpass(buildSignalQuery(tiles), signal)
  return elements.map(toTrafficSignal).filter((light) => light !== null)
}
