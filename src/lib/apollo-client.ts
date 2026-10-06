import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client'

export const client = new ApolloClient({
  link: new HttpLink({
    uri: import.meta.env.VITE_GRAPHQL_URL || '/graphql',
    credentials: 'include',
  }),
  cache: new InMemoryCache(),
})
