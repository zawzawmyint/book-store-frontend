// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Link } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { IconAction } from './IconAction'
import { TooltipProvider } from './ui/tooltip'

afterEach(cleanup)

it('keeps link semantics and exposes a target-specific tooltip on keyboard focus', async () => {
  const user = userEvent.setup()
  render(
    <TooltipProvider>
      <MemoryRouter>
        <IconAction asChild label="View user" tooltip="View Ada Reader" workspace>
          <Link to="/admin/users/ada">
            <Eye aria-hidden="true" />
          </Link>
        </IconAction>
      </MemoryRouter>
    </TooltipProvider>,
  )
  const link = screen.getByRole('link', { name: 'View user' })
  expect(link.getAttribute('href')).toBe('/admin/users/ada')
  expect(screen.queryByRole('button')).toBeNull()
  await user.tab()
  expect(document.activeElement).toBe(link)
  expect(await screen.findByRole('tooltip')).toHaveProperty('textContent', 'View Ada Reader')
})

it('reveals the action on hover and keeps disabled buttons inactive', async () => {
  const user = userEvent.setup()
  const click = vi.fn()
  render(
    <TooltipProvider>
      <IconAction label="View order" onClick={click}>
        <Eye aria-hidden="true" />
      </IconAction>
      <IconAction label="Unavailable order" disabled onClick={click}>
        <Eye aria-hidden="true" />
      </IconAction>
    </TooltipProvider>,
  )
  await user.hover(screen.getByRole('button', { name: 'View order' }))
  expect(await screen.findByRole('tooltip')).toHaveProperty('textContent', 'View order')
  await user.click(screen.getByRole('button', { name: 'Unavailable order' }))
  expect(click).not.toHaveBeenCalled()
})

Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  value: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
})
