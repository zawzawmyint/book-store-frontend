import { t, useI18n } from '../lib/i18n'
import { useTheme } from '../lib/theme'
import { NotificationsPage } from '../features/notifications/NotificationsPage'
import { CheckoutReturnPage } from '../features/checkout/pages/CheckoutReturnPage'
import { OrderPage as CustomerOrderPage } from '../features/account/pages/OrderPage'
import { BrowserRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Layout } from './Layout'
import { HomePage } from '../features/books/pages/HomePage'
import { CatalogPage } from '../features/books/pages/CatalogPage'
import { BookPage } from '../features/books/pages/BookPage'
import { CartPage } from '../features/cart/pages/CartPage'
import { CheckoutPage } from '../features/checkout/pages/CheckoutPage'
import { PageContainer } from './components/PageContainer'
import { BookLoader } from './components/BookLoader'
import { RequireSession } from '../features/auth/RequireSession'
import { AuthPage } from '../features/auth/pages/AuthPage'
import {
  CheckEmailPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerificationResultPage,
} from '../features/auth/pages/AuthEmailPages'
import { OrdersPage } from '../features/account/pages/OrdersPage'
import { ProfilePage } from '../features/account/pages/ProfilePage'
import { SessionBoundary } from './SessionBoundary'
import { AdminAccessProvider } from '../features/admin/AdminAccessProvider'
import { RequireWorkspaceAccess } from '../features/admin/RequireWorkspaceAccess'
import { AdminLayout } from '../features/admin/AdminLayout'
import { LegacyUsersRedirect } from '../features/admin/LegacyUsersRedirect'
import { TooltipProvider } from './components/ui/tooltip'
import { Direction } from 'radix-ui'
const DashboardPage = lazy(() => import('../features/admin/pages/DashboardPage'))
const AdminBooksPage = lazy(() =>
  import('../features/admin/pages/BooksPage').then((module) => ({ default: module.BooksPage })),
)
const BookFormPage = lazy(() =>
  import('../features/admin/pages/BookFormPage').then((module) => ({
    default: module.BookFormPage,
  })),
)
const AdminOrdersPage = lazy(() =>
  import('../features/admin/pages/OrdersPage').then((module) => ({ default: module.OrdersPage })),
)
const OrderPage = lazy(() =>
  import('../features/admin/pages/OrderPage').then((module) => ({ default: module.OrderPage })),
)
const UsersPage = lazy(() =>
  import('../features/admin/pages/UsersPage').then((module) => ({ default: module.UsersPage })),
)
const UserPage = lazy(() =>
  import('../features/admin/pages/UserPage').then((module) => ({ default: module.UserPage })),
)
const AdminProfilePage = lazy(() =>
  import('../features/admin/pages/AdminProfilePage').then((module) => ({
    default: module.AdminProfilePage,
  })),
)
const ActivityPage = lazy(() =>
  import('../features/admin/pages/ActivityPage').then((module) => ({
    default: module.ActivityPage,
  })),
)
const BookHistoryPage = lazy(() =>
  import('../features/admin/pages/BookHistoryPage').then((module) => ({
    default: module.BookHistoryPage,
  })),
)

function AdminPageOutlet() {
  useI18n()
  const { pathname } = useLocation()
  return (
    <Suspense key={pathname} fallback={<BookLoader label={t('common:loading')} />}>
      <Outlet />
    </Suspense>
  )
}

export default function App() {
  const { direction } = useI18n()
  // Keep cross-tab appearance updates active while account menus are closed.
  useTheme()

  return (
    <Direction.Provider dir={direction}>
      <TooltipProvider>
        <BrowserRouter>
          <SessionBoundary>
            <AdminAccessProvider>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/books" element={<CatalogPage />} />
                  <Route path="/books/:id" element={<BookPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/sign-in" element={<AuthPage mode="sign-in" />} />
                  <Route path="/sign-up" element={<AuthPage mode="sign-up" />} />
                  <Route path="/check-email" element={<CheckEmailPage />} />
                  <Route path="/verification-result" element={<VerificationResultPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route element={<RequireSession />}>
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/checkout/return/:orderId" element={<CheckoutReturnPage />} />
                    <Route path="/account/orders" element={<OrdersPage />} />
                    <Route path="/account/orders/:id" element={<CustomerOrderPage />} />
                    <Route path="/account/profile" element={<ProfilePage />} />
                    <Route path="/account/notifications" element={<NotificationsPage />} />
                  </Route>
                  <Route
                    path="*"
                    element={
                      <PageContainer className="py-24 font-serif text-4xl">
                        {t('common:pageNotFound')}
                      </PageContainer>
                    }
                  />
                </Route>
                <Route element={<RequireWorkspaceAccess />}>
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route
                      index
                      element={
                        <Suspense fallback={<BookLoader label={t('common:loadingDashboard')} />}>
                          <DashboardPage />
                        </Suspense>
                      }
                    />
                    <Route element={<AdminPageOutlet />}>
                      <Route path="books" element={<AdminBooksPage />} />
                      <Route path="books/new" element={<BookFormPage />} />
                      <Route path="books/:id/edit" element={<BookFormPage />} />
                      <Route path="orders" element={<AdminOrdersPage />} />
                      <Route path="orders/:id" element={<OrderPage />} />
                      <Route element={<RequireWorkspaceAccess adminOnly />}>
                        <Route path="activity" element={<ActivityPage />} />
                        <Route path="books/:id/history" element={<BookHistoryPage />} />
                        <Route path="users" element={<UsersPage />} />
                        <Route path="users/:id" element={<UserPage />} />
                        <Route path="customers" element={<LegacyUsersRedirect />} />
                        <Route path="customers/:id" element={<LegacyUsersRedirect />} />
                      </Route>
                      <Route path="profile" element={<AdminProfilePage />} />
                      <Route path="notifications" element={<NotificationsPage />} />
                    </Route>
                  </Route>
                </Route>
              </Routes>
            </AdminAccessProvider>
          </SessionBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </Direction.Provider>
  )
}
