import type { ComponentProps, ReactNode } from 'react'
import { useLayoutEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { t, useI18n } from '../../lib/i18n'
import { DialogClose, DialogContent, DialogTitle } from './ui/dialog'
import { Command } from './ui/command'
import { InputGroup, InputGroupAddon } from './ui/input-group'

export function SearchFinder({
  title,
  input,
  children,
  footer,
  workspace = false,
  commandProps,
  ...props
}: Omit<ComponentProps<typeof DialogContent>, 'title' | 'children'> & {
  title: string
  input: ReactNode
  children: ReactNode
  footer?: ReactNode
  workspace?: boolean
  commandProps: ComponentProps<typeof Command>
}) {
  useI18n()
  const [headerBounds, setHeaderBounds] = useState<{ top: number; left: number; width?: number }>({
    top: 0,
    left: 0,
  })
  useLayoutEffect(() => {
    const header = document.querySelector('header')
    const measure = () => {
      const bounds = header?.getBoundingClientRect()
      setHeaderBounds({
        top: Math.max(0, bounds?.bottom ?? 0),
        left: workspace ? (bounds?.left ?? 0) : 0,
        width: workspace ? bounds?.width : undefined,
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (header) observer.observe(header)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [workspace])
  return (
    <DialogContent
      {...props}
      className={`search-finder ${workspace ? 'admin-workspace' : ''}`}
      style={{
        top: headerBounds.top,
        left: headerBounds.left,
        width: headerBounds.width,
        maxHeight: `min(70dvh, calc(100dvh - ${headerBounds.top}px))`,
      }}
      overlayStyle={{ top: workspace ? 0 : headerBounds.top }}
      showLanguageSwitcher={false}
      showCloseButton={false}
      aria-describedby={undefined}
    >
      <DialogTitle className="sr-only">{title}</DialogTitle>
      <Command {...commandProps} className="search-finder-command">
        <InputGroup className="search-finder-input rounded-none border-x-0 border-t-0 bg-transparent focus-within:ring-inset">
          <InputGroupAddon className="p-0">
            <Search aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
          </InputGroupAddon>
          {input}
          <InputGroupAddon align="inline-end" className="p-0">
            <DialogClose aria-label={t('common:closeDialog')} className="search-finder-close">
              <kbd aria-hidden="true" className="hidden sm:inline">
                Esc
              </kbd>
              <X aria-hidden="true" className="size-4 sm:hidden" />
            </DialogClose>
          </InputGroupAddon>
        </InputGroup>
        <div className="search-finder-results">{children}</div>
      </Command>
      {footer && <div className="search-finder-footer">{footer}</div>}
    </DialogContent>
  )
}
