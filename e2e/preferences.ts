import { expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function labels(page: Page, namespace = 'common') {
  const language = (await page.locator('html').getAttribute('lang')) || 'en'
  return JSON.parse(
    await readFile(
      new URL(`../src/lib/i18n/locales/${language}/${namespace}.json`, import.meta.url),
      'utf8',
    ),
  ) as Record<string, string>
}
export async function openAccount(page: Page) {
  const common = await labels(
    page,
    new URL(page.url()).pathname.startsWith('/admin') ? 'admin' : 'common',
  )
  const trigger = page.locator('header').getByRole('button', { name: common.account, exact: true })
  await trigger.click()
  return trigger
}
export async function expectSignedOutAccount(page: Page) {
  const common = await labels(page)
  await openAccount(page)
  await expect(page.getByRole('menuitem', { name: common.signIn, exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
}
export async function setAppearance(page: Page, theme: 'light' | 'dark') {
  const common = await labels(page)
  await openAccount(page)
  await page.getByRole('menuitem', { name: new RegExp(common.appearance) }).click()
  await page
    .getByRole('menuitemradio', {
      name: common[theme === 'dark' ? 'appearanceDark' : 'appearanceLight'],
      exact: true,
    })
    .click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
}
export async function toggleAppearance(page: Page) {
  await setAppearance(
    page,
    (await page.locator('html').getAttribute('data-theme')) === 'dark' ? 'light' : 'dark',
  )
}
export async function selectLanguage(page: Page, name: string) {
  const dialogSelector = page.getByRole('dialog').locator('[data-language-switcher]')
  if (await dialogSelector.count()) {
    await dialogSelector.click()
    await page.getByRole('option', { name, exact: true }).click()
    return
  }
  const common = await labels(page)
  await openAccount(page)
  await page.getByRole('menuitem', { name: new RegExp(common.language) }).click()
  await page.getByRole('menuitemradio', { name, exact: true }).click()
}
