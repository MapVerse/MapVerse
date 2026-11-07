// OpenStreetMap data through public Overpass instances; they need no key

import { OVERPASS_URLS } from './endpoints.ts'

export type OverpassElement = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  /** For ways and relations asked for with `out center` */
  center?: { lat: number; lon: number }
  /** For ways asked for with `out geom`: their points in turn */
  geometry?: { lat: number; lon: number }[]
  /** For relations asked for with `out geom`: their members, ways drawn */
  members?: {
    type: 'node' | 'way' | 'relation'
    ref: number
    role: string
    geometry?: { lat: number; lon: number }[]
  }[]
  tags?: Record<string, string>
}

/** A request Overpass turned down, or that didn't finish. */
export class OverpassError extends Error {
  /** The HTTP status, when the server answered with one */
  readonly status?: number
  /** For a rate limit: how long to leave it before asking again */
  readonly retryAfterMs?: number

  constructor(
    message: string,
    options: { status?: number; retryAfterMs?: number } = {},
  ) {
    super(message)
    this.name = 'OverpassError'
    this.status = options.status
    this.retryAfterMs = options.retryAfterMs
  }
}

// Tried in turn, so one being busy or down doesn't stop the app
const ENDPOINTS = OVERPASS_URLS

/** Longer than any query's own [timeout:…], so the server gives up first. */
export const TIMEOUT_MS = 25_000
/** Left alone this long after a 429 that doesn't say for how long. */
export const RATE_LIMIT_MS = 30_000
const MAX_RATE_LIMIT_MS = 10 * 60_000

// When each endpoint, having said it was too busy, may be asked again
const coolingUntil = new Map<string, number>()

/** A Retry-After header's wait in milliseconds: seconds, or a date. */
export function parseRetryAfter(
  value: string | null,
  now = Date.now(),
): number | undefined {
  if (!value?.trim()) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000)
  const date = Date.parse(value)
  return Number.isNaN(date) ? undefined : Math.max(0, date - now)
}

/*
 * One request at a time, from the whole app: public instances allow a
 * couple of slots per address and answer more with 429. A job whose signal
 * is aborted while it waits leaves the queue at once, never sent.
 */
const queue: { start: () => void; background: boolean }[] = []
let running = false

function pump() {
  if (running) return
  const next = queue.shift()
  if (!next) return
  running = true
  next.start()
}

function exclusive<T>(
  task: () => Promise<T>,
  signal: AbortSignal | undefined,
  background: boolean,
) {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const onAbort = () => {
      const at = queue.findIndex((job) => job.start === start)
      if (at < 0) return
      queue.splice(at, 1)
      reject(signal?.reason)
    }
    const start = () => {
      signal?.removeEventListener('abort', onAbort)
      task()
        .then(resolve, reject)
        .finally(() => {
          running = false
          pump()
        })
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    // What the person asked for goes ahead of background tile fetches
    const job = { start, background }
    const at = background ? -1 : queue.findIndex((j) => j.background)
    if (at < 0) queue.push(job)
    else queue.splice(at, 0, job)
    pump()
  })
}

/**
 * Runs an Overpass QL query that asks for JSON output. Fails with an
 * OverpassError when the server is too busy, gives an error, or takes
 * longer than TIMEOUT_MS; with the signal's reason when it is aborted.
 */
export function overpass(
  query: string,
  signal?: AbortSignal,
  { background = false }: { background?: boolean } = {},
): Promise<OverpassElement[]> {
  return exclusive(() => request(query, signal), signal, background)
}

async function request(query: string, signal?: AbortSignal) {
  const now = Date.now()
  const ready = ENDPOINTS.filter((e) => (coolingUntil.get(e) ?? 0) <= now)
  if (ready.length === 0) {
    const until = Math.min(...ENDPOINTS.map((e) => coolingUntil.get(e) ?? 0))
    throw new OverpassError('Overpass is rate limiting us', {
      status: 429,
      retryAfterMs: until - now,
    })
  }
  let failure: unknown
  for (const endpoint of ready) {
    try {
      return await attempt(endpoint, query, signal)
    } catch (error) {
      if (signal?.aborted) throw error
      // Too busy for us: the next request goes to another endpoint, but
      // this one isn't sent on at once, which would only double the load
      if (error instanceof OverpassError && error.status === 429) throw error
      failure = error
    }
  }
  throw failure
}

async function attempt(
  endpoint: string,
  query: string,
  signal?: AbortSignal,
): Promise<OverpassElement[]> {
  const controller = new AbortController()
  const timedOut = new OverpassError('Overpass request timed out')
  const timer = setTimeout(() => controller.abort(timedOut), TIMEOUT_MS)
  const onAbort = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', onAbort, { once: true })
  if (signal?.aborted) onAbort()
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      body: new URLSearchParams({ data: query }),
      signal: controller.signal,
    })
    if (res.status === 429) {
      const wait = Math.min(
        parseRetryAfter(res.headers.get('Retry-After')) ?? RATE_LIMIT_MS,
        MAX_RATE_LIMIT_MS,
      )
      coolingUntil.set(endpoint, Date.now() + wait)
      throw new OverpassError('Overpass rate limit', {
        status: 429,
        retryAfterMs: wait,
      })
    }
    if (!res.ok) {
      throw new OverpassError(`Overpass request failed: ${res.status}`, {
        status: res.status,
      })
    }
    const data = (await res.json()) as {
      elements?: OverpassElement[]
      remark?: string
    }
    // Out of time or memory, it still answers 200, with what it had so far
    if (data.remark && /error/i.test(data.remark)) {
      throw new OverpassError(`Overpass: ${data.remark}`)
    }
    return data.elements ?? []
  } catch (error) {
    if (controller.signal.reason === timedOut) throw timedOut
    throw error
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}
