import { useEffect, useState } from 'react'
import {
  getRoutes,
  NoRouteError,
  type Route,
  type TravelMode,
} from './valhalla.ts'

type Status = 'idle' | 'loading' | 'done' | 'none' | 'error'
type Result = { key: string; routes: Route[]; status: Status }

export function useRoutes(
  from: [number, number] | null,
  to: [number, number],
  mode: TravelMode,
): { routes: Route[]; status: Status } {
  const [result, setResult] = useState<Result | null>(null)
  const [fromLng, fromLat] = from ?? []
  const [toLng, toLat] = to
  const key = from && `${from}|${to}|${mode}`

  useEffect(() => {
    if (fromLng === undefined || fromLat === undefined) return
    const request = `${[fromLng, fromLat]}|${[toLng, toLat]}|${mode}`
    const controller = new AbortController()
    getRoutes([fromLng, fromLat], [toLng, toLat], mode, controller.signal)
      .then((routes) => setResult({ key: request, routes, status: 'done' }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const status = error instanceof NoRouteError ? 'none' : 'error'
        setResult({ key: request, routes: [], status })
      })
    return () => controller.abort()
  }, [fromLng, fromLat, toLng, toLat, mode])

  if (!key) return { routes: [], status: 'idle' }
  if (result?.key !== key) return { routes: [], status: 'loading' }
  return result
}
