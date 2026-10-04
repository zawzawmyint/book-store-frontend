# The Quiet Shelf storefront specification

> This document describes implemented behavior. See [the authentication feature spec](specs/authentication/SPEC.md) for the detailed account contract.

## Purpose and current scope

Provide a browser storefront for finding books, maintaining a cart, and submitting an authenticated order request to the separate GraphQL API. The checkout does not collect payment or shipping details.

## Routes and behavior

- `/` shows the catalog, search, genre shortcuts, and pagination. It requests 12 books per page. The shortcut genres come from the API.
- Search text is submitted with the Go button, trimmed, and stored in the URL's `search` parameter. The backend searches title, author, and genre; the frontend does not filter the returned books itself.
- Genre shortcuts set the same search parameter. They are text searches, not a separate exact-match genre filter. A new search returns to the first page.
- `/books/:id` requests one book and shows its details, price, stock, and add-to-cart action.
- `/cart` shows cart lines, quantity controls, removal, and a client-side estimated total. Zustand manages shared cart state and persists items in browser local storage using the existing `book-store-cart` key and raw JSON array format. Count and estimated total are derived from items. Previously saved carts remain readable, invalid entries are filtered out, and storage failures leave in-memory cart interactions usable.
- `/sign-up` and `/sign-in` create or access a Better Auth account. Authentication is required for `/checkout`, `/account/orders`, and `/account/profile`; a guarded route sends guests to sign-in with an internal return path.
- `/checkout` displays account contact details and sends only book IDs and quantities through `placeOrder`. On success it shows the returned order ID and server-calculated total and clears the cart. On failure it keeps the cart.
- `/account/orders` lists only the signed-in customer's order requests with pagination.
- `/account/profile` shows the signed-in email and join date as read-only text. The same person can save their display name and change their password. The storefront Account menu links to Profile before Orders. See [the account profile spec](specs/profile/SPEC.md).
- A session boundary unmounts routed content during session revalidation and clears Apollo data before rendering after any user ID change, including sign-out.
- Unknown routes show a not-found page.

## Admin routes

- `/admin` redirects authorized administrators to `/admin/books`; guests redirect to sign-in with an internal return path, and customers see access denied. The existing Account menu exposes Admin only after server authorization.
- Admin routes render outside the storefront shell, with neutral surfaces, compact tables/forms, and sans-serif headings. A full-height dark forest-green grouped sidebar stays visible at desktop widths (1024px and above); smaller screens use the same navigation in an accessible Admin menu Sheet. Its brighter brand icon, muted group labels, and rounded active link with a mint accent maintain visible navigation states. The menu closes after navigation or Escape and restores focus, and nested routes retain active navigation. Back to store is in the sidebar footer. A compact sticky header provides account/sign-out access; access-denied and retry screens retain an account menu.
- `/admin/books`, `/admin/books/new`, and `/admin/books/:id/edit` support catalog search/filter/pagination, creation, metadata editing, atomic stock adjustments, and archive/restore confirmations. `AdminFilterToolbar` trims submitted searches, accepts page-specific filters, and leaves Books responsible for URL filters and pagination reset. Catalog rows use compact storefront-palette thumbnails; Edit and Adjust stock stay direct actions, while Archive/Restore is in a per-row More actions menu.
- Admin list pages share `AdminPageTable` for table structure, empty states, visible item ranges, totals, and pagination, with a shared page size of five used for API limits, offsets, and page counts. `AdminPageHeader` provides reusable titles, descriptions, and actions on list and book-form pages.
- `/admin/orders` and `/admin/orders/:id` show all saved order requests and captured contact/price snapshots, including legacy guest records. They provide no payment, shipping, or order processing actions.
- `/admin/customers` lists registered accounts in pages of five, with search, an All/Customers/Admins filter, copyable user IDs, and confirmed grant or revoke of admin access. Each row opens `/admin/customers/:id`. See [the customer directory spec](specs/customers/SPEC.md).
- `/admin/customers/:id` shows one account and lets an admin set another person's password. The signed-in admin's own page links to `/admin/profile`. See [the customer details spec](specs/customer-details/SPEC.md).
- `/admin/profile` shows the signed-in admin's email and join date, and lets that person update their own name and password. The admin Account menu opens it before Sign out. See [the account profile spec](specs/profile/SPEC.md).
- Admin queries use no-cache responses; session changes clear Apollo data, and detected membership revocation hides private views. Route entry and focus revalidate server access. Expired sessions refresh Better Auth state before redirecting to login.
- Inventory mutation network failures are not automatically retried. Archived cart items fail checkout visibly while preserving the cart. See [the admin feature spec](specs/admin/SPEC.md) for all routes and acceptance criteria.

## GraphQL integration

- `src/operations.graphql` defines the `Books`, `Book`, `PlaceOrder`, and `MyOrders` operations; `Books` also requests distinct genres.
- `src/generated/graphql.ts` contains generated typed documents and response/variable types; it is regenerated with `bun run codegen` when operations or the backend schema change.
- Apollo Client sends credentialed requests to `VITE_GRAPHQL_URL` when set, otherwise `/graphql`. Better Auth's React client uses `/api/auth`. Vite proxies both paths to `VITE_API_TARGET` (default `http://localhost:4000`) during development.
- The backend is authoritative for stock, prices, and order totals. Locally displayed cart totals are estimates until an order request succeeds.

## UI and validation

- Copied shadcn/ui primitives live in `src/app/components/ui/`, with `components.json` configuring their location. Storefront and admin screens use them for actions, forms, filters, dialogs, menus, cards, tables, feedback, and loading states. Admin styling is scoped to the workspace and its portaled dialogs, menus, and navigation; storefront styling and accessible labels/focus behavior are preserved.
- Account forms use React Hook Form and a local Zod schema through `@hookform/resolvers`. Sign-up names are trimmed to 1–120 characters; emails are normalized and limited to 254 characters.
- Invalid account fields show associated errors and prevent submission. Server errors remain visible and the cart survives failed order requests. The backend remains authoritative for validation and stock.
- Bun 1.3.14 manages dependencies with committed `bun.lock` and frozen installs. Node.js 24 or later runs development and build tooling.

## Acceptance checks

- Run `bun run test`, `bun run lint`, and `bun run build`.
- Playwright Chromium tests cover account creation, checkout access, order history, direct API rejection for guests, and stock failures with cart retention. Run `bun run test:e2e:install` once, then `bun run test:e2e` with both repositories installed. The suite starts an in-memory API on 4100 and frontend on 4173, keeping persisted databases untouched.
- Catalog loading, empty and error states, search, pagination, book detail, cart updates, and order-request success and failure remain usable.
