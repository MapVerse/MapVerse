import { expect, openApp, test } from './fixtures.ts'

test('the about dialog explains, and deletes what is kept here', async ({
  page,
}) => {
  await openApp(page)
  // Something of the app's kept in this browser, and something not
  await page.evaluate(() => {
    localStorage.setItem('mapverse:recent-searches', '[]')
    localStorage.setItem('someone-else', 'keep')
  })

  await page.getByRole('button', { name: 'Profil ve ayarlar' }).click()
  await page.getByRole('button', { name: 'Hakkında ve gizlilik' }).click()
  const dialog = page.getByRole('dialog', { name: 'Hakkında ve gizlilik' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('localStorage')
  await expect(
    dialog.getByRole('link', { name: /OpenStreetMap/ }),
  ).toBeVisible()

  // Escape closes it, and only it: the menu under it stays open
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  const link = page.getByRole('button', { name: 'Hakkında ve gizlilik' })
  await expect(link).toBeFocused()

  await link.click()
  await dialog
    .getByRole('button', { name: 'Bu cihazdaki verilerimi sil' })
    .click()
  await dialog.getByRole('button', { name: 'Evet, sil' }).click()
  await expect(dialog.getByRole('status')).toContainText('silindi')

  const keys = await page.evaluate(() => Object.keys(localStorage))
  expect(keys).not.toContain('mapverse:recent-searches')
  expect(keys).toContain('someone-else')
})
