import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { History, MoreHorizontal, PackagePlus, Pencil } from 'lucide-react'
import type { AdminBookFieldsFragment } from '../../../generated/graphql'
import { IconAction } from '../../../app/components/IconAction'
import { Button } from '../../../app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../../app/components/ui/dropdown-menu'

export function BookRowActions({
  book,
  returnTo,
  isAdmin,
  onStock,
  onArchive,
}: {
  book: AdminBookFieldsFragment
  returnTo: string
  isAdmin: boolean
  onStock: () => void
  onArchive: (opener: HTMLButtonElement | null) => void
}) {
  return (
    <div className="flex justify-end gap-1">
      <IconAction asChild label={`Edit ${book.title}`} workspace>
        <Link to={`${book.id}/edit`} state={{ returnTo }}>
          <Pencil aria-hidden="true" />
        </Link>
      </IconAction>
      {isAdmin && (
        <IconAction asChild label={`History for ${book.title}`} workspace>
          <Link to={`${book.id}/history?${new URLSearchParams({ returnTo })}`}>
            <History aria-hidden="true" />
          </Link>
        </IconAction>
      )}
      <Button type="button" variant="ghost" onClick={onStock}>
        <PackagePlus size={16} aria-hidden="true" /> Adjust stock
      </Button>
      {isAdmin && <BookRowMenu book={book} onArchive={onArchive} />}
    </div>
  )
}

function BookRowMenu({
  book,
  onArchive,
}: {
  book: AdminBookFieldsFragment
  onArchive: (opener: HTMLButtonElement | null) => void
}) {
  const trigger = useRef<HTMLButtonElement>(null)
  const openingDialog = useRef(false)
  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) openingDialog.current = false
      }}
    >
      <DropdownMenuTrigger asChild>
        <IconAction ref={trigger} workspace label={`More actions for ${book.title}`}>
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </IconAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="admin-workspace"
        onCloseAutoFocus={(event) => {
          if (openingDialog.current) event.preventDefault()
        }}
      >
        <DropdownMenuItem
          onSelect={() => {
            openingDialog.current = true
            onArchive(trigger.current)
          }}
        >
          {book.archived ? 'Restore' : 'Archive'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
