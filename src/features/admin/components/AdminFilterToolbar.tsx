import { useId, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { IconAction } from '../../../app/components/IconAction'
import { Input } from '../../../app/components/ui/input'
import { Label } from '../../../app/components/ui/label'

export function AdminFilterToolbar({
  search,
  onSearch,
  searchLabel,
  searchPlaceholder,
  children,
}: {
  search: string
  onSearch: (value: string) => void
  searchLabel: string
  searchPlaceholder: string
  children?: ReactNode
}) {
  const searchId = useId()
  return (
    <form
      className="admin-toolbar"
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        const values = new FormData(event.currentTarget)
        onSearch(String(values.get('search') ?? '').trim())
      }}
    >
      <div className="admin-toolbar-search admin-toolbar-field">
        <Label htmlFor={searchId}>{searchLabel}</Label>
        <div className="admin-toolbar-search-controls">
          <Input
            id={searchId}
            key={search}
            name="search"
            defaultValue={search}
            maxLength={100}
            placeholder={searchPlaceholder}
          />
          <IconAction
            label="Search"
            tooltip={searchLabel}
            workspace
            type="submit"
            variant="outline"
          >
            <Search aria-hidden="true" />
          </IconAction>
        </div>
      </div>
      {children}
    </form>
  )
}
