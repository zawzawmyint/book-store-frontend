import { BookOpenText, ShoppingBag } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useCart } from '../features/cart/cart-context'

export function Layout() {
  const { count } = useCart()
  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#26342e]">
      <div className="bg-[#234a3b] px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[.22em] text-[#eee9d9] sm:text-xs">
        A little bookstore for big imaginations
      </div>
      <header className="border-b border-[#e2ded4] bg-[#f7f5f0]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-5 sm:px-10">
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
            <Link
              to="/cart"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] hover:text-[#2f7052]"
              aria-label={`Bag with ${count} ${count === 1 ? 'item' : 'items'}`}
            >
              <ShoppingBag size={20} strokeWidth={1.8} />{' '}
              <span className="hidden sm:inline">Bag</span>
              <span className="grid size-6 place-items-center rounded-full bg-[#e6e0d3] text-[10px]">
                {count}
              </span>
            </Link>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="mt-24 border-t border-[#dedbd2] bg-[#eeeae0]">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-14 sm:grid-cols-[1fr_auto] sm:px-10">
          <div>
            <p className="font-serif text-2xl">
              the quiet shelf<span className="text-[#a67b54]">.</span>
            </p>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#6e756c]">
              Browse enduring books and build a collection worth keeping.
            </p>
          </div>
          <p className="font-serif text-lg italic text-[#526b57]">For the love of a good story.</p>
        </div>
        <div className="mx-auto flex max-w-[1280px] flex-wrap justify-between gap-3 border-t border-[#d9d3c7] px-5 py-5 text-xs text-[#85877e] sm:px-10">
          <span>© 2026 The Quiet Shelf</span>
          <span>Order requests only • No payment collected</span>
        </div>
      </footer>
    </div>
  )
}
