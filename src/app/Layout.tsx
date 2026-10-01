import { BookOpenText, ShoppingBag } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useApolloClient } from '@apollo/client/react'
import { authClient } from '../lib/auth-client'
import { useCartStore } from '../features/cart/cart-store'
import { cartCount } from '../features/cart/cart'
import { PageContainer } from './components/PageContainer'
import { useAdminAccess } from '../features/admin/admin-access'
import { Button } from './components/ui/button'
import { Badge } from './components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './components/ui/dropdown-menu'

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
    <div className="min-h-screen bg-[#f7f5f0] text-[#26342e]">
      <div className="bg-[#234a3b] px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[.22em] text-[#eee9d9] sm:text-xs">
        A little bookstore for big imaginations
      </div>
      <header className="border-b border-[#e2ded4] bg-[#f7f5f0]">
        <PageContainer className="flex items-center justify-between py-5">
          <Link to="/" className="flex items-center gap-2.5" aria-label="The Quiet Shelf home">
            <span className="grid size-10 place-items-center rounded-full bg-[#2d5744] text-[#f7ebd2]">
              <BookOpenText size={20} strokeWidth={1.6} />
            </span>
            <span className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">
              the quiet shelf<span className="text-[#b89570]">.</span>
            </span>
          </Link>
          <nav className="flex items-center gap-5 sm:gap-9" aria-label="Main navigation">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `text-xs font-bold uppercase tracking-[.16em] ${isActive ? 'text-[#28593f]' : 'text-[#777b72] hover:text-[#28593f]'}`
              }
            >
              Browse
            </NavLink>
            {!isPending && (session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" type="button" className="px-0 text-xs font-bold uppercase tracking-[.12em]">Account</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild><Link to="/account/orders">Orders</Link></DropdownMenuItem>
                  {!admin.loading && admin.role === 'ADMIN' && <DropdownMenuItem asChild><Link to="/admin">Admin</Link></DropdownMenuItem>}
                  <DropdownMenuItem onSelect={() => { void signOut() }}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : <Link to="/sign-in" className="text-xs font-bold uppercase tracking-[.16em] hover:text-[#2f7052]">Sign in</Link>)}
            <Link
              to="/cart"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] hover:text-[#2f7052]"
              aria-label={`Bag with ${count} ${count === 1 ? 'item' : 'items'}`}
            >
              <ShoppingBag size={20} strokeWidth={1.8} />{' '}
              <span className="hidden sm:inline">Bag</span>
              <Badge variant="secondary" className="grid size-6 place-items-center p-0 text-[10px]">{count}</Badge>
            </Link>
          </nav>
        </PageContainer>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="mt-24 border-t border-[#dedbd2] bg-[#eeeae0]">
        <PageContainer className="grid gap-10 py-14 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="font-serif text-2xl">
              the quiet shelf<span className="text-[#a67b54]">.</span>
            </p>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#6e756c]">
              Browse enduring books and build a collection worth keeping.
            </p>
          </div>
          <p className="font-serif text-lg italic text-[#526b57]">For the love of a good story.</p>
        </PageContainer>
        <PageContainer className="flex flex-wrap justify-between gap-3 border-t border-[#d9d3c7] py-5 text-xs text-[#85877e]">
          <span>© 2026 The Quiet Shelf</span>
          <span>Order requests only • No payment collected</span>
        </PageContainer>
      </footer>
    </div>
  )
}
