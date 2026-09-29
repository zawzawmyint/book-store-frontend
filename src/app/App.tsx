import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './Layout'
import { HomePage } from '../features/books/pages/HomePage'
import { BookPage } from '../features/books/pages/BookPage'
import { CartPage } from '../features/cart/pages/CartPage'
import { CheckoutPage } from '../features/checkout/pages/CheckoutPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/books/:id" element={<BookPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route
            path="*"
            element={
              <div className="mx-auto max-w-[1280px] px-5 py-24 font-serif text-4xl sm:px-10">
                Page not found
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
