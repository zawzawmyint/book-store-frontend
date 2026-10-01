import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'
import { BookDocument, BooksDocument, MyOrdersDocument, PlaceOrderDocument } from '../generated/graphql'
import type { BookQuery, PlaceOrderMutation } from '../generated/graphql'

export type Book = NonNullable<BookQuery['book']>
export type OrderReceipt = PlaceOrderMutation['placeOrder']

export const client = new ApolloClient({
  link: new HttpLink({ uri: import.meta.env.VITE_GRAPHQL_URL || '/graphql', credentials: 'include' }),
  cache: new InMemoryCache(),
})

export const BOOKS_QUERY = BooksDocument
export const BOOK_QUERY = BookDocument
export const PLACE_ORDER = PlaceOrderDocument
export const MY_ORDERS = MyOrdersDocument
