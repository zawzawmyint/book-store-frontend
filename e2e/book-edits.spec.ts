import { expect, test } from '@playwright/test'

test('protects stale book details across two open editors', async ({ page, context }) => {
  await page.setExtraHTTPHeaders({ 'X-Real-IP': '192.0.2.231' })
  await page.goto('/sign-in?returnTo=%2Fadmin%2Fbooks')
  await page.getByLabel('Email address').fill('admin-e2e@example.com')
  await page.getByLabel('Password').fill('bookstore-admin-test-123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Manage books' })).toBeVisible()
  const response = await page.request.post('/graphql', {
    headers: { Origin: 'http://localhost:4173' },
    data: {
      query: `mutation { createBook(input: { details: {
      title: "Concurrent draft", author: "Original author", genre: "Fixture",
      description: "Stale book edit fixture", priceCents: 1000 }, stock: 4 }) { id } }`,
    },
  })
  const created = await response.json()
  expect(created.errors).toBeUndefined()
  const editUrl = `/admin/books/${created.data.createBook.id}/edit`
  const other = await context.newPage()
  try {
    await page.goto(editUrl)
    await other.goto(editUrl)
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Concurrent draft')
    await expect(other.getByLabel('Title', { exact: true })).toHaveValue('Concurrent draft')
    await other.getByLabel('Author', { exact: true }).fill('My unsaved author')
    await page.getByLabel('Title', { exact: true }).fill('New shared title')
    await page.getByRole('button', { name: 'Save book', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/books$/)
    await other.getByRole('button', { name: 'Save book', exact: true }).click()
    await expect(other.getByRole('alert')).toContainText('changed elsewhere')
    await expect(other.getByLabel('Author', { exact: true })).toHaveValue('My unsaved author')
    await expect(other.getByRole('button', { name: 'Save book', exact: true })).toBeDisabled()
    await other.getByRole('button', { name: 'Reload latest details', exact: true }).click()
    await expect(other.getByRole('alertdialog')).toContainText('discard')
    await other.getByRole('button', { name: 'Keep editing' }).click()
    await expect(other.getByLabel('Author', { exact: true })).toHaveValue('My unsaved author')
    await other.getByRole('button', { name: 'Reload latest details', exact: true }).click()
    await other.getByRole('button', { name: 'Discard draft and reload' }).click()
    await expect(other.getByLabel('Title', { exact: true })).toHaveValue('New shared title')
    await expect(other.getByLabel('Author', { exact: true })).toHaveValue('Original author')
    await other.getByLabel('Author', { exact: true }).fill('Reviewed author')
    await other.getByRole('button', { name: 'Save book', exact: true }).click()
    await expect(other).toHaveURL(/\/admin\/books$/)
    await other.goto(editUrl)
    await expect(other.getByLabel('Title', { exact: true })).toHaveValue('New shared title')
    await expect(other.getByLabel('Author', { exact: true })).toHaveValue('Reviewed author')
  } finally {
    await other.close()
  }
})
