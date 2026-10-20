import type { ComponentProps } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { Button } from './button'

export function Pagination({ className, ...props }: ComponentProps<'nav'>) {
  return (
    <nav
      data-slot="pagination"
      className={cn('flex flex-wrap items-center justify-center gap-3', className)}
      {...props}
    />
  )
}
export function PaginationContent({ className, ...props }: ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-wrap items-center justify-center gap-1', className)}
      {...props}
    />
  )
}
export function PaginationItem(props: ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />
}
// Native buttons preserve callback-driven URL navigation and truly disabled boundaries.
export function PaginationLink({
  className,
  isActive,
  ...props
}: ComponentProps<typeof Button> & { isActive?: boolean }) {
  return (
    <Button
      type="button"
      variant={isActive ? 'outline' : 'ghost'}
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      className={cn('min-h-11 min-w-11 rounded-sm px-2 text-sm', className)}
      {...props}
    />
  )
}
export function PaginationPrevious(props: ComponentProps<typeof PaginationLink>) {
  return <PaginationLink data-slot="pagination-previous" {...props} />
}
export function PaginationNext(props: ComponentProps<typeof PaginationLink>) {
  return <PaginationLink data-slot="pagination-next" {...props} />
}
export function PaginationEllipsis({
  className,
  'aria-label': label,
  ...props
}: ComponentProps<'span'>) {
  return (
    <span
      data-slot="pagination-ellipsis"
      className={cn('flex size-11 items-center justify-center text-muted-foreground', className)}
      {...props}
    >
      <MoreHorizontal aria-hidden="true" className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
