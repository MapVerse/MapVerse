import { useCallback, useEffect, useState } from 'react'
import {
  getRoutes,
  NoRouteError,
  type NoRouteReason,
  type Route,
  type RouteRequest,
} from './valhalla.ts'

type Status = 'idle' | 'loading' | 'done' | 'none' | 'error'
type Result = {
  key: string
  routes: Route[]
  status: Status
  /** Why there is no route, when there is none */
  reason?: NoRouteReason
}

/** How long to wait for routes before giving up, in ms. */
const TIMEOUT_MS = 20_000

/** Routes for a request, or none while there is nothing to ask. */
export function useRoutes(request: RouteRequest | null): {
  routes: Route[]
  status: Status
  reason?: NoRouteReason
  /** Asks again, as after an error */
  retry: () => void
} {
  const [result, setResult] = useState<Result | null>(null)
  // Bumped to ask again for the same routes
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  // The request by its contents, so a new but equal one doesn't ask again
  const asked = request && JSON.stringify(request)
  const key = asked && `${asked}|${attempt}`

  useEffect(() => {
    if (!asked) return
    const request = `${asked}|${attempt}`
    const controller = new AbortController()
    // A request that hangs ends as an error, rather than loading for ever
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, TIMEOUT_MS)
    getRoutes(JSON.parse(asked) as RouteRequest, controller.signal)
      .then((routes) => setResult({ key: request, routes, status: 'done' }))
      .catch((error: unknown) => {
        if (controller.signal.aborted && !timedOut) return
        setResult(
          error instanceof NoRouteError
            ? { key: request, routes: [], status: 'none', reason: error.reason }
            : { key: request, routes: [], status: 'error' },
        )
      })
      .finally(() => clearTimeout(timer))
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [asked, attempt])

  if (!key) return { routes: [], status: 'idle', retry }
  if (result?.key !== key) return { routes: [], status: 'loading', retry }
  return { ...result, retry }
}
