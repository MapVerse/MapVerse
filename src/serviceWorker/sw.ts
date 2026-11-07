// The service worker: keeps the app's own files so it opens offline, and
// the map files it has shown, so places seen before still draw. Built into
// sw.js by build/serviceWorker.ts, which fills in what follows.
import { handlingFor, tilesToDrop } from './policy.ts'

/** The app's files, relative to where the worker is served from */
declare const __PRECACHE__: string[]
/** Changes whenever any of those files do */
declare const __SW_VERSION__: string

const sw = self as unknown as ServiceWorkerGlobalScope

const SHELL = `mapverse-shell-${__SW_VERSION__}`
const TILES = 'mapverse-tiles-v1'
const scope = sw.registration.scope
const shellUrls = __PRECACHE__.map((file) => new URL(file, scope).href)
const precached = new Set(shellUrls)
const indexUrl = new URL('index.html', scope).href

sw.addEventListener('install', (event) => {
  // A new version waits until the page says to take over (its "Yenile")
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(shellUrls)))
})

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith('mapverse-shell-') && name !== SHELL)
          await caches.delete(name)
      }
      await trim()
      // The page that installed the worker keeps its map files from now on
      await sw.clients.claim()
    })(),
  )
})

sw.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING')
    void sw.skipWaiting()
})

sw.addEventListener('fetch', (event) => {
  const { request } = event
  const handling = handlingFor(request, scope, precached)
  if (handling === 'shell') event.respondWith(fromShell(request.url, request))
  else if (handling === 'page') event.respondWith(fromShell(indexUrl, request))
  else if (handling === 'tiles') event.respondWith(fromTiles(event))
})

/** One of the app's files as installed, or from the network if it's gone. */
async function fromShell(url: string, request: Request): Promise<Response> {
  const cache = await caches.open(SHELL)
  const kept = await cache.match(url, { ignoreSearch: true })
  return kept ?? fetch(request)
}

/**
 * A map file as last fetched, if there is one, refreshed meanwhile for
 * next time; else fetched, and kept. Refreshed, a file goes to the back
 * of the line, so the ones let go of first are those least recently seen.
 */
async function fromTiles(event: FetchEvent): Promise<Response> {
  const { request } = event
  const cache = await caches.open(TILES)
  const kept = await cache.match(request.url)
  const fresh = fetch(request).then(async (response) => {
    if (response.ok) {
      const copy = response.clone()
      event.waitUntil(
        (async () => {
          await cache.delete(request.url)
          await cache.put(request.url, copy)
          if (++puts % TRIM_EVERY === 0) await trim()
        })(),
      )
    }
    return response
  })
  if (!kept) return fresh
  event.waitUntil(fresh.then(noop, noop))
  return kept
}

const noop = () => {}

// Trimming counts every kept file, so it's done only now and then, and
// whenever a new version takes over
const TRIM_EVERY = 100
let puts = 0

async function trim() {
  const cache = await caches.open(TILES)
  const keys = await cache.keys()
  // Kept in the order they were put in, the oldest first
  const drop = keys.slice(0, tilesToDrop(keys.length))
  await Promise.all(drop.map((key) => cache.delete(key)))
}
