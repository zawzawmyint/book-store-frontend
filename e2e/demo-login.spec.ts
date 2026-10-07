import { expect, test } from '@playwright/test'

test.beforeEach(async ({ request, page }, info) => {
  const roleIndex = ['Customer', 'Staff', 'Admin'].findIndex((role) =>
    info.title.includes(`demo ${role}`),
  )
  await page.setExtraHTTPHeaders({ 'X-Real-IP': `198.51.100.${roleIndex + 1}` })
  const seeded = await request.post('http://localhost:4100/__test__/seed-demo')
  expect(seeded.ok()).toBe(true)
})

for (const role of ['Customer', 'Staff', 'Admin']) {
  test(`demo ${role} signs in with real permissions and restores its session`, async ({ page }) => {
    await page.goto('/sign-in?returnTo=/checkout')
    await page.getByRole('button', { name: `Demo ${role}`, exact: true }).click()
    await expect(page).toHaveURL(role === 'Customer' ? 'http://localhost:4173/' : /\/admin\/books$/)
    await page.reload()
    const viewer = await page.request.post('/graphql', {
      data: { query: '{ viewer { role } }' },
      headers: { Origin: 'http://localhost:4173' },
    })
    expect((await viewer.json()).data.viewer.role).toBe(role.toUpperCase())
    const users = await page.request.post('/graphql', {
      data: { query: '{ adminUsers { total } }' },
      headers: { Origin: 'http://localhost:4173' },
    })
    const result = await users.json()
    if (role === 'Admin') expect(result.errors).toBeUndefined()
    else expect(result.errors[0].extensions.code).toBe('FORBIDDEN')
  })
}
