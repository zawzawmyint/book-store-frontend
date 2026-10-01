# The Quiet Shelf storefront — admin panel specification

> **Status:** Implemented. **Date:** 2026-10-01.

## Goal and agreed scope

Give store administrators an `/admin` area in the existing React application for book and inventory management and order-request viewing. The user selected delivery in phases, including order viewing. The authoritative API contract, authorization, validation limits, and migrations are in [the backend spec](../../../backend/specs/admin/SPEC.md).

## Current system and design choice

- React Router owns routes, Better Auth owns sessions, Apollo owns server data, React Hook Form and Zod own forms, and Zustand owns the persisted customer cart.
- Add an admin layout and feature folder to this application. This reuses its login, API connection, UI primitives, and deployment. A separate frontend would add deployment and session integration work; a generic admin framework would add a dependency and contract adaptation work. Neither is needed for this scope.
- Use the existing storefront visual language, with clear admin navigation and a link back to the store. Admins retain normal shopping access.
- Exclude customer account management, role management UI, image uploads, analytics dashboards, bulk import/export, book deletion, order status changes, payment, shipping, and email notifications.

## Phase 1 — access and navigation

- `/admin` redirects authorized admins to `/admin/books`. Admin routes use an `AdminLayout` with Books, Orders when phase 3 is delivered, and Back to store links. Display an Admin link in signed-in navigation only after `viewer.role` resolves to `ADMIN`.
- Use the existing sign-in page. Guests entering an admin route go to `/sign-in` with a validated internal return path. Signed-in customers receive an access-denied screen with a link to the store; never create a sign-in redirect loop.
- Resolve access using the backend `viewer` query after Better Auth session resolution. Do not infer role from email, local storage, browser-supplied data, or the presence of an Admin link. A customer viewing the denied screen has no mounted admin data queries.
- Provide loading and retryable error states while access is unresolved. Do not render private content during session transitions or before authorization succeeds.
- Fetch viewer access on protected route entry and revalidate on window focus. On `FORBIDDEN`, immediately hide private content, remove admin cached results, and show access denied. On `UNAUTHENTICATED`, clear private data and redirect to sign-in. The backend checks membership on every request, even if a page still displays an old role.
- Extend the existing session boundary/cache behavior to prevent admin data appearing after sign-out, switching accounts, or a detected role downgrade for the same account. If necessary, clearing the Apollo store is acceptable; preserve the local customer cart.
- Admin provisioning is an operator task documented in the backend spec. No registration or account screen allows users to request or assign their own role.

## Phase 2 — books and stock

### Routes and listing

- `/admin/books`: paginated catalog management using `adminBooks`, 20 rows per page. Show title, author, genre, price, stock, and active/archived state, with edit, stock adjustment, and archive/restore actions.
- Provide search, Active/Archived/All selection, and Low stock only. Default to Active; low stock means stock at most 5, including zero. Store applied search/filter/page state in URL parameters, validate malformed parameters, and reset pagination when filters change.
- Search submits explicitly, follows the backend's title/author/genre matching, and does not filter just the current page locally. Provide loading, empty, error/retry, and pagination states. If a successful write leaves the current page empty beyond the new total, move to the last valid page and refetch.
- `/admin/books/new`: create a book with initial stock. `/admin/books/:id/edit`: edit metadata, including for an archived book. Malformed or missing IDs show a book-not-found state and a return link.

### Forms and validation

- Use React Hook Form, local Zod schemas, and existing UI primitives. Fields are title, author, genre, description, and price; only creation includes initial stock. Apply the backend's trimming and length limits, allow duplicate titles, and keep genre as free text.
- Display price in the existing store currency with at most two decimal places. Parse the entered decimal string to integer cents without floating-point rounding, reject extra decimal places and negative/out-of-range values, and submit `priceCents`. Zero price is allowed. Do not introduce a currency setting.
- Stock inputs require whole numbers. Match the backend's initial stock and stock delta limits. Keep creation and metadata edit separate from stock adjustment so an old metadata form cannot overwrite inventory.
- Give every input an accessible label, associate field errors, show server errors, and disable repeated submission while pending. Preserve entered values on validation or network failure. After success, show confirmation, refresh affected data, and navigate back to the listing with its prior filters.
- Editing historical data outside the new write bounds requires correcting those fields explicitly; do not silently truncate text or clamp values.

### Inventory and archive actions

- A stock adjustment dialog shows current stock, a signed quantity change, and an estimated resulting stock. Explain positive values as adding stock and negative values as removing stock. The server applies the change to current stored stock; display the returned stock on success.
- On insufficient stock or other validation failure, retain the entered adjustment, refresh current stock, and show the error. On an ambiguous network failure, explain that the result is unknown and require refreshing/checking inventory before another deliberate submission. Do not automatically retry or assume a refetch proves whether that adjustment ran.
- Require confirmation before archive or restore. Explain that archive hides the book and prevents new orders while preserving earlier orders; restore makes it available again. Never offer permanent deletion.
- Refetch affected admin list/detail data and public catalog/detail/genres after successful catalog writes; invalidate stale public book detail data when archive returns null. Do not optimistically change inventory or order totals.
- Existing cart lines remain readable after catalog edits/archive. Checkout failures caused by archived or unavailable books retain the cart and show a clear message so the customer can remove the affected item. Cart prices remain estimates; the backend calculates actual totals.

## Phase 3 — order viewing

- `/admin/orders`: paginated `adminOrders` listing, 20 per page, newest first using the backend's timestamp and ID ordering. Show request ID, date, captured customer name/email, total, and a View link. Include legacy guest requests without implying account ownership.
- `/admin/orders/:id`: `adminOrder` detail with request ID, date, captured contact details, total, and line-item titles, quantities, and unit prices. Compute displayed line subtotals from saved unit prices and quantities; show the stored order total as authoritative.
- Label these records as **order requests**. Do not imply payment, shipment, or fulfillment, and do not show processing actions or invented status badges.
- Provide loading, empty, error/retry, missing-order, and pagination states. Preserve the listing page when returning from a detail view. Render customer-provided strings as text, never HTML.
- Query contact and order data only inside the authorized admin route. Never persist admin response data in local storage or the cart store.

## API integration and ownership

- Add typed operations for `viewer`, `adminBooks`, `adminBook`, `createBook`, `updateBook`, `adjustBookStock`, `setBookArchived`, `adminOrders`, and `adminOrder` to `src/operations.graphql`. Regenerate `src/generated/graphql.ts` against the matching backend; do not hand-edit generated code.
- Keep same-origin `/graphql` and `/api/auth` proxies. No separate API URL or session token storage is required.
- `src/features/admin/` owns guards, layout, pages, dialogs, and local form schemas. Existing `src/app/App.tsx`, `src/app/Layout.tsx`, and `src/app/SessionBoundary.tsx` integrate routes, navigation, and privacy boundaries. Shared primitives remain in `src/app/components/ui/`.
- Apollo owns viewer, book, and order data; Better Auth owns session identity; local form state owns unsaved edits. Zustand continues to own only the customer cart and its existing storage format.
- Update existing root specs to describe delivered behavior only after each phase passes acceptance checks; both admin feature specs are Implemented after the full agreed scope passes verification.

## Accessibility and responsive behavior

### Implemented — shadcn/ui Sidebar

- Admin navigation uses the official shadcn/ui Sidebar, its provider, groups, menu items, and trigger, themed for the bookstore.
- At widths below 1024px, open navigation in the Sidebar's accessible Sheet dialog. Close after navigation or Escape and return focus to Admin menu. Desktop navigation remains beside page content with the active route indicated.
- Preserve Books, Order requests, and Back to store destinations. No API contracts change.

### Implemented — responsive admin navigation

- At desktop widths (1024px and above), show a left sidebar with Catalog → Books and Sales → Order requests. Keep the active section clear on nested edit/detail routes.
- Below 1024px, an Admin menu button opens the same grouped navigation in the Sidebar's modal Sheet. Expose its expanded state to assistive technology. Selecting a link, the Close admin menu button, or Escape closes it and returns focus to the menu button.
- Keep Back to store in the admin header and the existing account menu in the application header. Do not add links to features that do not exist.
- Verified: desktop navigation sits beside the content; mobile navigation starts collapsed, works by keyboard, closes after navigation, and produces no page overflow at 390px. Sidebar groups leave room for additional implemented sections.

- All actions and dialogs are keyboard accessible with visible focus, dialog focus containment and restoration, associated labels/errors, and announced loading/success/error states.
- Tables have meaningful headers; archive state and low stock are communicated with text, not color alone. Small screens use a readable stacked layout or a clearly contained scrolling table; navigation and form actions stay reachable.
- Do not show previous private results under a loading indicator after an identity change or access failure.

## Acceptance criteria and validation

- [x] Guests redirect to sign-in and return to their internal admin destination; customers see access denied; admins reach the dedicated layout and retain storefront access.
- [x] Access loading, errors, expiry, sign-out, account switching, and detected membership revocation never expose cached admin results to another account.
- [x] Admins can search/filter/page books, create/edit metadata, adjust stock, and archive/restore with the specified validation and confirmation behavior.
- [x] Price input converts exactly to cents; metadata edits never submit stock; inventory errors retain input and display refreshed stock. Ambiguous mutation failures do not trigger automatic retries.
- [x] Successful writes refresh affected admin/public data. Archived books disappear from browsing; stale-cart checkout fails visibly and preserves the cart.
- [x] Admins can list and view all order requests, including legacy guest history, with saved contact/price snapshots and no invented payment or processing state.
- [x] Forms, tables, dialogs, navigation, and error states work with a keyboard and at narrow viewport widths.
- [x] Before implementation, add focused failing component/unit tests for access states, exact price parsing, form validation, mutation failures, and cache privacy. Add Playwright journeys for guest/customer rejection, admin book/inventory/archive workflows, revoked access, and order viewing.
- [x] Playwright provisions admin membership only in its isolated test API/database fixture. It never modifies development or production permissions or data, and no test-only public promotion endpoint ships.
- [x] Run frontend `bun run test`, `bun run lint`, `bun run build`, and `bun run test:e2e`, coordinating backend checks and codegen per phase. Manually verify keyboard/focus behavior, responsive layouts, and an unavailable-book checkout error.

## Delivered decisions

The delivered design uses one application with a separate admin layout, existing login, server-reported roles, a fixed low-stock threshold of 5, atomic stock adjustments, and read-only order administration. Both feature specs describe delivered behavior.

## Verification evidence

The frontend unit/component suite passes 16 tests, including access denial, supported session refresh after expiry, exact price parsing, validation limits, ambiguous/rejected inventory responses, and preservation of unsaved input during same-account background access checks. Initial access and identity transitions hide private content; completed revocation checks immediately hide the preserved form. Eight Chromium browser journeys cover responsive sidebar/menu navigation, guest/customer rejection, book forms and filters, stock changes, archive/restore, saved order lines, revoked/expired access, and existing customer checkout/history/cart behavior. Keyboard Escape returns dialog focus to its opener and closes the mobile menu with focus restored to its button. Desktop (1280px) and mobile (390px) navigation screenshots were inspected. Frontend lint and production build pass; Vite retains its existing large-chunk advisory. The e2e fixture's seeded permissions and revoke endpoint exist only in test code.
