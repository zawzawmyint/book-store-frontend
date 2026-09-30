# The Quiet Shelf storefront

A React + TypeScript + Tailwind bookstore storefront. This folder is its own Git repository. The backend lives in the sibling `backend` repository and should be started first.

See [SPEC.md](SPEC.md) for the storefront behavior and current scope.

## Start

Requires Node.js 24 or later. In one terminal, start the backend; in another:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. Vite forwards `/graphql` to the local backend. For a separately hosted API, set `VITE_GRAPHQL_URL` to its full URL and allow the frontend origin in the backend's `FRONTEND_ORIGIN` setting.

## How it connects

```text
React page → Apollo Client → POST /graphql → Express resolver → SQLite
React page ← Apollo Client ← GraphQL response ← Express resolver
```

The catalog and detail screens run GraphQL queries. The cart is stored in browser storage. Checkout sends a `placeOrder` mutation; the backend checks the items and calculates the final total. Checkout currently records an order request and takes no payment.

## Structure

```text
src/
  main.tsx                    Application entry point and providers
  app/                        Routes and shared layout
  features/
    books/                    Catalog pages and book components
    cart/                     Cart state, rules, and cart page
    checkout/                 Order request page
  lib/                        Apollo client and formatting
  generated/                  Generated GraphQL TypeScript documents
  operations.graphql          Queries and mutation used by the UI
```

React components are the view layer. Apollo Client sends requests to GraphQL resolvers in the backend; business rules and SQL remain on the server.

The operation definitions are in [`src/operations.graphql`](src/operations.graphql). Generated TypeScript types and documents are committed under `src/generated/`, so a normal build does not require the backend to be running. After changing the backend schema or frontend operations, start the backend and run:

```powershell
npm run codegen
```

## Checks

```powershell
npm test
npm run lint
npm run build
```

The design uses locally rendered book covers, so browsing does not depend on a remote image service.
