import { expect, openApp, test } from './fixtures.ts'

test('switches the interface to English, and remembers it', async ({
  page,
}) => {
  await openApp(page)
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr')
  await page.getByRole('button', { name: 'Profil ve ayarlar' }).click()
  const languages = page.getByRole('group', { name: 'Dil' })
  await languages.getByRole('button', { name: 'English' }).click()

  // At once, without a reload
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(
    page.getByRole('group', { name: 'Language' }).getByRole('button', {
      name: 'English',
    }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('group', { name: 'Theme' })).toBeVisible()
  await expect(
    page.getByRole('combobox', { name: 'Search and pick a place' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Measure distance' }),
  ).toBeVisible()

  // And it stays so when the app is opened again
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(
    page.getByRole('button', { name: 'Profile and settings' }),
  ).toBeVisible()
  const search = page.getByRole('combobox', { name: 'Search and pick a place' })
  await search.fill('Galata')
  await page
    .getByRole('listbox', { name: 'Search results' })
    .getByRole('option', { name: /Galata Kulesi/ })
    .click()
  const panel = page.getByRole('complementary', { name: 'Galata Kulesi' })
  await expect(panel.getByRole('button', { name: 'Directions' })).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Share' })).toBeVisible()
})
