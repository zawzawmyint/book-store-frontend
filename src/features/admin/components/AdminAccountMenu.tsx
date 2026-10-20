import { localized, message as msg, t, useI18n } from '../../../lib/i18n'
import { useState } from 'react'
import { LogOut, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApolloClient } from '@apollo/client/react'
import { authClient } from '../../../lib/auth-client'
import { IconAction } from '../../../app/components/IconAction'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../app/components/ui/dropdown-menu'

export function AdminAccountMenu() {
  useI18n()

  const { data: session } = authClient.useSession()
  const client = useApolloClient()
  const [error, setError] = useState('')
  async function signOut() {
    setError('')
    try {
      const result = await authClient.signOut()
      if (result.error) {
        setError(msg('admin:unableToSignOutPleaseTryAgain'))
        return
      }
      await client.clearStore()
      // Reset session observers and pending workspace redirects after logout.
      window.location.replace('/sign-in')
    } catch {
      setError(msg('admin:unableToSignOutPleaseTryAgain'))
    }
  }
  if (!session?.user) return null
  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconAction label={t('admin:account')} workspace>
            <UserRound size={16} aria-hidden="true" />
          </IconAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="admin-workspace min-w-52">
          <div className="border-b border-border px-3 py-2">
            <p className="text-sm font-medium">
              <bdi dir="auto">{localized(session?.user.name)}</bdi>
            </p>
            <p className="text-xs text-muted-foreground">
              <bdi dir="ltr">{localized(session?.user.email)}</bdi>
            </p>
          </div>
          <DropdownMenuItem asChild>
            <Link to="/admin/profile">{t('admin:profile')}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              void signOut()
            }}
          >
            <LogOut size={14} className="me-2" aria-hidden="true" /> {t('admin:signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p
          role="alert"
          className="absolute right-0 top-full z-20 mt-2 w-64 rounded-md border border-destructive bg-destructive-muted p-3 text-sm text-destructive shadow-sm"
        >
          {localized(error)}
        </p>
      )}
    </div>
  )
}
