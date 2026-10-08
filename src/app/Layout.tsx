import { BookOpenText, Library, LogIn, ShoppingBag, UserRound } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useApolloClient } from '@apollo/client/react'
import { authClient } from '../lib/auth-client'
import { useCartStore } from '../features/cart/cart-store'
import { cartCount } from '../features/cart/cart'
import { PageContainer } from './components/PageContainer'
import { useAdminAccess } from '../features/admin/admin-access'
import { IconAction } from './components/IconAction'
import { Badge } from './components/ui/badge'
import { ThemeSwitch } from './components/ThemeSwitch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu'

export function Layout() {
  const admin = useAdminAccess()
  const count = useCartStore((state) => cartCount(state.items))
  const { data: session, isPending } = authClient.useSession()
  const client = useApolloClient()
  const navigate = useNavigate()
  async function signOut() {
    const result = await authClient.signOut()
    if (result.error) return
    await client.clearStore()
    navigate('/', { replace: true })
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-[#234a3b] px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[.22em] text-[#eee9d9] sm:text-xs">
        A little bookstore for big imaginations
      </div>
      <header className="border-b border-border bg-background">
        <PageContainer className="flex flex-wrap items-center justify-between gap-4 py-5">
          <Link to="/" className="flex items-center gap-2.5" aria-label="The Quiet Shelf home">
            <span className="grid size-10 place-items-center rounded-full bg-[#2d5744] text-[#f7ebd2]">
              <BookOpenText size={20} strokeWidth={1.6} />
            </span>
            <span className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">
              the quiet shelf<span className="text-copper">.</span>
            </span>
          </Link>
          <nav
            className="flex w-full items-center justify-between gap-2 sm:w-auto sm:gap-5"
            aria-label="Main navigation"
          >
            <IconAction asChild label="Browse">
              <NavLink
                to="/"
                end
                className="text-muted-foreground hover:text-primary [&.active]:text-primary"
              >
                <Library aria-hidden="true" />
              </NavLink>
            </IconAction>
            {!isPending &&
              (session?.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <IconAction label="Account">
                      <UserRound aria-hidden="true" />
                    </IconAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <div className="px-3 py-2 text-sm font-medium">{session.user.name}</div>
                    <DropdownMenuItem asChild>
                      <Link to="/account/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/account/orders">Orders</Link>
                    </DropdownMenuItem>
                    {!admin.loading && (admin.role === 'ADMIN' || admin.role === 'STAFF') && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin">
                          {admin.role === 'STAFF' ? 'Staff workspace' : 'Admin'}
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onSelect={() => {
                        void signOut()
                      }}
                    >
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <IconAction asChild label="Sign in">
                  <Link to="/sign-in">
                    <LogIn aria-hidden="true" />
                  </Link>
                </IconAction>
              ))}
            <IconAction
              asChild
              label={`Bag with ${count} ${count === 1 ? 'item' : 'items'}`}
              tooltip="Bag"
            >
              <Link to="/cart">
                <ShoppingBag size={20} strokeWidth={1.8} aria-hidden="true" />
                <Badge
                  variant="secondary"
                  className="grid size-6 place-items-center p-0 text-[10px]"
                >
                  {count}
                </Badge>
              </Link>
            </IconAction>
            <ThemeSwitch />
          </nav>
        </PageContainer>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="mt-24 border-t border-border bg-muted">
        <PageContainer className="grid gap-10 py-14 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="font-serif text-2xl">
              the quiet shelf<span className="text-copper">.</span>
            </p>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              Browse enduring books and build a collection worth keeping.
            </p>
          </div>
          <p className="font-serif text-lg italic text-muted-foreground">
            For the love of a good story.
          </p>
        </PageContainer>
        <PageContainer className="flex flex-wrap justify-between gap-3 border-t border-border py-5 text-xs text-muted-foreground">
          <span>© 2026 The Quiet Shelf</span>
          <span>Stripe test payments • Books for delivery</span>
        </PageContainer>
      </footer>
    </div>
  )
}
