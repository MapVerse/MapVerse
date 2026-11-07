import { expect, openApp, test } from './fixtures.ts'

test.use({ serviceWorkers: 'allow' })

test('opens offline once it has been opened before', async ({
  page,
  context,
}) => {
  await openApp(page)
  // The service worker installed, with the app's files, and in charge
  await page.waitForFunction(
    async () => {
      await navigator.serviceWorker.ready
      return !!navigator.serviceWorker.controller
    },
    undefined,
    { timeout: 30_000 },
  )

  await context.setOffline(true)
  const response = await page.reload()
  expect(response?.fromServiceWorker()).toBe(true)
  await expect(
    page.getByRole('combobox', { name: 'Arama ve yer seçimi' }),
  ).toBeVisible()
  await expect(page.getByText('Çevrimdışısınız')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})
