import type { Page } from '@playwright/test'
import { ROUTE, expect, openApp, test } from './fixtures.ts'

/** Types into one end of the route and picks the place found. */
async function setEnd(page: Page, end: 'Başlangıç' | 'Varış', text: string) {
  const field = page.getByRole('combobox', { name: end })
  await field.click()
  await field.fill(text)
  const option = page
    .getByRole('region', { name: 'Öneriler' })
    .getByRole('option', { name: new RegExp(text) })
  await expect(option).toBeVisible()
  await option.click()
}

test('finds a route between two places', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'Yol tarifi' }).click()
  await setEnd(page, 'Başlangıç', 'Galata')
  await setEnd(page, 'Varış', 'Taksim')

  const routes = page.getByRole('region', { name: 'Rotalar' })
  const route = routes
    .getByRole('list', { name: 'Rotalar' })
    .getByRole('button')
  await expect(route).toHaveCount(1)
  await expect(route).toContainText('11 dk')
  await expect(route).toContainText('2,1 km')
})

test('offers to try again when routing fails', async ({ page }) => {
  let failing = true
  await page.route('https://valhalla1.openstreetmap.de/**', (route) =>
    failing
      ? route.fulfill({
          status: 500,
          body: 'Internal Server Error',
          headers: { 'Access-Control-Allow-Origin': '*' },
        })
      : route.fulfill({
          json: ROUTE,
          headers: { 'Access-Control-Allow-Origin': '*' },
        }),
  )
  await openApp(page)
  await page.getByRole('button', { name: 'Yol tarifi' }).click()
  await setEnd(page, 'Başlangıç', 'Galata')
  await setEnd(page, 'Varış', 'Taksim')

  const routes = page.getByRole('region', { name: 'Rotalar' })
  await expect(routes).toContainText('Rota şu anda hesaplanamıyor.')
  const retry = routes.getByRole('button', { name: 'Tekrar dene' })
  await expect(retry).toBeVisible()

  failing = false
  await retry.click()
  await expect(
    routes.getByRole('list', { name: 'Rotalar' }).getByRole('button'),
  ).toHaveCount(1)
})
