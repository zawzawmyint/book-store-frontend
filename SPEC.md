# The Quiet Shelf storefront specification

## Purpose and current scope

Provide a browser storefront for finding books, maintaining a cart, and submitting a guest order request to the separate GraphQL API. The checkout does not collect payment or shipping details.

## Routes and behavior

- `/` shows the catalog, search, genre shortcuts, and pagination. It requests 12 books per page.
- Search text is submitted with the Go button, trimmed, and stored in the URL's `search` parameter. The backend searches title, author, and genre; the frontend does not filter the returned books itself.
- Genre shortcuts set the same search parameter. They are text searches, not a separate exact-match genre filter. A new search returns to the first page.
- `/books/:id` requests one book and shows its details, price, stock, and add-to-cart action.
- `/cart` shows cart lines, quantity controls, removal, and a client-side estimated total. Cart contents persist in browser local storage.
- `/checkout` collects customer name and email and sends book IDs and quantities through `placeOrder`. On success it shows the returned order ID and server-calculated total and clears the cart. On failure it keeps the cart.
- Unknown routes show a not-found page.

## GraphQL integration

- `src/operations.graphql` defines the `Books`, `Book`, and `PlaceOrder` operations.
- `src/generated/graphql.ts` contains generated typed documents and response/variable types; it is regenerated with `npm run codegen` when operations or the backend schema change.
- Apollo Client sends requests to `VITE_GRAPHQL_URL` when set, otherwise `/graphql`. Vite proxies `/graphql` to the local backend during development.
- The backend is authoritative for stock, prices, and order totals. Locally displayed cart totals are estimates until an order request succeeds.

## Acceptance checks

- `npm test`, `npm run lint`, and `npm run build` pass.
- Catalog loading, empty and error states, search, pagination, book detail, cart updates, and order-request success and failure remain usable.
