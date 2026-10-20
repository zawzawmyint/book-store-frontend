// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  COMMAND_NO_SELECTION,
} from './command'

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(cleanup)
afterAll(() => vi.unstubAllGlobals())

function Finder({
  items,
  submit,
  close,
}: {
  items: string[]
  submit: (value: string) => void
  close: () => void
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<string>()
  return (
    <Command
      shouldFilter={false}
      value={active ?? COMMAND_NO_SELECTION}
      onValueChange={setActive}
      loop
      vimBindings={false}
    >
      <CommandInput
        aria-label="Server search"
        value={query}
        onValueChange={(value) => {
          setQuery(value)
          setActive(undefined)
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          if (event.nativeEvent.isComposing || event.keyCode === 229) return
          submit(active && items.includes(active) ? active : query)
        }}
      />
      <CommandList label="Results">
        <CommandGroup value="books">
          {items.map((item) => (
            <CommandItem key={item} value={item} onSelect={submit}>
              {item}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      <button type="button" onClick={close}>
        Close
      </button>
    </Command>
  )
}

it('keeps asynchronous server results unselected and preserves input focus during arrow selection', async () => {
  const user = userEvent.setup()
  const submit = vi.fn()
  const close = vi.fn()
  const { rerender } = render(<Finder items={[]} submit={submit} close={close} />)
  const input = screen.getByRole('combobox', { name: 'Server search' })
  await user.type(input, 'Gatsby')
  rerender(
    <Finder items={['The Great Gatsby', 'Server-only result']} submit={submit} close={close} />,
  )
  expect(screen.getByRole('option', { name: 'Server-only result' })).toBeVisible()
  expect(
    screen.getAllByRole('option').every((item) => item.getAttribute('aria-selected') === 'false'),
  ).toBe(true)
  await user.keyboard('{Enter}')
  expect(submit).toHaveBeenLastCalledWith('Gatsby')
  await user.keyboard('{ArrowDown}')
  expect(screen.getByRole('option', { name: 'The Great Gatsby' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(input).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(submit).toHaveBeenLastCalledWith('The Great Gatsby')
  await user.type(input, 'x')
  expect(
    screen.getAllByRole('option').every((item) => item.getAttribute('aria-selected') === 'false'),
  ).toBe(true)
})

it('leaves native controls independent of command selection and does not submit IME composition', async () => {
  const user = userEvent.setup()
  const submit = vi.fn()
  const close = vi.fn()
  render(<Finder items={['Book']} submit={submit} close={close} />)
  const input = screen.getByRole('combobox')
  await user.click(input)
  await user.keyboard('{ArrowDown}')
  fireEvent.keyDown(input, { key: 'Enter', isComposing: true, keyCode: 229 })
  expect(submit).not.toHaveBeenCalled()
  screen.getByRole('button', { name: 'Close' }).focus()
  await user.keyboard('{Enter}')
  expect(close).toHaveBeenCalledOnce()
  expect(submit).not.toHaveBeenCalled()
})
