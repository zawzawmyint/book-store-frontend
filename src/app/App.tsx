import { CheckoutReturnPage } from '../features/checkout/pages/CheckoutReturnPage'
import { OrderPage as CustomerOrderPage } from '../features/account/pages/OrderPage'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Layout } from './Layout'
import { HomePage } from '../features/books/pages/HomePage'
import { BookPage } from '../features/books/pages/BookPage'
import { CartPage } from '../features/cart/pages/CartPage'
import { CheckoutPage } from '../features/checkout/pages/CheckoutPage'
import { PageContainer } from './components/PageContainer'
import { RequireSession } from '../features/auth/RequireSession'
import { AuthPage } from '../features/auth/pages/AuthPage'
import { OrdersPage } from '../features/account/pages/OrdersPage'
import { ProfilePage } from '../features/account/pages/ProfilePage'
import { SessionBoundary } from './SessionBoundary'
import { AdminAccessProvider } from '../features/admin/AdminAccessProvider'
import { RequireWorkspaceAccess } from '../features/admin/RequireWorkspaceAccess'
import { AdminLayout } from '../features/admin/AdminLayout'
import { BooksPage as AdminBooksPage } from '../features/admin/pages/BooksPage'
import { BookFormPage } from '../features/admin/pages/BookFormPage'
import { OrdersPage as AdminOrdersPage } from '../features/admin/pages/OrdersPage'
import { OrderPage } from '../features/admin/pages/OrderPage'
import { UsersPage } from '../features/admin/pages/UsersPage'
import { UserPage } from '../features/admin/pages/UserPage'
import { AdminProfilePage } from '../features/admin/pages/AdminProfilePage'
import { LegacyUsersRedirect } from '../features/admin/LegacyUsersRedirect'
import { ActivityPage } from '../features/admin/pages/ActivityPage'
import { BookHistoryPage } from '../features/admin/pages/BookHistoryPage'
import { TooltipProvider } from './components/ui/tooltip'
const DashboardPage = lazy(() => import('../features/admin/pages/DashboardPage'))

export default function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <SessionBoundary>
          <AdminAccessProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/books/:id" element={<BookPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/sign-in" element={<AuthPage mode="sign-in" />} />
                <Route path="/sign-up" element={<AuthPage mode="sign-up" />} />
                <Route element={<RequireSession />}>
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/checkout/return/:orderId" element={<CheckoutReturnPage />} />
                  <Route path="/account/orders" element={<OrdersPage />} />
                  <Route path="/account/orders/:id" element={<CustomerOrderPage />} />
                  <Route path="/account/profile" element={<ProfilePage />} />
                </Route>
                <Route
                  path="*"
                  element={
                    <PageContainer className="py-24 font-serif text-4xl">
                      Page not found
                    </PageContainer>
                  }
                />
              </Route>
              <Route element={<RequireWorkspaceAccess />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route
                    index
                    element={
                      <Suspense fallback={<p role="status">Loading dashboard…</p>}>
                        <DashboardPage />
                      </Suspense>
                    }
                  />
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
                </Route>
              </Route>
            </Routes>
          </AdminAccessProvider>
        </SessionBoundary>
      </BrowserRouter>
    </TooltipProvider>
  )
}
