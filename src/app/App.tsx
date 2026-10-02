import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './Layout'
import { HomePage } from '../features/books/pages/HomePage'
import { BookPage } from '../features/books/pages/BookPage'
import { CartPage } from '../features/cart/pages/CartPage'
import { CheckoutPage } from '../features/checkout/pages/CheckoutPage'
import { PageContainer } from './components/PageContainer'
import { RequireSession } from '../features/auth/RequireSession'
import { AuthPage } from '../features/auth/pages/AuthPage'
import { OrdersPage } from '../features/account/pages/OrdersPage'
import { SessionBoundary } from './SessionBoundary'
import { AdminAccessProvider } from '../features/admin/AdminAccessProvider'
import { RequireAdmin } from '../features/admin/RequireAdmin'
import { AdminLayout } from '../features/admin/AdminLayout'
import { BooksPage as AdminBooksPage } from '../features/admin/pages/BooksPage'
import { BookFormPage } from '../features/admin/pages/BookFormPage'
import { OrdersPage as AdminOrdersPage } from '../features/admin/pages/OrdersPage'
import { OrderPage } from '../features/admin/pages/OrderPage'

export default function App() {
  return (
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
                <Route path="/account/orders" element={<OrdersPage />} />
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
            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="books" replace />} />
                <Route path="books" element={<AdminBooksPage />} />
                <Route path="books/new" element={<BookFormPage />} />
                <Route path="books/:id/edit" element={<BookFormPage />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="orders/:id" element={<OrderPage />} />
              </Route>
            </Route>
          </Routes>
        </AdminAccessProvider>
      </SessionBoundary>
    </BrowserRouter>
  )
}
