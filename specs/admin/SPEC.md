# The Quiet Shelf storefront — admin panel specification

> **Status:** Implemented. **Date:** 2026-10-02.

> **Role-model update (2026-10-05):** The original two-role access description below is historical. The implemented [Staff specification](../staff/SPEC.md) defines the current Customer/Staff/Admin permissions, Admin-only Users routes, and Staff workspace behavior.

## Implemented — dedicated admin workspace (2026-10-02)

- Move the existing `/admin` routes outside the storefront layout. Keep authorization, redirects, API contracts, query parameters, and catalog/order workflows intact.
- Use a full-height shadcn Sidebar, a compact sticky header with account/sign-out access, a Back to store link in the sidebar footer, and full-width page content. Desktop navigation stays visible during scrolling; below 1024px it uses the existing accessible Sheet and focus restoration.
- Use neutral white/gray surfaces, sans-serif headings, compact controls, aligned tables, and consistent page headers. Scope styling to admin content and its portaled dialogs; preserve the storefront theme.
- Add/edit forms and order details use readable white panels. Filters and table pagination remain accessible on narrow screens, with scrolling contained inside tables.
- Acceptance: authorized admin pages contain no storefront banner, shopping navigation, or footer; Back to store reaches the storefront; account sign-out remains reachable after access revocation; existing admin and checkout journeys pass.
- Validation: browser regression for shell separation and return navigation, existing responsive/access/privacy journeys, unit/component suite, lint, build, and visual inspection at desktop/mobile widths.

## Goal and agreed scope

### Implemented — reusable filter toolbar (2026-10-02)

- `AdminFilterToolbar` accepts typed `search`, `onSearch`, `searchLabel`, and `searchPlaceholder` props, plus page-specific filter children. It limits search input to 100 characters and trims the submitted value; Enter submits the form. Books retains ownership of its URL filters and resets pagination when a filter changes.
- Search input, Search button, and catalog selector use matching 40px control heights; the low-stock toggle is vertically centered. Controls wrap within the toolbar at narrow widths without page overflow.

### Implemented — catalog table polish (2026-10-02)

- The catalog filter toolbar keeps Add book primary and Search as an outlined secondary action. Each Books row includes a compact decorative `BookCover` thumbnail using the storefront cover palette; it is hidden from assistive technology because the adjacent title already identifies the book.
- Edit and Adjust stock remain direct row actions; Archive/Restore is available from an accessible per-book More actions menu. Its confirmation dialog returns focus to the menu trigger when cancelled, and opening the dialog does not restore focus to that trigger prematurely.
- Shared table pagination shows the visible item range and total for first, partial, and empty pages alongside page controls. It preserves five-item server pagination and URL filters. On narrow screens, the table scrolls within its panel.

### Implemented — forest-green sidebar (2026-10-02)

- Desktop navigation and the mobile navigation Sheet use a dark forest-green gradient. The sidebar has a brighter green brand icon, muted light section labels, and rounded green active links with a mint inset accent. The content workspace remains neutral.
- Preserve route highlighting, mobile close/navigation/Escape behavior, focus restoration, and Back to store in the sidebar footer. The sidebar's normal, active, and keyboard-focus treatments meet the checked text-contrast ratios.

### Implemented — reusable headers and paginated tables

- Extract `AdminPageHeader` (title, optional description/actions) and `AdminPageTable` (columns, rows, empty state, total and pagination) in admin components. Books, Orders, and book forms reuse the header; Books and Orders reuse the table.
- Request at most five records per page from the API. Use the same page size for offsets, page totals, Next/Previous availability, and catalog page correction after writes. Preserve URL filters and return paths; no GraphQL schema or backend changes.
- Verify five-row pages, final partial pages, navigation, filters, and existing mutation/access flows with browser and component tests.

Give store administrators an `/admin` area in the existing React application for book and inventory management and order-request viewing. The user selected delivery in phases, including order viewing. The authoritative API contract, authorization, validation limits, and migrations are in [the backend spec](../../../backend/specs/admin/SPEC.md).

## Current system and design choice

- React Router owns routes, Better Auth owns sessions, Apollo owns server data, React Hook Form and Zod own forms, and Zustand owns the persisted customer cart.
- Add an admin layout and feature folder to this application. This reuses its login, API connection, UI primitives, and deployment. A separate frontend would add deployment and session integration work; a generic admin framework would add a dependency and contract adaptation work. Neither is needed for this scope.
- Admin routes use a separate workspace shell with neutral surfaces, sans-serif typography, compact controls, a sticky header, and a full-height sidebar. The storefront keeps its cream-and-green visual language. Admins retain normal shopping access through Back to store.
- Exclude customer account management, role management UI, image uploads, analytics dashboards, bulk import/export, book deletion, order status changes, payment, shipping, and email notifications. The delivered delivery feature later adds scoped order-processing controls; see [the delivery specification](../delivery/SPEC.md).

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

- `/admin/books`: paginated catalog management using `adminBooks`, at most five rows per page. Show title, author, genre, price, stock, and active/archived state, with edit, stock adjustment, and archive/restore actions.
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

## Phase 3 — order viewing (superseded where noted)

- `/admin/orders`: paginated `adminOrders` listing, at most five rows per page, newest first using the backend's timestamp and ID ordering. The implemented [order workflow](../order-workflow/SPEC.md) adds a URL-backed status filter and status column.
- `/admin/orders/:id`: `adminOrder` detail retains captured contact/price snapshots and adds the attributed timeline and confirmed allowed processing actions defined by the order workflow.
- Label these records as **order requests**. Do not imply payment, shipment, or fulfillment. The order workflow supplies real status badges and transitions.
- Provide loading, empty, error/retry, missing-order, and pagination states. Preserve the listing page when returning from a detail view. Render customer-provided strings as text, never HTML.
- Query contact and order data only inside the authorized admin route. Never persist admin response data in local storage or the cart store.

## API integration and ownership

- Add typed operations for `viewer`, `adminBooks`, `adminBook`, `createBook`, `updateBook`, `adjustBookStock`, `setBookArchived`, `adminOrders`, and `adminOrder` to `src/operations.graphql`. The implemented order workflow extends these with status fields/filter, `setOrderStatus`, and attributed history. Regenerate `src/generated/graphql.ts` against the matching backend; do not hand-edit generated code.
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

- At desktop widths (1024px and above), show a left sidebar with Catalog → Books, Sales → Order requests, and People → Users. Keep the active section clear on nested edit/detail routes.
- Below 1024px, an Admin menu button opens the same grouped navigation in the Sidebar's modal Sheet. Expose its expanded state to assistive technology. Selecting a link, the Close admin menu button, or Escape closes it and returns focus to the menu button.
- Keep Back to store in the sidebar footer; on mobile it is reachable inside the navigation Sheet. The admin header Account menu opens `/admin/profile` and signs out, and remains available on access-denied and retry screens. Add a sidebar link only for an implemented section.
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
- [x] Admins can list and view all order requests with saved contact/price snapshots. The separate order workflow adds real status processing without invented payment or shipping state.
- [x] Forms, tables, dialogs, navigation, and error states work with a keyboard and at narrow viewport widths.
- [x] Before implementation, add focused failing component/unit tests for access states, exact price parsing, form validation, mutation failures, and cache privacy. Add Playwright journeys for guest/customer rejection, admin book/inventory/archive workflows, revoked access, and order viewing.
- [x] Playwright provisions admin membership only in its isolated test API/database fixture. It never modifies development or production permissions or data, and no test-only public promotion endpoint ships.
- [x] Run frontend `bun run test`, `bun run lint`, `bun run build`, and `bun run test:e2e`, coordinating backend checks and codegen per phase. Manually verify keyboard/focus behavior, responsive layouts, and an unavailable-book checkout error.

## Delivered decisions

The delivered design uses one application with a separate admin layout, existing login, server-reported roles, a fixed low-stock threshold of 5, and atomic stock adjustments. The separate implemented order workflow supersedes read-only order administration. Both feature specs describe delivered behavior.

## Verification evidence

Reusable header/table extraction and five-item pagination pass 16 unit/component tests, ten Chromium journeys, lint, and build. The new pagination journey checks book pages of 5/5/2 rows, search reset, order pages of 5/2 rows, disabled Next on the final page, and return from order details to the same page. The existing create-book journey checks the save confirmation before searching, since newly created books may be on a later page. The five-row desktop screenshot was inspected.

The dedicated workspace change passes 16 unit/component tests and nine Chromium browser journeys, including the new shell-separation, return-to-store, re-entry, and admin sign-out regression. Lint and build pass. Desktop/mobile navigation, books, book form, and stock-dialog screenshots were inspected; the existing production bundle advisory remains.

The forest-green sidebar change passes 16 unit/component tests, ten Chromium browser journeys, lint, and build. Desktop books and the open mobile navigation Sheet were inspected. Checked contrast ratios are 6.63:1 for muted sidebar text, 8.89:1 for normal navigation text, 8.04:1 for active navigation text, and 7.69:1 for keyboard focus treatment; the existing production bundle advisory remains.

Catalog table polish passes 16 tests across eight files, lint, build, and all ten Chromium browser journeys. Desktop and mobile screenshots were inspected, including the table's contained mobile overflow. The checks cover item ranges, keyboard menu/dialog focus behavior, archive/restore, filters, and five-item pagination.

Reusable filter toolbar and alignment changes pass 16 tests across eight files, lint, build, and all eleven Chromium browser journeys. Browser checks confirm desktop control geometry within 1px, Enter search submission, and contained controls without page overflow at 390px; desktop and mobile screenshots were inspected.

The frontend unit/component suite passes 16 tests, including access denial, supported session refresh after expiry, exact price parsing, validation limits, ambiguous/rejected inventory responses, and preservation of unsaved input during same-account background access checks. Initial access and identity transitions hide private content; completed revocation checks immediately hide the preserved form. Eight Chromium browser journeys cover responsive sidebar/menu navigation, guest/customer rejection, book forms and filters, stock changes, archive/restore, saved order lines, revoked/expired access, and existing customer checkout/history/cart behavior. Keyboard Escape returns dialog focus to its opener and closes the mobile menu with focus restored to its button. Desktop (1280px) and mobile (390px) navigation screenshots were inspected. Frontend lint and production build pass; Vite retains its existing large-chunk advisory. The e2e fixture's seeded permissions and revoke endpoint exist only in test code.
