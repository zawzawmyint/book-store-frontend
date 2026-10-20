import { localized, t, useI18n } from '../../../lib/i18n'
import { useId, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { IconAction } from '../../../app/components/IconAction'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '../../../app/components/ui/input-group'
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
  useI18n()

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
        <Label htmlFor={searchId}>{localized(searchLabel)}</Label>
        <InputGroup>
          <InputGroupInput
            id={searchId}
            key={search}
            name="search"
            defaultValue={search}
            maxLength={100}
            placeholder={localized(searchPlaceholder)}
          />
          <InputGroupAddon align="inline-end">
            <IconAction
              label={t('admin:search')}
              tooltip={searchLabel}
              workspace
              type="submit"
              variant="ghost"
            >
              <Search aria-hidden="true" />
            </IconAction>
          </InputGroupAddon>
        </InputGroup>
      </div>
      {localized(children)}
    </form>
  )
}
