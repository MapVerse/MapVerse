import { VALHALLA_URL } from '../../lib/endpoints.ts'
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
  /** For the arrival at a stop on the way, which one (from 1) */
  stop?: number
  /** What to say for it aloud, as Valhalla words it to be spoken */
  verbal?: Verbal
}

/**
 * A maneuver's spoken instructions: a warning some way before it, the
 * instruction just before it, and what follows once it is done (like
 * "300 metre boyunca devam edin.").
 */
export type Verbal = { alert?: string; pre?: string; post?: string }

export type Route = {
  meters: number
  seconds: number
  shape: [number, number][]
  maneuvers: Maneuver[]
  /**
   * When it leaves and arrives, as local clock times like
   * 2026-11-08T09:00, when asked for at a time
   */
  departs?: string
  arrives?: string
}

type ValhallaTrip = {
  summary: { length: number; time: number }
  locations?: { date_time?: string }[]
  legs: {
    shape: string
    maneuvers: {
      instruction: string
      type: number
      length: number
      time: number
      street_names?: string[]
      begin_shape_index?: number
      verbal_transition_alert_instruction?: string
      verbal_pre_transition_instruction?: string
      verbal_post_transition_instruction?: string
    }[]
  }[]
}

export type ValhallaResponse = {
  trip: ValhallaTrip
  alternates?: { trip: ValhallaTrip }[]
}

// The public FOSSGIS server is meant for light use; point this at your own
// Valhalla instance for anything more.
const API = VALHALLA_URL

/**
 * Why there is no route: the points are too far apart for the server, one
 * of them is nowhere near a road, or there is just no way between them.
 */
export type NoRouteReason = 'too-far' | 'off-road' | 'none'

/** Valhalla found no way between the two points. */
export class NoRouteError extends Error {
  reason: NoRouteReason

  constructor(message: string, reason: NoRouteReason = 'none') {
    super(message)
    this.reason = reason
  }
}

/** The reason in a Valhalla error's body, by its error code. */
export function noRouteReason(body: string): NoRouteReason {
  let code: unknown
  try {
    code = (JSON.parse(body) as { error_code?: unknown }).error_code
  } catch {
    return 'none'
  }
  // https://valhalla.github.io/valhalla/api/turn-by-turn/api-reference/#http-status-codes-and-conditions
  if (code === 154) return 'too-far'
  if (code === 171) return 'off-road'
  return 'none'
}

/** Roads to keep off, where the way of travel has them. */
export type Avoid = { tolls: boolean; highways: boolean; ferries: boolean }

export const AVOID_NOTHING: Avoid = {
  tolls: false,
  highways: false,
  ferries: false,
}

/**
 * When to travel: now, leaving at a local clock time, or arriving by one
 * (like 2026-11-08T09:00).
 */
export type When = { kind: 'now' } | { kind: 'depart' | 'arrive'; at: string }

export type RouteRequest = {
  /** From the start, through any stops, to the destination, as [lng, lat] */
  points: [number, number][]
  mode: TravelMode
  avoid: Avoid
  when: When
  /**
   * The way the start is faced, in degrees from north, so a route asked
   * for on the move leads on rather than back (with no turning round)
   */
  heading?: number
}

/** Whether a way of travel can keep off a kind of road at all. */
export function canAvoid(mode: TravelMode, what: keyof Avoid): boolean {
  return what === 'ferries' || mode === 'auto'
}

/** What Valhalla is asked, by its route API. */
export function buildRequest({
  points,
  mode,
  avoid,
  when,
  heading,
}: RouteRequest) {
  // 0 keeps off them as far as there is another way (1 would prefer them)
  const options: Record<string, number> = {}
  if (avoid.tolls && canAvoid(mode, 'tolls')) options.use_tolls = 0
  if (avoid.highways && canAvoid(mode, 'highways')) options.use_highways = 0
  if (avoid.ferries && canAvoid(mode, 'ferries')) options.use_ferry = 0
  return {
    locations: points.map(([lon, lat], i) => ({
      lon,
      lat,
      ...(i === 0 &&
        heading !== undefined && {
          heading: Math.round(((heading % 360) + 360) % 360),
          heading_tolerance: 45,
        }),
    })),
    costing: mode,
    ...(Object.keys(options).length > 0 && {
      costing_options: { [mode]: options },
    }),
    // Valhalla finds other ways only between two points
    ...(points.length === 2 && { alternates: 2 }),
    ...(when.kind !== 'now' && {
      date_time: { type: when.kind === 'depart' ? 1 : 2, value: when.at },
    }),
    directions_options: { units: 'kilometers', language: 'tr-TR' },
  }
}

export async function getRoutes(
  request: RouteRequest,
  signal?: AbortSignal,
): Promise<Route[]> {
  const query = encodeURIComponent(JSON.stringify(buildRequest(request)))
  // A GET keeps this a simple CORS request, without a preflight
  const res = await fetch(`${API}/route?json=${query}`, { signal })
  if (res.status === 400) {
    const body = await res.text()
    throw new NoRouteError(body, noRouteReason(body))
  }
  if (!res.ok) throw new Error(`Valhalla request failed: ${res.status}`)
  return parseRoutes((await res.json()) as ValhallaResponse)
}

/** Valhalla's arrival maneuvers: at, on the right of, on the left of. */
const ARRIVALS = new Set([4, 5, 6])

/** Arriving at a stop on the way, rather than at the destination. */
export function stopArrival(type: number, stop: number): string {
  if (type === 5) return `${stop}. durak sağınızda.`
  if (type === 6) return `${stop}. durak solunuzda.`
  return `${stop}. durağa vardınız.`
}

/** Said some way before a stop on the way. */
export function stopAhead(type: number, stop: number): string {
  if (type === 5) return `${stop}. durak sağınızda kalacak.`
  if (type === 6) return `${stop}. durak solunuzda kalacak.`
  return `${stop}. durağa varacaksınız.`
}

/** The instructions there are, without those that are missing. */
function clean(verbal: Verbal): Verbal {
  return Object.fromEntries(
    Object.entries(verbal).filter(([, text]) => text),
  ) as Verbal
}

export function parseRoutes(data: ValhallaResponse): Route[] {
  return [data.trip, ...(data.alternates ?? []).map((a) => a.trip)].map(
    (trip) => {
      const shape: [number, number][] = []
      const maneuvers: Maneuver[] = []
      trip.legs.forEach((leg, l) => {
        // Each leg counts its maneuvers' places from its own start
        const offset = shape.length
        shape.push(...decodePolyline6(leg.shape))
        // Every leg but the last ends at a stop, not the destination
        const stop = l < trip.legs.length - 1 ? l + 1 : undefined
        for (const m of leg.maneuvers) {
          const atStop = stop !== undefined && ARRIVALS.has(m.type)
          // Valhalla speaks of the end of each leg as the destination
          const spoken = (text?: string) =>
            stop === undefined
              ? text
              : text?.replace(/Hedefiniz/g, `${stop}. durak`)
          const verbal: Verbal = atStop
            ? { alert: stopAhead(m.type, stop), pre: stopArrival(m.type, stop) }
            : {
                alert: spoken(m.verbal_transition_alert_instruction),
                pre: spoken(m.verbal_pre_transition_instruction),
                post: m.verbal_post_transition_instruction,
              }
          maneuvers.push({
            instruction: atStop ? stopArrival(m.type, stop) : m.instruction,
            type: m.type,
            meters: m.length * 1000,
            seconds: m.time,
            streets: m.street_names ?? [],
            at: Math.min(offset + (m.begin_shape_index ?? 0), shape.length - 1),
            ...(atStop && { stop }),
            ...((verbal.alert || verbal.pre || verbal.post) && {
              verbal: clean(verbal),
            }),
          })
        }
      })
      const departs = trip.locations?.[0]?.date_time
      const arrives = trip.locations?.at(-1)?.date_time
      return {
        meters: trip.summary.length * 1000,
        seconds: trip.summary.time,
        shape,
        maneuvers,
        ...(departs && arrives && { departs, arrives }),
      }
    },
  )
}
