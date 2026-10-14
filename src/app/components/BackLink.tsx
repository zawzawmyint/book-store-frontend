import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from './ui/button'

export function BackLink({
  to,
  children,
  state,
}: {
  to: string
  children: ReactNode
  state?: unknown
}) {
  return (
    <Button asChild variant="link" className="back-link no-underline">
      <Link to={to} state={state}>
        <ArrowLeft size={16} /> {children}
      </Link>
    </Button>
  )
}
