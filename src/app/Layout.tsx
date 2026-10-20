import { localized, t, useI18n } from '../lib/i18n'
import { NotificationProvider } from '../features/notifications/NotificationProvider'
import { NotificationBell } from '../features/notifications/NotificationBell'
import { BookOpenText, ShoppingBag, UserRound } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useLayoutEffect, useRef } from 'react'
import { useApolloClient } from '@apollo/client/react'
import { authClient } from '../lib/auth-client'
import { useCartStore } from '../features/cart/cart-store'
import { CartFeedback } from '../features/cart/CartFeedback'
import { cartCount } from '../features/cart/cart'
import { PageContainer } from './components/PageContainer'
import { useAdminAccess } from '../features/admin/admin-access'
import { IconAction } from './components/IconAction'
import { Badge } from './components/ui/badge'
import { StorefrontSearch } from './components/StorefrontSearch'
import { StorefrontMenu } from './components/StorefrontMenu'
import { AccountPreferences } from './components/AccountPreferences'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu'

export function Layout() {
  return (
    <NotificationProvider scope="STOREFRONT">
      <StorefrontLayout />
    </NotificationProvider>
  )
}

function StorefrontLayout() {
  const { direction } = useI18n()

  const { pathname } = useLocation()
  const stickyHeader = pathname.replace(/\/+$/, '') !== '/books'
  const rootRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const root = rootRef.current
    const header = headerRef.current
    if (!root || !header) return
    const measure = () =>
      root.style.setProperty(
        '--storefront-header-height',
        `${stickyHeader ? header.getBoundingClientRect().height : 0}px`,
      )
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    return () => observer.disconnect()
  }, [stickyHeader])
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
    <div ref={rootRef} className="storefront-layout min-h-screen bg-background text-foreground">
      <div className="bg-[#234a3b] px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[.22em] text-[#eee9d9] sm:text-xs">
        {t('common:aLittleBookstoreForBigImaginations')}
      </div>
      <header
        ref={headerRef}
        className={`${stickyHeader ? 'sticky top-0 ' : ''}z-30 border-b border-border bg-background`}
      >
        <PageContainer className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 py-3 sm:flex-nowrap sm:gap-6 sm:py-4">
          <Link
            to="/"
            className="flex items-center gap-2.5"
            aria-label={t('common:theQuietShelfHome')}
          >
            <span className="hidden size-9 place-items-center rounded-full bg-[#2d5744] text-[#f7ebd2] sm:grid">
              <BookOpenText size={20} strokeWidth={1.6} />
            </span>
            <bdi
              dir="ltr"
              data-brand=""
              className="max-w-[88px] font-serif text-base font-semibold leading-tight tracking-tight sm:max-w-none sm:text-2xl"
            >
              the quiet shelf<span className="text-copper">.</span>
            </bdi>
          </Link>
          <nav
            className="ms-auto flex items-center gap-0 text-sm sm:gap-2"
            aria-label={t('common:mainNavigation')}
          >
            <NavLink
              to="/books"
              className="me-4 hidden min-h-11 items-center px-1 font-semibold text-muted-foreground hover:text-primary sm:inline-flex [&.active]:text-primary"
            >
              {t('common:allBooks')}
            </NavLink>
            <StorefrontSearch />
            <NotificationBell />
            <DropdownMenu dir={direction}>
              <DropdownMenuTrigger asChild>
                <IconAction label={t('common:account')}>
                  <UserRound aria-hidden="true" />
                </IconAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="account-menu">
                {!isPending && session?.user.emailVerified === true ? (
                  <>
                    <div className="px-3 py-2 text-sm font-medium">
                      <bdi dir="auto">{localized(session.user.name)}</bdi>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link to="/account/profile">{t('common:profile')}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/account/orders">{t('common:orders')}</Link>
                    </DropdownMenuItem>
                    {!admin.loading && (admin.role === 'ADMIN' || admin.role === 'STAFF') && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin">
                          {localized(
                            admin.role === 'STAFF' ? t('common:staffWorkspace') : t('common:admin'),
                          )}
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onSelect={() => {
                        void signOut()
                      }}
                    >
                      {t('common:signOut')}
                    </DropdownMenuItem>
                  </>
                ) : !isPending ? (
                  <DropdownMenuItem asChild>
                    <Link to="/sign-in">{t('common:signIn')}</Link>
                  </DropdownMenuItem>
                ) : null}
                <AccountPreferences />
              </DropdownMenuContent>
            </DropdownMenu>
            <IconAction
              asChild
              label={t('common:bagCount', { value0: t('common:itemCount', { count }) })}
              tooltip={t('common:bagTooltip')}
              className="relative"
            >
              <Link to="/cart">
                <ShoppingBag size={20} strokeWidth={1.8} aria-hidden="true" />
                <Badge
                  variant="secondary"
                  className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center p-0 text-[9px]"
                >
                  {localized(count)}
                </Badge>
              </Link>
            </IconAction>
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
              <bdi dir="ltr" data-brand="">
                the quiet shelf<span className="text-copper">.</span>
              </bdi>
            </p>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              {t('common:browseEnduringBooksAndBuildACollectionWorthKeeping')}
            </p>
          </div>
          <nav
            aria-label={t('common:footerNavigation')}
            className="grid grid-cols-2 gap-x-8 gap-y-3 self-start text-sm text-muted-foreground [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a:hover]:text-primary [&_a:hover]:underline"
          >
            <Link to="/">{t('common:home')}</Link>
            <Link to="/books">{t('common:allBooks')}</Link>
            <Link to="/account/orders">{t('common:yourOrders')}</Link>
            <Link to="/account/profile">{t('common:yourProfile')}</Link>
          </nav>
        </PageContainer>
        <PageContainer className="flex flex-wrap justify-between gap-3 border-t border-border py-5 text-xs text-muted-foreground">
          <span>{t('common:2026TheQuietShelf')}</span>
          <span>{t('common:stripeTestPaymentsBooksForDelivery')}</span>
        </PageContainer>
      </footer>
    </div>
  )
}
