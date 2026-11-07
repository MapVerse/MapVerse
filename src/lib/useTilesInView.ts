import { useMap } from '@vis.gl/react-maplibre'
import { useEffect, useRef, useState } from 'react'
import { OverpassError } from './overpass.ts'
import { TileSchedule } from './tileSchedule.ts'
import { tileKey, tilesCovering, type Tile } from './tiles.ts'

/** At most this many tiles per request, nearest the centre first. */
const MAX_TILES = 9
/** Only this many of the view's tiles, nearest the centre: with the map
 * pitched, the view runs far off towards the horizon. */
const MAX_VIEW_TILES = 36
/** What was found this many tiles or more from the centre is let go. */
const KEEP_RADIUS = 6
const DEBOUNCE_MS = 400

/**
 * Things fetched for the map's view a tile at a time, from `minZoom` in:
 * each tile once, when the map comes to rest over it, and those near the
 * view kept by their ids. A tile that fails is tried again later, waiting
 * longer each time; one batch of tiles is asked for at a time, and a batch
 * the map has moved away from is given up on. `fetch` should be the same
 * function from render to render.
 */
export function useTilesInView<
  T extends { id: string; lngLat: [number, number] },
>(
  minZoom: number,
  fetch: (tiles: Tile[], signal: AbortSignal) => Promise<T[]>,
): Map<string, T> {
  const { current: map } = useMap()
  const [found, setFound] = useState<Map<string, T>>(() => new Map())
  const scheduleRef = useRef<TileSchedule<T>>(null)

  useEffect(() => {
    if (!map) return
    const schedule = (scheduleRef.current ??= new TileSchedule<T>())
    let timer: ReturnType<typeof setTimeout> | undefined
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let inFlight: { tiles: Tile[]; controller: AbortController } | null = null

    function giveUp() {
      if (!inFlight) return
      inFlight.controller.abort()
      schedule.cancel(inFlight.tiles)
      inFlight = null
    }

    function load() {
      clearTimeout(retryTimer)
      if (!map) return
      if (map.getZoom() < minZoom) return giveUp()
      const bounds = map.getBounds()
      const { lng, lat } = map.getCenter()
      const view = tilesCovering(
        [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ],
        [lng, lat],
      ).slice(0, MAX_VIEW_TILES)

      if (inFlight) {
        const inView = new Set(view.map(tileKey))
        // Still wanted: when it's in, this runs again for the rest
        if (inFlight.tiles.some((t) => inView.has(tileKey(t)))) return
        giveUp()
      }
      if (schedule.evict([lng, lat], KEEP_RADIUS)) setFound(schedule.found())

      const now = Date.now()
      const tiles = schedule.due(view, now, MAX_TILES)
      if (tiles.length === 0) {
        const retryAt = schedule.nextRetry(view)
        if (retryAt !== undefined) {
          retryTimer = setTimeout(load, Math.max(0, retryAt - now))
        }
        return
      }

      schedule.start(tiles)
      const batch = { tiles, controller: new AbortController() }
      inFlight = batch
      const { signal } = batch.controller
      fetch(tiles, signal)
        .then(
          (items) => {
            if (signal.aborted) return
            schedule.succeed(tiles, items)
            setFound(schedule.found())
          },
          (error: unknown) => {
            if (signal.aborted) return
            const retryAfter =
              error instanceof OverpassError ? error.retryAfterMs : undefined
            schedule.fail(tiles, Date.now(), retryAfter)
          },
        )
        .finally(() => {
          if (inFlight !== batch) return
          inFlight = null
          // On to the view's other tiles, if any are left
          load()
        })
    }

    function later() {
      clearTimeout(timer)
      timer = setTimeout(load, DEBOUNCE_MS)
    }

    later()
    map.on('moveend', later)
    return () => {
      map.off('moveend', later)
      clearTimeout(timer)
      clearTimeout(retryTimer)
      giveUp()
    }
  }, [map, minZoom, fetch])

  return found
}
