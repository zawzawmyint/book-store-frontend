import { Search } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Input } from './ui/input'
import { IconAction } from './IconAction'
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from './ui/dialog'

export function StorefrontSearch() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconAction label="Open store search" tooltip="Search">
          <Search aria-hidden="true" />
        </IconAction>
      </DialogTrigger>
      <DialogContent className="rounded-lg p-6 sm:p-8">
        <DialogTitle className="pr-6">Find your next read</DialogTitle>
        <DialogDescription className="mt-2 mb-6">
          Search our shelves by title, author, or genre.
        </DialogDescription>
        <form
          role="search"
          aria-label="Store search"
          className="flex min-w-0 items-center rounded-md border border-control bg-input px-2 focus-within:ring-2 focus-within:ring-ring"
          onSubmit={(event) => {
            event.preventDefault()
            const value = String(new FormData(event.currentTarget).get('search') ?? '').trim()
            setOpen(false)
            navigate(value ? `/books?${new URLSearchParams({ search: value })}` : '/books', {
              state: { fromStoreSearch: true },
            })
          }}
        >
          <Input
            key={pathname + search}
            name="search"
            type="search"
            aria-label="Search the store"
            defaultValue={new URLSearchParams(search).get('search') ?? ''}
            placeholder="Find a title, author, or genre"
            className="min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:outline-none! focus-visible:ring-0"
          />
          <IconAction type="submit" label="Search the store">
            <Search aria-hidden="true" />
          </IconAction>
        </form>
      </DialogContent>
    </Dialog>
  )
}
