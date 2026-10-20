import { localized, t, useI18n } from '../../lib/i18n'
import { Menu, ArrowUpRight } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './ui/dialog'
import { IconAction } from './IconAction'

export function StorefrontMenu() {
  useI18n()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <IconAction
          label={t('common:openNavigation')}
          tooltip={t('common:menuTooltip')}
          className="sm:hidden"
        >
          <Menu aria-hidden="true" />
        </IconAction>
      </DialogTrigger>
      <DialogContent className="storefront-menu rounded-lg">
        <DialogTitle>{t('common:exploreTheStore')}</DialogTitle>
        <DialogDescription className="mt-2">
          {t('common:aGoodBookIsAGoodPlaceToBegin')}
        </DialogDescription>
        <nav aria-label={t('common:mobileNavigation')} className="my-6 grid divide-y divide-border">
          {[
            ['/', t('common:home')],
            ['/books', t('common:allBooks')],
          ].map(([to, label]) => (
            <DialogClose asChild key={to}>
              <NavLink
                end={to === '/'}
                to={to}
                className="flex min-h-14 items-center justify-between font-serif text-xl [&.active]:text-primary"
              >
                {localized(label)}
                <ArrowUpRight size={20} aria-hidden="true" />
              </NavLink>
            </DialogClose>
          ))}
        </nav>
      </DialogContent>
    </Dialog>
  )
}
