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
import { ThemeSwitch } from './ThemeSwitch'

export function StorefrontMenu() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <IconAction label="Open navigation" tooltip="Menu" className="sm:hidden">
          <Menu aria-hidden="true" />
        </IconAction>
      </DialogTrigger>
      <DialogContent className="rounded-lg">
        <DialogTitle>Explore the store</DialogTitle>
        <DialogDescription className="mt-2">
          A good book is a good place to begin.
        </DialogDescription>
        <nav aria-label="Mobile navigation" className="my-6 grid divide-y divide-border">
          {[
            ['/', 'Home'],
            ['/books', 'All books'],
          ].map(([to, label]) => (
            <DialogClose asChild key={to}>
              <NavLink
                end={to === '/'}
                to={to}
                className="flex min-h-14 items-center justify-between font-serif text-xl [&.active]:text-primary"
              >
                {label}
                <ArrowUpRight size={20} aria-hidden="true" />
              </NavLink>
            </DialogClose>
          ))}
        </nav>
        <div className="flex items-center justify-between border-t border-border pt-5">
          <span className="text-sm text-muted-foreground">Reading appearance</span>
          <ThemeSwitch />
        </div>
      </DialogContent>
    </Dialog>
  )
}
