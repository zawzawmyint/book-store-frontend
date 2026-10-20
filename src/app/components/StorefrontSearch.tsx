import { t, useI18n } from '../../lib/i18n'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Input } from './ui/input'
import { IconAction } from './IconAction'
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from './ui/dialog'

export function StorefrontSearch() {
  useI18n()

  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconAction label={t('common:openStoreSearch')} tooltip={t('common:searchTooltip')}>
          <Search aria-hidden="true" />
        </IconAction>
      </DialogTrigger>
      <DialogContent className="rounded-lg p-6 sm:p-8">
        <DialogTitle className="pe-6">{t('common:findYourNextRead')}</DialogTitle>
        <DialogDescription className="mt-2 mb-6">
          {t('common:searchOurShelvesByTitleAuthorOrGenre')}
        </DialogDescription>
        <form
          role="search"
          aria-label={t('common:storeSearch')}
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
            aria-label={t('common:searchTheStore')}
            defaultValue={new URLSearchParams(search).get('search') ?? ''}
            placeholder={t('common:findATitleAuthorOrGenre')}
            className="min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:outline-none! focus-visible:ring-0"
          />
          <IconAction type="submit" label={t('common:searchTheStore')}>
            <Search aria-hidden="true" />
          </IconAction>
        </form>
      </DialogContent>
    </Dialog>
  )
}
