// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookCoverEditor, type CoverChange } from './BookCoverEditor'

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})
afterEach(cleanup)
function Picker({ existing = false }: { existing?: boolean }) {
  const [change, setChange] = useState<CoverChange>(null)
  return (
    <BookCoverEditor
      id="1"
      title="A book"
      author="Author"
      cover={existing ? { url: '/saved.webp', width: 100, height: 150 } : null}
      change={change}
      onChange={setChange}
      onValidationChange={() => {}}
      disabled={false}
    />
  )
}
it('previews and cancels a draft, releasing the object URL', async () => {
  render(<Picker />)
  const user = userEvent.setup()
  await user.upload(
    screen.getByLabelText('Choose cover image'),
    new File(['image'], 'cover.png', { type: 'image/png' }),
  )
  expect(screen.getByAltText('Selected cover for A book')).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('when you save')
  expect(screen.queryByRole('button', { name: 'Upload cover' })).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Cancel selection' }))
  expect(screen.queryByAltText('Selected cover for A book')).toBeNull()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
})
it('stages removal and allows undo before saving', async () => {
  render(<Picker existing />)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Remove cover' }))
  expect(screen.getByRole('status')).toHaveTextContent('will be removed when you save')
  expect(screen.getByRole('img', { name: 'Cover design for A book' })).toBeInTheDocument()
  expect(screen.getByText('Current saved cover')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Undo removal' }))
  expect(screen.getByAltText('Cover of A book')).toHaveAttribute('src', '/saved.webp')
})
it('reports invalid files and allows clearing the error', async () => {
  render(<Picker />)
  const user = userEvent.setup()
  await user.upload(
    screen.getByLabelText('Choose cover image'),
    new File([], 'empty.png', { type: 'image/png' }),
  )
  expect(screen.getByRole('alert')).toHaveTextContent('no larger than 5 MiB')
  await user.click(screen.getByRole('button', { name: 'Cancel selection' }))
  expect(screen.queryByRole('alert')).toBeNull()
})
