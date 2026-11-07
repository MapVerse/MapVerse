import type { BrowserContext, Page } from '@playwright/test'
import { PLACES, encodePolyline6, expect, openApp, test } from './fixtures.ts'

const [galata, taksim] = PLACES.map((p) => p.lngLat)
const corner: [number, number] = [28.978, 41.031]

/** A point a share of the way from one to another. */
const between = (
  a: [number, number],
  b: [number, number],
  t: number,
): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

// Up from Galata to a corner, left there, and on to Taksim
const ROUTE = {
  trip: {
    summary: { length: 1.6, time: 300 },
    legs: [
      {
        shape: encodePolyline6([galata, corner, taksim]),
        maneuvers: [
          {
            instruction: 'Galip Dede Caddesi caddesinde kuzeye doğru sürün.',
            verbal_pre_transition_instruction:
              'Galip Dede Caddesi caddesinde kuzeye ilerleyin.',
            type: 1,
            length: 0.7,
            time: 140,
            street_names: ['Galip Dede Caddesi'],
            begin_shape_index: 0,
          },
          {
            instruction: 'İstiklal Caddesi caddesine doğru sağa dönün.',
            verbal_transition_alert_instruction:
              'İstiklal Caddesi caddesine doğru sağa dönün.',
            type: 10,
            length: 0.9,
            time: 160,
            street_names: ['İstiklal Caddesi'],
            begin_shape_index: 1,
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

async function moveTo(
  context: BrowserContext,
  [longitude, latitude]: number[],
) {
  await context.setGeolocation({ longitude, latitude, accuracy: 5 })
}

async function startNavigation(page: Page, context: BrowserContext) {
  await context.grantPermissions(['geolocation'])
  await moveTo(context, galata)
  await page.route('https://valhalla1.openstreetmap.de/**', (route) =>
    route.fulfill({
      json: ROUTE,
      headers: { 'Access-Control-Allow-Origin': '*' },
    }),
  )
  await openApp(page)
  await page.getByRole('button', { name: 'Yol tarifi' }).click()
  // The start is where the device is
  const field = page.getByRole('combobox', { name: 'Varış' })
  await field.fill('Taksim')
  const option = page
    .getByRole('region', { name: 'Öneriler' })
    .getByRole('option', { name: /Taksim/ })
  await option.click()
  await page.getByRole('button', { name: 'Başlat' }).click()
}

test.use({ viewport: { width: 390, height: 844 } })

test('guides turn by turn as the position moves along the route', async ({
  page,
  context,
  pageErrors,
}) => {
  await startNavigation(page, context)

  const banner = page.getByRole('region', { name: 'Sıradaki adım' })
  await expect(banner).toContainText('İstiklal Caddesi')
  await expect(banner).toContainText('Sonra:')
  // The planner makes way
  await expect(page.getByRole('region', { name: 'Yol tarifi' })).toBeHidden()
  const left = page.getByRole('region', { name: 'Kalan yol' })
  await expect(left).toContainText('Varış')

  await moveTo(context, between(galata, corner, 0.5))
  await expect(banner).toContainText(/[3-4]\d0 m/)

  // Past the corner, the arrival is next
  await moveTo(context, between(corner, taksim, 0.3))
  await expect(banner).toContainText('Varış noktası')
  await expect(banner).not.toContainText('Sonra:')

  await moveTo(context, taksim)
  await expect(banner).toContainText('Varış noktasına ulaştınız')
  await left.getByRole('button', { name: 'Tamam' }).click()
  await expect(page.getByRole('region', { name: 'Yol tarifi' })).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('asks for the route again off it', async ({ page, context }) => {
  await startNavigation(page, context)
  const banner = page.getByRole('region', { name: 'Sıradaki adım' })
  await expect(banner).toContainText('İstiklal Caddesi')
  // Counted from here, before the route is answered as before
  let asked = 0
  await page.route('https://valhalla1.openstreetmap.de/**', (route) => {
    asked++
    return route.fallback()
  })

  // Well off to the west, fix after fix
  for (const lng of [28.968, 28.9675, 28.967, 28.9665]) {
    await moveTo(context, [lng, 41.0265])
    await page.waitForTimeout(150)
  }
  await expect.poll(() => asked).toBe(1)
  await expect(banner).toContainText('İstiklal Caddesi')
})

test('stops when the location is not allowed', async ({ page }) => {
  await page.route('https://valhalla1.openstreetmap.de/**', (route) =>
    route.fulfill({
      json: ROUTE,
      headers: { 'Access-Control-Allow-Origin': '*' },
    }),
  )
  await openApp(page)
  await page.getByRole('button', { name: 'Yol tarifi' }).click()
  for (const [end, text] of [
    ['Başlangıç', 'Galata'],
    ['Varış', 'Taksim'],
  ] as const) {
    const field = page.getByRole('combobox', { name: end })
    await field.click()
    await field.fill(text)
    await page
      .getByRole('region', { name: 'Öneriler' })
      .getByRole('option', { name: new RegExp(text) })
      .click()
  }
  await page.getByRole('button', { name: 'Başlat' }).click()
  const planner = page.getByRole('region', { name: 'Yol tarifi' })
  await expect(planner).toContainText('navigasyon durduruldu')
})
