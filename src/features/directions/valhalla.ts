import { decodePolyline6 } from './directions.ts'

export type TravelMode = 'auto' | 'pedestrian' | 'bicycle'

export type Maneuver = {
  instruction: string
  type: number
  meters: number
  seconds: number
  /** The streets it runs along */
  streets: string[]
  /** Where it starts, as an index into its route's shape */
  at: number
}

export type Route = {
  meters: number
  seconds: number
  shape: [number, number][]
  maneuvers: Maneuver[]
}

type ValhallaTrip = {
  summary: { length: number; time: number }
  legs: {
    shape: string
    maneuvers: {
      instruction: string
      type: number
      length: number
      time: number
      street_names?: string[]
      begin_shape_index?: number
    }[]
  }[]
}

export type ValhallaResponse = {
  trip: ValhallaTrip
  alternates?: { trip: ValhallaTrip }[]
}

// The public FOSSGIS server is meant for light use; point this at your own
// Valhalla instance for anything more.
const API =
  import.meta.env.VITE_VALHALLA_URL ?? 'https://valhalla1.openstreetmap.de'

/** Valhalla found no way between the two points. */
export class NoRouteError extends Error {}

export async function getRoutes(
  from: [number, number],
  to: [number, number],
  mode: TravelMode,
  signal?: AbortSignal,
): Promise<Route[]> {
  const request = {
    locations: [from, to].map(([lon, lat]) => ({ lon, lat })),
    costing: mode,
    alternates: 2,
    directions_options: { units: 'kilometers', language: 'tr-TR' },
  }
  // A GET keeps this a simple CORS request, without a preflight
  const res = await fetch(
    `${API}/route?json=${encodeURIComponent(JSON.stringify(request))}`,
    { signal },
  )
  if (res.status === 400) throw new NoRouteError(await res.text())
  if (!res.ok) throw new Error(`Valhalla request failed: ${res.status}`)
  return parseRoutes((await res.json()) as ValhallaResponse)
}

export function parseRoutes(data: ValhallaResponse): Route[] {
  return [data.trip, ...(data.alternates ?? []).map((a) => a.trip)].map(
    (trip) => {
      const shape: [number, number][] = []
      const maneuvers: Maneuver[] = []
      for (const leg of trip.legs) {
        // Each leg counts its maneuvers' places from its own start
        const offset = shape.length
        shape.push(...decodePolyline6(leg.shape))
        for (const m of leg.maneuvers) {
          maneuvers.push({
            instruction: m.instruction,
            type: m.type,
            meters: m.length * 1000,
            seconds: m.time,
            streets: m.street_names ?? [],
            at: Math.min(offset + (m.begin_shape_index ?? 0), shape.length - 1),
          })
        }
      }
      return {
        meters: trip.summary.length * 1000,
        seconds: trip.summary.time,
        shape,
        maneuvers,
      }
    },
  )
}
