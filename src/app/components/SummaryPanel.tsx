import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export function SummaryPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card asChild className="summary-panel border-0">
      <aside>
        <CardHeader className="p-0"><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="p-0">{children}</CardContent>
      </aside>
    </Card>
  )
}
