// OpenStreetMap data through public Overpass instances; they need no key

export type OverpassElement = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  /** For ways and relations asked for with `out center` */
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

// Tried in turn, so one being busy or down doesn't stop the app
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

/** Runs an Overpass QL query that asks for JSON output. */
export async function overpass(
  query: string,
  signal?: AbortSignal,
): Promise<OverpassElement[]> {
  let failure: unknown
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: new URLSearchParams({ data: query }),
        signal,
      })
      if (!res.ok) throw new Error(`Overpass request failed: ${res.status}`)
      return ((await res.json()) as { elements: OverpassElement[] }).elements
    } catch (error) {
      if (signal?.aborted) throw error
      failure = error
    }
  }
  throw failure
}
