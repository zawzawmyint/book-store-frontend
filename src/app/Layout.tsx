import { BookOpenText, LogIn, ShoppingBag, UserRound } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useApolloClient } from '@apollo/client/react'
import { authClient } from '../lib/auth-client'
import { useCartStore } from '../features/cart/cart-store'
import { CartFeedback } from '../features/cart/CartFeedback'
import { cartCount } from '../features/cart/cart'
import { PageContainer } from './components/PageContainer'
import { useAdminAccess } from '../features/admin/admin-access'
import { IconAction } from './components/IconAction'
import { Badge } from './components/ui/badge'
import { ThemeSwitch } from './components/ThemeSwitch'
import { StorefrontSearch } from './components/StorefrontSearch'
import { StorefrontMenu } from './components/StorefrontMenu'
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
    void useCartStore.getState().identify(undefined)
    const result = await authClient.signOut()
    if (result.error) {
      await authClient.getSession({ query: { disableCookieCache: true } })
      window.location.reload()
      return
    }
    await client.clearStore()
    navigate('/sign-in', { replace: true })
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-[#234a3b] px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[.22em] text-[#eee9d9] sm:text-xs">
        A little bookstore for big imaginations
      </div>
      <header className="border-b border-border bg-background">
        <PageContainer className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 py-3 sm:flex-nowrap sm:gap-6 sm:py-4">
          <Link to="/" className="flex items-center gap-2.5" aria-label="The Quiet Shelf home">
            <span className="hidden size-9 place-items-center rounded-full bg-[#2d5744] text-[#f7ebd2] sm:grid">
              <BookOpenText size={20} strokeWidth={1.6} />
            </span>
            <span className="max-w-[88px] font-serif text-base font-semibold leading-tight tracking-tight sm:max-w-none sm:text-2xl">
              the quiet shelf<span className="text-copper">.</span>
            </span>
          </Link>
          <nav
            className="ml-auto flex items-center gap-0 text-sm sm:gap-2"
            aria-label="Main navigation"
          >
            <NavLink
              to="/books"
              className="mr-4 hidden min-h-11 items-center px-1 font-semibold text-muted-foreground hover:text-primary sm:inline-flex [&.active]:text-primary"
            >
              All books
            </NavLink>
            <StorefrontSearch />
            {!isPending &&
              (session?.user.emailVerified === true ? (
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
              className="relative"
            >
              <Link to="/cart">
                <ShoppingBag size={20} strokeWidth={1.8} aria-hidden="true" />
                <Badge
                  variant="secondary"
                  className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center p-0 text-[9px]"
                >
                  {count}
                </Badge>
              </Link>
            </IconAction>
            <span className="hidden sm:inline-flex">
              <ThemeSwitch />
            </span>
            <StorefrontMenu />
          </nav>
        </PageContainer>
      </header>
      <main>
        <PageContainer>
          <CartFeedback />
        </PageContainer>
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
          <nav
            aria-label="Footer navigation"
            className="grid grid-cols-2 gap-x-8 gap-y-3 self-start text-sm text-muted-foreground [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a:hover]:text-primary [&_a:hover]:underline"
          >
            <Link to="/">Home</Link>
            <Link to="/books">All books</Link>
            <Link to="/account/orders">Your orders</Link>
            <Link to="/account/profile">Your profile</Link>
          </nav>
        </PageContainer>
        <PageContainer className="flex flex-wrap justify-between gap-3 border-t border-border py-5 text-xs text-muted-foreground">
          <span>© 2026 The Quiet Shelf</span>
          <span>Stripe test payments • Books for delivery</span>
        </PageContainer>
      </footer>
    </div>
  )
}
