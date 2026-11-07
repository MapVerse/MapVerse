import { expect, openApp, test } from './fixtures.ts'

test('opens without errors', async ({ page, pageErrors }) => {
  await openApp(page)
  await expect(
    page.getByRole('button', { name: 'Profil ve ayarlar' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Yakınlaştır' })).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('finds a place and opens it', async ({ page }) => {
  await openApp(page)
  const search = page.getByRole('combobox', { name: 'Arama ve yer seçimi' })
  await search.fill('Galata')
  const results = page.getByRole('listbox', { name: 'Arama sonuçları' })
  const option = results.getByRole('option', { name: /Galata Kulesi/ })
  await expect(option).toBeVisible()
  await option.click()

  const panel = page.getByRole('complementary', { name: 'Galata Kulesi' })
  await expect(panel).toBeVisible()
  await expect(
    panel.getByRole('heading', { name: 'Galata Kulesi' }),
  ).toBeVisible()
})

test('switches to dark mode from the profile menu', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'Profil ve ayarlar' }).click()
  const themes = page.getByRole('group', { name: 'Tema' })
  await themes.getByRole('button', { name: 'Koyu' }).click()
  await expect(themes.getByRole('button', { name: 'Koyu' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  // And it stays so when the app is opened again
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('says so, with a way to reload, when the map fails to load', async ({
  page,
}) => {
  await page.route(/\/assets\/maplibre-gl-[^/]*\.js$/, (route) => route.abort())
  await page.goto('./')
  await expect(page.getByRole('alert')).toContainText('Harita yüklenemedi')
  await expect(
    page.getByRole('button', { name: 'Yeniden yükle' }),
  ).toBeVisible()
})
