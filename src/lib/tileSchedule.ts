import {
  tileCenter,
  tileDistance,
  tileKey,
  tilePosition,
  type Tile,
} from './tiles.ts'

/*
 * Which of the view's tiles to fetch next, and what has been found in them:
 * kept apart from the map so it can be tested without one.
 */

/** A failed tile waits this long before it is tried again, doubling… */
export const BASE_RETRY_MS = 5_000
/** …up to this. */
export const MAX_RETRY_MS = 5 * 60_000

/** How long a tile that has failed `failures` times in a row waits. */
export function retryDelay(failures: number, retryAfterMs = 0): number {
  const backoff = Math.min(BASE_RETRY_MS * 2 ** (failures - 1), MAX_RETRY_MS)
  return Math.max(backoff, retryAfterMs)
}

type Entry =
  | { state: 'loading'; failures: number }
  | { state: 'done' }
  | { state: 'failed'; failures: number; retryAt: number }

type Located = { id: string; lngLat: [number, number] }

export class TileSchedule<T extends Located> {
  private tiles = new Map<string, Entry & { tile: Tile }>()
  private items = new Map<string, { item: T; at: Tile }>()

  /** Up to `max` of the view's tiles, in turn, not fetched, being fetched or waiting to retry. */
  due(view: Tile[], now: number, max: number): Tile[] {
    return view
      .filter((tile) => {
        const entry = this.tiles.get(tileKey(tile))
        return !entry || (entry.state === 'failed' && entry.retryAt <= now)
      })
      .slice(0, max)
  }

  /** When the soonest of the view's failed tiles may be tried again. */
  nextRetry(view: Tile[]): number | undefined {
    let soonest: number | undefined
    for (const tile of view) {
      const entry = this.tiles.get(tileKey(tile))
      if (entry?.state === 'failed') {
        soonest = Math.min(soonest ?? Infinity, entry.retryAt)
      }
    }
    return soonest
  }

  start(tiles: Tile[]) {
    for (const tile of tiles) {
      const entry = this.tiles.get(tileKey(tile))
      const failures = entry && 'failures' in entry ? entry.failures : 0
      this.tiles.set(tileKey(tile), { state: 'loading', failures, tile })
    }
  }

  /** The tiles are in, with these things found in them. */
  succeed(tiles: Tile[], items: T[]) {
    for (const tile of tiles) {
      this.tiles.set(tileKey(tile), { state: 'done', tile })
    }
    for (const item of items) {
      this.items.set(item.id, { item, at: tilePosition(...item.lngLat) })
    }
  }

  /** The tiles failed: each waits longer before it is tried again. */
  fail(tiles: Tile[], now: number, retryAfterMs?: number) {
    for (const tile of tiles) {
      const entry = this.tiles.get(tileKey(tile))
      const failures = (entry && 'failures' in entry ? entry.failures : 0) + 1
      const retryAt = now + retryDelay(failures, retryAfterMs)
      this.tiles.set(tileKey(tile), {
        state: 'failed',
        failures,
        retryAt,
        tile,
      })
    }
  }

  /** The tiles were given up on, not failed: they can be asked for again. */
  cancel(tiles: Tile[]) {
    for (const tile of tiles) {
      const entry = this.tiles.get(tileKey(tile))
      if (entry?.state !== 'loading') continue
      if (entry.failures === 0) this.tiles.delete(tileKey(tile))
      // It failed before: it can go again, without waiting
      else
        this.tiles.set(tileKey(tile), { ...entry, state: 'failed', retryAt: 0 })
    }
  }

  /**
   * Forgets tiles, and the things in them, more than `radius` tiles from
   * `center` (a longitude and latitude), so what is kept stays bounded. Tiles
   * being fetched are left alone. Says whether any things went.
   */
  evict(center: [number, number], radius: number): boolean {
    const middle = tilePosition(...center)
    for (const [key, entry] of this.tiles) {
      if (entry.state === 'loading') continue
      if (tileDistance(tileCenter(entry.tile), middle) > radius) {
        this.tiles.delete(key)
      }
    }
    let changed = false
    for (const [id, { at }] of this.items) {
      if (tileDistance(at, middle) > radius + 1) {
        this.items.delete(id)
        changed = true
      }
    }
    return changed
  }

  /** Everything found and kept, by id. */
  found(): Map<string, T> {
    return new Map([...this.items].map(([id, { item }]) => [id, item]))
  }
}
