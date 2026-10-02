import { useMap } from '@vis.gl/react-maplibre'
import { useEffect, useRef, useState } from 'react'
import { tileKey, tilesCovering, type Tile } from './tiles.ts'

/** At most this many tiles per request, nearest the centre first. */
const MAX_TILES = 9
const DEBOUNCE_MS = 400

/**
 * Things fetched for the map's view a tile at a time, from `minZoom` in:
 * each tile once, when the map comes to rest over it, and all of them kept
 * by their ids. `fetch` should be the same function from render to render.
 */
export function useTilesInView<T extends { id: string }>(
  minZoom: number,
  fetch: (tiles: Tile[], signal: AbortSignal) => Promise<T[]>,
): Map<string, T> {
  const { current: map } = useMap()
  const [found, setFound] = useState<Map<string, T>>(() => new Map())
  // Tiles fetched or being fetched, so each is asked for only once
  const requested = useRef(new Set<string>())

  useEffect(() => {
    if (!map) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined

    function load() {
      if (!map || map.getZoom() < minZoom) return
      const bounds = map.getBounds()
      const tiles = tilesCovering([
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ])
        .filter((tile) => !requested.current.has(tileKey(tile)))
        .slice(0, MAX_TILES)
      if (tiles.length === 0) return
      for (const tile of tiles) requested.current.add(tileKey(tile))
      fetch(tiles, controller.signal)
        .then((items) =>
          setFound((current) => {
            const next = new Map(current)
            for (const item of items) next.set(item.id, item)
            return next
          }),
        )
        .catch(() => {
          // Try these tiles again next time the map moves
          for (const tile of tiles) requested.current.delete(tileKey(tile))
        })
    }

    function schedule() {
      clearTimeout(timer)
      timer = setTimeout(load, DEBOUNCE_MS)
    }

    schedule()
    map.on('moveend', schedule)
    return () => {
      map.off('moveend', schedule)
      clearTimeout(timer)
      controller.abort()
    }
  }, [map, minZoom, fetch])

  return found
}
