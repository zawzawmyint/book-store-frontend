import type { ComponentPropsWithoutRef } from 'react'

export function PageContainer({ className = '', ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={`page-shell ${className}`} />
}
