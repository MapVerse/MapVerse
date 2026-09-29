import { decodePolyline6 } from './directions.ts'

export type TravelMode = 'auto' | 'pedestrian' | 'bicycle'

export type Maneuver = {
  instruction: string
  type: number
  meters: number
  seconds: number
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
    (trip) => ({
      meters: trip.summary.length * 1000,
      seconds: trip.summary.time,
      shape: trip.legs.flatMap((leg) => decodePolyline6(leg.shape)),
      maneuvers: trip.legs.flatMap((leg) =>
        leg.maneuvers.map((m) => ({
          instruction: m.instruction,
          type: m.type,
          meters: m.length * 1000,
          seconds: m.time,
        })),
      ),
    }),
  )
}
