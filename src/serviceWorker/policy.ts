// Which requests the service worker answers, and how. Kept apart from the
// worker itself so it can be tested.

/** Map style, tiles, glyphs and sprites all come from here. */
export const TILE_HOST = 'tiles.openfreemap.org'

/** How many map files are kept for offline use, at most. */
export const MAX_TILES = 2000

/**
 * How the worker answers a request: from the app's own files, kept when
 * it was installed (`shell`); with the app's page itself (`page`); from
 * the map files kept as they were last fetched, refreshed meanwhile
 * (`tiles`); or not at all, leaving it to the network (null). Searches,
 * places' details, outlines and routes are never kept: they are always
 * asked afresh.
 */
export type Handling = 'shell' | 'page' | 'tiles' | null

export function handlingFor(
  request: { method: string; url: string; mode?: string },
  scope: string,
  precached: ReadonlySet<string>,
): Handling {
  if (request.method !== 'GET') return null
  let url: URL
  try {
    url = new URL(request.url)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (url.host === TILE_HOST) return 'tiles'

  const root = new URL(scope)
  if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname))
    return null
  const path = url.pathname.slice(root.pathname.length)
  if (request.mode === 'navigate')
    return path === '' || path === 'index.html' ? 'page' : null
  return precached.has(`${url.origin}${url.pathname}`) ? 'shell' : null
}

/**
 * How many of the oldest map files to let go of, once there are more than
 * the most kept: down to nine tenths of it, so this isn't done after
 * every tile.
 */
export function tilesToDrop(count: number, max = MAX_TILES): number {
  return count > max ? count - Math.floor(max * 0.9) : 0
}
