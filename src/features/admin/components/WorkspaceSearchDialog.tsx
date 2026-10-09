import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpenText, ClipboardList, Search } from 'lucide-react'
import { Button } from '../../../app/components/ui/button'
import { Input } from '../../../app/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../app/components/ui/dialog'
import {
  WorkspaceSearchBooksDocument,
  WorkspaceSearchOrdersDocument,
} from '../../../generated/graphql'
import { orderStatusLabels } from '../../orders/order-status'
import { useWorkspaceSearch } from '../search/use-workspace-search'

export function WorkspaceSearch() {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.shiftKey ||
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== 'k'
      )
        return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')
      )
        return
      if (
        document.querySelector(
          '[role="dialog"][data-state="open"], [role="alertdialog"], dialog[open]',
        )
      )
        return
      event.preventDefault()
      setOpen(true)
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [])
  return (
    <>
      <Button
        ref={trigger}
        variant="outline"
        aria-label="Search workspace"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Search size={16} aria-hidden="true" />
        <span className="hidden md:inline">Search workspace</span>
        <kbd aria-hidden="true" className="hidden text-xs text-muted-foreground xl:inline">
          Ctrl / ⌘ K
        </kbd>
      </Button>
      {open && (
        <WorkspaceSearchDialog close={close} returnFocusTo={() => trigger.current?.focus()} />
      )}
    </>
  )
}

function listURL(type: 'books' | 'orders', term: string) {
  const params = new URLSearchParams({
    search: term,
    [type === 'books' ? 'filter' : 'status']: type === 'books' ? 'ACTIVE' : 'ALL',
  })
  return `/admin/${type}?${params}`
}

function WorkspaceSearchDialog({
  close,
  returnFocusTo,
}: {
  close: () => void
  returnFocusTo: () => void
}) {
  const [value, setValue] = useState('')
  const [active, setActive] = useState<string>()
  const term = value.trim()
  const prefix = useId()
  const input = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const books = useWorkspaceSearch(WorkspaceSearchBooksDocument, term, close)
  const orders = useWorkspaceSearch(WorkspaceSearchOrdersDocument, term, close, true)
  const eligible = books.eligible || orders.eligible
  const results = [
    ...(books.data?.adminBooks.items ?? []).map((book) => ({
      key: `book-${book.id}`,
      to: `/admin/books/${book.id}/edit`,
      type: 'books' as const,
      title: book.title,
      detail: `${book.author} · ${book.stock === 0 ? 'Out of stock' : `${book.stock} copies`}`,
    })),
    ...(orders.data?.adminOrders.items ?? []).map((order) => ({
      key: `order-${order.id}`,
      to: `/admin/orders/${order.id}`,
      type: 'orders' as const,
      title: `Order #${order.id} · ${order.customerName}`,
      detail: `${order.email} · ${orderStatusLabels[order.status]}`,
    })),
  ]
  const selected = results.find((row) => row.key === active)
  function choose(row: (typeof results)[number]) {
    close()
    navigate(row.to, { state: { returnTo: listURL(row.type, term) } })
  }
  return (
    <Dialog
      open
      onOpenChange={(opened) => {
        if (!opened) close()
      }}
    >
      <DialogContent
        className="admin-workspace admin-dialog max-w-xl p-4 sm:p-6"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          input.current?.focus()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocusTo()
        }}
      >
        <DialogHeader>
          <DialogTitle>Search workspace</DialogTitle>
          <DialogDescription>Find books and orders without leaving your work.</DialogDescription>
        </DialogHeader>
        <label htmlFor={`${prefix}-input`} className="sr-only">
          Search books and orders
        </label>
        <Input
          ref={input}
          id={`${prefix}-input`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={`${prefix}-results`}
          aria-activedescendant={selected ? `${prefix}-${selected.key}` : undefined}
          maxLength={100}
          placeholder="Book title, author, order number, customer name or email"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setActive(undefined)
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              if (!results.length) return
              const current = results.findIndex((row) => row.key === active)
              const next =
                event.key === 'ArrowDown'
                  ? (current + 1) % results.length
                  : current < 0
                    ? results.length - 1
                    : (current - 1 + results.length) % results.length
              const row = results[next]
              setActive(row.key)
              document.getElementById(`${prefix}-${row.key}`)?.scrollIntoView({ block: 'nearest' })
            } else if (event.key === 'Enter' && selected) {
              event.preventDefault()
              choose(selected)
            }
          }}
        />
        <p role="status" aria-live="polite" className="sr-only">
          {!eligible
            ? 'Enter at least two characters or an order number.'
            : books.loading || orders.loading
              ? books.eligible
                ? 'Searching books and orders…'
                : 'Searching orders…'
              : books.eligible
                ? `${books.data?.adminBooks.total ?? 0} books and ${orders.data?.adminOrders.total ?? 0} orders found.`
                : `${orders.data?.adminOrders.total ?? 0} orders found.`}
        </p>
        <div className="max-h-[55vh] overflow-y-auto">
          {!eligible && (
            <p className="py-6 text-sm text-muted-foreground">
              Enter at least two characters or an order number.
            </p>
          )}
          <div role="listbox" aria-label="Workspace search results" id={`${prefix}-results`}>
            {(['books', 'orders'] as const).map((type) => {
              const state = type === 'books' ? books : orders
              const total =
                type === 'books' ? books.data?.adminBooks.total : orders.data?.adminOrders.total
              const Icon = type === 'books' ? BookOpenText : ClipboardList
              return (
                state.eligible && (
                  <div
                    role="group"
                    aria-labelledby={`${prefix}-${type}-heading`}
                    key={type}
                    className="py-3"
                  >
                    <h3
                      id={`${prefix}-${type}-heading`}
                      className="mb-2 flex items-center gap-2 text-sm font-semibold capitalize"
                    >
                      <Icon size={16} aria-hidden="true" />
                      {type}
                    </h3>
                    {state.loading && (
                      <p className="text-sm text-muted-foreground">Searching {type}…</p>
                    )}
                    {state.error && (
                      <p role="alert" className="text-sm">
                        Unable to search {type}.
                      </p>
                    )}
                    {!state.loading && !state.error && total === 0 && (
                      <p className="text-sm text-muted-foreground">No matching {type}.</p>
                    )}
                    {results
                      .filter((row) => row.type === type)
                      .map((row) => (
                        <button
                          key={row.key}
                          id={`${prefix}-${row.key}`}
                          role="option"
                          aria-selected={active === row.key}
                          tabIndex={-1}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => choose(row)}
                          className={`block w-full rounded-md px-3 py-2 text-left hover:bg-muted ${active === row.key ? 'bg-muted ring-1 ring-ring' : ''}`}
                        >
                          <span className="block break-words text-sm font-medium">{row.title}</span>
                          <span className="block break-words text-xs text-muted-foreground">
                            {row.detail}
                          </span>
                        </button>
                      ))}
                  </div>
                )
              )
            })}
          </div>
          {books.error && (
            <Button variant="outline" onClick={books.retry}>
              Retry books search
            </Button>
          )}
          {orders.error && (
            <Button variant="outline" onClick={orders.retry}>
              Retry orders search
            </Button>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {!!books.data?.adminBooks.total && (
              <Link className="underline" to={listURL('books', term)} onClick={close}>
                View all matching books ({books.data.adminBooks.total})
              </Link>
            )}
            {!!orders.data?.adminOrders.total && (
              <Link className="underline" to={listURL('orders', term)} onClick={close}>
                View all matching orders ({orders.data.adminOrders.total})
              </Link>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          ↑ ↓ to select · Enter to open · Esc to close
        </p>
      </DialogContent>
    </Dialog>
  )
}
