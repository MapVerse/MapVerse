import { test as base, expect, type BrowserContext } from '@playwright/test'

// Every request that would leave the machine is answered here, with small
// made-up data: an empty map, two places to find and one route.

type Place = {
  name: string
  lngLat: [number, number]
  osm: [type: 'N' | 'W' | 'R', id: number]
  value: string
  district: string
}

export const PLACES: Place[] = [
  {
    name: 'Galata Kulesi',
    lngLat: [28.97413, 41.02562],
    osm: ['N', 1],
    value: 'tower',
    district: 'Beyoğlu',
  },
  {
    name: 'Taksim Meydanı',
    lngLat: [28.98571, 41.03697],
    osm: ['W', 2],
    value: 'square',
    district: 'Beyoğlu',
  },
]

const photonFeature = (place: Place) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: place.lngLat },
  properties: {
    osm_type: place.osm[0],
    osm_id: place.osm[1],
    osm_key: 'man_made',
    osm_value: place.value,
    type: 'house',
    name: place.name,
    district: place.district,
    city: 'İstanbul',
    country: 'Türkiye',
  },
})

/** Google's encoded polyline at 6 digits, as Valhalla sends shapes. */
export function encodePolyline6(points: [number, number][]): string {
  let out = ''
  let lastLat = 0
  let lastLng = 0
  const encode = (value: number) => {
    let v = value < 0 ? ~(value << 1) : value << 1
    while (v >= 0x20) {
      out += String.fromCharCode((0x20 | (v & 0x1f)) + 63)
      v >>= 5
    }
    out += String.fromCharCode(v + 63)
  }
  for (const [lng, lat] of points) {
    const la = Math.round(lat * 1e6)
    const ln = Math.round(lng * 1e6)
    encode(la - lastLat)
    encode(ln - lastLng)
    lastLat = la
    lastLng = ln
  }
  return out
}

export const ROUTE = {
  trip: {
    summary: { length: 2.1, time: 660 },
    legs: [
      {
        shape: encodePolyline6([
          PLACES[0].lngLat,
          [28.978, 41.031],
          PLACES[1].lngLat,
        ]),
        maneuvers: [
          {
            instruction: 'Kuzeydoğuya doğru ilerleyin.',
            type: 1,
            length: 1.2,
            time: 380,
            street_names: ['İstiklal Caddesi'],
            begin_shape_index: 0,
          },
          {
            instruction: 'Varış noktanıza ulaştınız.',
            type: 4,
            length: 0,
            time: 0,
            begin_shape_index: 2,
          },
        ],
      },
    ],
  },
}

/** An empty but valid map: its TileJSON, with tiles and glyphs that hold nothing. */
async function mockTiles(context: BrowserContext) {
  await context.route('https://tiles.openfreemap.org/**', (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/planet')
      return route.fulfill({
        json: {
          tilejson: '3.0.0',
          tiles: ['https://tiles.openfreemap.org/planet/test/{z}/{x}/{y}.pbf'],
          minzoom: 0,
          maxzoom: 14,
          vector_layers: [],
        },
        headers: { 'Access-Control-Allow-Origin': '*' },
      })
    return route.fulfill({
      body: Buffer.alloc(0),
      contentType: 'application/x-protobuf',
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  })
}

/** Answers every outside request: tiles, search, places, outlines and routes. */
export async function mockNetwork(context: BrowserContext) {
  // Anything not answered below never leaves the machine
  await context.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (route) =>
    route.abort('blockedbyclient'),
  )
  await mockTiles(context)
  await context.route('https://photon.komoot.io/**', (route) => {
    const url = new URL(route.request().url())
    const q = (url.searchParams.get('q') ?? '').toLocaleLowerCase('tr')
    const found = url.pathname.startsWith('/reverse')
      ? PLACES.slice(0, 1)
      : PLACES.filter((p) => p.name.toLocaleLowerCase('tr').includes(q))
    return route.fulfill({
      json: { type: 'FeatureCollection', features: found.map(photonFeature) },
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  })
  for (const host of ['overpass-api.de', 'overpass.private.coffee'])
    await context.route(`https://${host}/**`, (route) =>
      route.fulfill({
        json: { elements: [] },
        headers: { 'Access-Control-Allow-Origin': '*' },
      }),
    )
  await context.route('https://nominatim.openstreetmap.org/**', (route) =>
    route.fulfill({
      json: [],
      headers: { 'Access-Control-Allow-Origin': '*' },
    }),
  )
  await context.route('https://valhalla1.openstreetmap.de/**', (route) =>
    route.fulfill({
      json: ROUTE,
      headers: { 'Access-Control-Allow-Origin': '*' },
    }),
  )
}

export const test = base.extend<{ pageErrors: Error[] }>({
  context: async ({ context }, run) => {
    await mockNetwork(context)
    await run(context)
  },
  // What went uncaught in the page, for a test to check
  pageErrors: async ({ page }, run) => {
    const errors: Error[] = []
    page.on('pageerror', (error) => errors.push(error))
    await run(errors)
  },
})

export { expect }

/** Opens the app and waits for the map's controls to be on it. */
export async function openApp(page: import('@playwright/test').Page) {
  await page.goto('./')
  await expect(
    page.getByRole('combobox', { name: 'Arama ve yer seçimi' }),
  ).toBeVisible()
}
