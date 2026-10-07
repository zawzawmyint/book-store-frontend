# The Quiet Shelf storefront specification

> The [implemented Stripe checkout specification](specs/stripe-checkout/SPEC.md) covers
> hosted test payment, payment-aware order processing, expiry, and refund feedback.

> This document describes implemented behavior. See [the authentication feature spec](specs/authentication/SPEC.md) for the detailed account contract and [the demo-login feature spec](specs/demo-login/SPEC.md) for optional local demo controls.

> The implemented Staff permission model is defined in [the staff roles specification](specs/staff/SPEC.md), with user-directory compatibility details in [the user directory specification](specs/users/SPEC.md). Customer-named admin URLs remain redirects for existing bookmarks.

## Purpose and current scope

The implemented [order workflow](specs/order-workflow/SPEC.md) adds customer
status details and Staff/Admin processing while preserving order-request wording.

The implemented [icons and typography specification](specs/icons-typography/SPEC.md) defines compact, accessible icon actions and self-hosted Lora/Source Sans 3 fonts across the storefront and workspace.

The implemented [appearance specification](specs/appearance/SPEC.md) defines the shared Light/Dark switch for the storefront and workspace. Dark is the default; the browser-level choice is stored independently of accounts and applies before React renders.

The implemented [activity history specification](specs/activity/SPEC.md) defines an Admin-only Activity page and book history. It requires the coordinated backend migration and deployment.

Provide a browser storefront for finding books, maintaining a cart, and beginning an
authenticated Stripe hosted Checkout payment through the separate GraphQL API. Checkout
does not collect shipping details, and delivery is not integrated.

## Routes and behavior

- `/` shows the catalog, search, genre shortcuts, and pagination. It requests 12 books per page. The shortcut genres come from the API.
- Search text is submitted with an icon-only Search books control, trimmed, and stored in the URL's `search` parameter. The backend searches title, author, and genre; the frontend does not filter the returned books itself.
- Genre shortcuts set the same search parameter. They are text searches, not a separate exact-match genre filter. A new search returns to the first page.
- `/books/:id` requests one book and shows its details, price, stock, and add-to-cart action.
- `/cart` shows cart lines, quantity controls, removal, and a client-side estimated total. Zustand manages shared cart state and persists items in browser local storage using the existing `book-store-cart` key and raw JSON array format. Count and estimated total are derived from items. Previously saved carts remain readable, invalid entries are filtered out, and storage failures leave in-memory cart interactions usable.
- `/sign-up` and `/sign-in` create or access a Better Auth account. Authentication is required for `/checkout`, `/account/orders`, `/account/orders/:id`, and `/account/profile`; a guarded route sends guests to sign-in with an internal return path.
- When Vite is in development, `VITE_DEMO_LOGIN=true`, and the browser uses a loopback host, `/sign-in` also offers the three local demo accounts seeded by the backend. Their normal Better Auth sign-in destinations are `/` for Customer and `/admin/books` for Staff or Admin; production, non-loopback, sign-up, and signed-in states show no demo controls.
- `/checkout` displays account contact details and sends only book IDs, quantities, and
  a generated request key through `createCheckout`. It redirects only to the returned
  Stripe hosted test URL. A confirmed paid return clears only an unchanged submitted
  cart; unavailable or failed attempts retain it. `/checkout/return/:orderId` refreshes
  backend payment state and offers bounded confirmation polling/resume where allowed.
- `/account/orders` lists only the signed-in customer's order requests with pagination, status badges, and detail links. `/account/orders/:id` shows that owner's saved request and safe oldest-first status timeline; a missing or non-owned request has the same not-found state.
- `/account/profile` shows the signed-in email and join date as read-only text. The same person can save their display name and change their password. The storefront Account menu links to Profile before Orders. See [the account profile spec](specs/profile/SPEC.md).
- The storefront header and workspace headers, including workspace access screens, expose an icon-only, keyboard-accessible Light/Dark switch. Its sun/moon icon shows the current mode; its Dark mode switch semantics and tooltip state describe the next action. It uses the `book-store-theme` browser-storage key, accepts only `light` and `dark`, and falls back to Dark when the key is missing, invalid, removed, or unavailable. Preferences synchronize across tabs; device appearance is not used.
- A session boundary unmounts routed content during session revalidation and clears Apollo data before rendering after any user ID change, including sign-out.
- Unknown routes show a not-found page.

## Admin routes

- `/admin` redirects Staff and Admin to `/admin/books`; guests redirect to sign-in with an internal return path, and Customers see access denied. The Account menu exposes Admin for Admin and Staff workspace for Staff after server authorization.
- Admin routes render outside the storefront shell, with neutral surfaces, compact tables/forms, and sans-serif headings. A full-height dark forest-green grouped sidebar stays visible at desktop widths (1024px and above); smaller screens use the same navigation in an accessible Admin menu Sheet. Its brighter brand icon, muted group labels, and rounded active link with a mint accent maintain visible navigation states. The menu closes after navigation or Escape and restores focus, and nested routes retain active navigation. Back to store is in the sidebar footer. A compact sticky header provides account/sign-out access; access-denied and retry screens retain an account menu.
- `/admin/books`, `/admin/books/new`, and `/admin/books/:id/edit` support catalog search/filter/pagination, creation, metadata editing, and atomic stock adjustments for Staff and Admin. Only Admin sees or can use archive/restore confirmations. `AdminFilterToolbar` trims submitted searches, accepts page-specific filters, and leaves Books responsible for URL filters and pagination reset. `BookRowActions` owns row links, role-specific History and More-actions controls, and archive-menu focus handling; `ArchiveBookDialog` owns archive confirmation, busy/error feedback, refresh, and focus return. `StockDialog` remains the stock interaction boundary. Catalog rows use compact storefront-palette thumbnails; Edit and Adjust stock stay direct actions, while Archive/Restore is in a per-row More actions menu for Admin.
- Admin list pages share `AdminPageTable` for table structure, empty states, visible item ranges, totals, and pagination, with a shared page size of five used for API limits, offsets, and page counts. `AdminPageHeader` provides reusable titles, descriptions, and actions on list and book-form pages.
- `/admin/orders` and `/admin/orders/:id` show saved orders, captured contact/price
  snapshots, and payment state to Staff and Admin. The list has URL-backed status
  filtering and five-item pagination. Payment-required orders can be accepted/completed
  only after verified payment; paid cancellation restores stock once and queues a full
  refund. Workspace detail shows attributed status history; owner detail does not.
- `/admin/users` is Admin-only and lists registered accounts in pages of five, with search, an All/Customers/Staff/Admin filter, copyable user IDs, and confirmed role changes. Each row opens `/admin/users/:id`. See [the staff roles specification](specs/staff/SPEC.md).
- `/admin/users/:id` is Admin-only, shows one account, and lets an admin set another person's password. The signed-in admin's own page links to `/admin/profile`. `/admin/customers` and `/admin/customers/:id` replace browser history while redirecting to the equivalent user route, preserving the ID, query string, and hash. A recognized internal legacy list return location is normalized to `/admin/users`; other return state is not used.
- `/admin/activity` is Admin-only and lists recorded catalog, account, and order-status changes newest first. It has URL-backed actor, action, local-date, and price-change filters, with five-item pagination. `/admin/books/:id/history` is Admin-only and presents that book's retained history, including cancellation stock-restoration events and archived or deleted-target snapshots. Only Admin sees Activity navigation and book-row History links; denied direct routes do not mount activity queries. History begins after the migrated backend is running and never backfills earlier changes.
- `/admin/profile` shows the signed-in Staff or Admin user's email and join date, and lets that person update their own name and password. The workspace Account menu opens it before Sign out. See [the account profile spec](specs/profile/SPEC.md).
- Admin queries use no-cache responses; session changes clear Apollo data, and detected role loss or Admin-to-Staff transition hides private user-management views. Route entry and focus revalidate server access. A denied Admin-only action refreshes the viewer while retaining Staff workspace access when still permitted. Expired sessions refresh Better Auth state before redirecting to login.
- Inventory mutation network failures are not automatically retried. Archived cart items fail checkout visibly while preserving the cart. See [the admin feature spec](specs/admin/SPEC.md) for all routes and acceptance criteria.

## GraphQL integration

- `src/operations.graphql` defines catalog, checkout creation/resume/refresh, receipt,
  owner detail/history, workspace order/refund retry, status-transition, and Activity
  operations; generated types are committed from codegen.
- `src/generated/graphql.ts` contains generated typed documents and response/variable types; it is regenerated with `bun run codegen` when operations or the backend schema change.
- Storefront and workspace code import generated documents and types directly from `src/generated/graphql.ts`. `src/lib/apollo-client.ts` owns Apollo client setup; it does not define operation aliases.
- Apollo Client sends credentialed requests to `VITE_GRAPHQL_URL` when set, otherwise `/graphql`. Better Auth's React client uses `/api/auth`. Vite proxies both paths to `VITE_API_TARGET` (default `http://localhost:4000`) during development.
- The backend is authoritative for stock, prices, order totals, and payment state.
  Locally displayed cart totals are estimates until checkout reserves the order.

## UI and validation

- Copied shadcn/ui primitives live in `src/app/components/ui/`, with `components.json` configuring their location. Storefront and admin screens use them for actions, forms, filters, dialogs, menus, cards, tables, feedback, and loading states. Admin styling is scoped to the workspace and its portaled dialogs, menus, and navigation; storefront styling and accessible labels/focus behavior are preserved.
- Account forms use React Hook Form and a local Zod schema through `@hookform/resolvers`. Sign-up names are trimmed to 1–120 characters; emails are normalized and limited to 254 characters.
- Invalid account fields show associated errors and prevent submission. Server errors remain visible and the cart survives failed order requests. The backend remains authoritative for validation and stock.
- Catalog validation errors from the backend retain `BAD_USER_INPUT`; their message may identify the first invalid input condition. Existing frontend error handling and cart-retention behavior apply.
- `rxjs` remains a direct dependency because Apollo Client requires it as a peer dependency.
- Bun 1.3.14 manages dependencies with committed `bun.lock` and frozen installs. Node.js 24 or later runs development and build tooling.

## Acceptance checks

- Run `bun run test`, `bun run lint`, and `bun run build`.
- Playwright Chromium tests cover account creation, checkout access, owner-safe order history/detail, Customer→Staff→Admin workflow completion/cancellation, archived-stock restoration, direct API rejection, session/role loss, mobile/keyboard behavior, appearance, and Activity permissions/history. Run `bun run test:e2e:install` once, then `bun run test:e2e` with both repositories installed. The suite starts an in-memory API on 4100 and frontend on 4173, keeping persisted databases untouched.
- Catalog loading, empty and error states, search, pagination, book detail, cart updates, and order-request success and failure remain usable.
