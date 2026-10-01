import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from './ui/button'

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Button asChild variant="link" className="back-link no-underline">
      <Link to={to}><ArrowLeft size={16} /> {children}</Link>
    </Button>
  )
}
