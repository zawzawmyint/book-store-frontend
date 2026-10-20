import { localized } from '../../../lib/i18n'
import type { ReactNode } from 'react'

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="admin-page-header">
      <div>
        <h2>
          <bdi dir="auto">{localized(title)}</bdi>
        </h2>
        {description && <p>{localized(description)}</p>}
      </div>
      {localized(actions)}
    </div>
  )
}
