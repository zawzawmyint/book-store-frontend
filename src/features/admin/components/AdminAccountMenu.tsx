import { useState } from 'react'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useApolloClient } from '@apollo/client/react'
import { authClient } from '../../../lib/auth-client'
import { Button } from '../../../app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../app/components/ui/dropdown-menu'

export function AdminAccountMenu() {
  const { data: session } = authClient.useSession()
  const client = useApolloClient()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  async function signOut() {
    setError('')
    try {
      const result = await authClient.signOut()
      if (result.error) {
        setError('Unable to sign out. Please try again.')
        return
      }
      await client.clearStore()
      navigate('/', { replace: true })
    } catch {
      setError('Unable to sign out. Please try again.')
    }
  }
  if (!session?.user) return null
  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" aria-label="Account" className="gap-2">
            <UserRound size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Account</span>
            <ChevronDown size={14} aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="admin-workspace min-w-52">
          <div className="border-b border-slate-200 px-3 py-2">
            <p className="text-sm font-medium">{session?.user.name}</p>
            <p className="text-xs text-slate-500">{session?.user.email}</p>
          </div>
          <DropdownMenuItem asChild>
            <Link to="/admin/profile">Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              void signOut()
            }}
          >
            <LogOut size={14} className="mr-2" aria-hidden="true" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p
          role="alert"
          className="absolute right-0 top-full z-20 mt-2 w-64 rounded-md border border-red-200 bg-white p-3 text-sm text-red-700 shadow-sm"
        >
          {error}
        </p>
      )}
    </div>
  )
}
