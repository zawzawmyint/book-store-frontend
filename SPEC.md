# The Quiet Shelf storefront specification

> **Proposed localization:** [Storefront and admin localization](specs/localization/SPEC.md) delivers English, Arabic, Thai, and Simplified Chinese interface translation, locale-aware USD/date formatting, browser-local language selection, and Arabic RTL using i18next/react-i18next. The implementation is delivered, while final acceptance remains pending actual 200% zoom, broad visual/native-language review, and a coordinated PostgreSQL browser run. See the [implementation plan](docs/superpowers/plans/2026-10-19-localization.md).

> **Implemented book cover uploads:** [Book covers](specs/book-cover-uploads/SPEC.md) documents the staff cover editor, real-image presentation, guest lookup, and existing-cover fallback.

> **Proposed UI improvement:** [Bag and checkout UI](specs/bag-checkout-ui/SPEC.md) documents the delivered bag and checkout presentation changes: clearer line prices, responsive delivery/review layouts, synchronized summaries, touch controls, and compact legacy-bag recovery. Unit, lint, build, SQLite, and PostgreSQL verification completed; the feature remains **Proposed** because actual 200% browser-zoom validation could not be performed.

> **Implemented logout destination:** Successful explicit logout from the storefront or Staff/Admin workspace goes to `/sign-in` with history replacement, hides the account bag, and clears private cached data. Failed logout retains its existing recovery behavior. No authentication API changes were needed. Focused logout coverage passed **2/2** tests; the final frontend suite passed **194** tests in **39** files, lint and build, and all **58** SQLite Chromium journeys in **4.9 minutes**, including exact storefront and workspace `/sign-in` assertions.

> **Implemented account carts:** [Account carts](specs/account-carts/SPEC.md) uses a versioned local guest bag and server-saved carts for verified accounts, with ownership isolation, revision-aware checkout, and verified SQLite/PostgreSQL browser coverage.

> **Implemented auth email:** [Verification and recovery](specs/auth-email/SPEC.md) defines the verification and password-recovery customer journey, plus read-only verification-status visibility in the Admin user directory.

> **Implemented engineering work:** [Storefront readability and consistency](specs/storefront-readability/SPEC.md) documents catalog and checkout readability refactoring with unchanged customer behavior.

> **Implemented storefront homepage:** [Storefront homepage and dedicated catalog](specs/storefront-homepage/SPEC.md) provides curated discovery at `/` and moves full catalog browsing to `/books`.

> **Implemented catalog upgrade:** [Catalog filtering, sorting, and continuity](specs/catalog-upgrade/SPEC.md) adds exact genre, stock, price, and sorting controls with return-context restoration.

> **Implemented book details upgrade:** [Book details](specs/book-details-upgrade/SPEC.md) adds responsive purchase details, confirmed multi-copy bag additions, and bounded related-book discovery.

> **Implemented engineering work:** [Frontend readability and consistency](specs/readability-consistency/SPEC.md) documents admin pagination, navigation, and search-hook refactoring with unchanged UI and API behavior.

> **Implemented delivery:** [Delivery](specs/delivery/SPEC.md) is the current checkout and fulfillment contract.

> The [implemented Stripe checkout specification](specs/stripe-checkout/SPEC.md) covers
> hosted test payment, payment-aware order processing, expiry, and refund feedback.

> This document describes implemented behavior. See [the authentication feature spec](specs/authentication/SPEC.md) for the detailed account contract and [the demo-login feature spec](specs/demo-login/SPEC.md) for optional local demo controls.

> The implemented Staff permission model is defined in [the staff roles specification](specs/staff/SPEC.md), with user-directory compatibility details in [the user directory specification](specs/users/SPEC.md). Customer-named admin URLs remain redirects for existing bookmarks.

> The implemented [dashboard specification](specs/dashboard/SPEC.md) defines the `/admin` workspace home, including Staff operations and Admin-only payment reporting.

> **Implemented workspace search:** [Workspace search](specs/workspace-search/SPEC.md) adds the Staff/Admin Books and Orders dialog without changing storefront search, with verified SQLite/PostgreSQL browser coverage, code generation, lint, and build.

> **Implemented shared loading UI:** [Shared book loading indicator](specs/loading-ui/SPEC.md) supplies contextual, motion-aware loading status across storefront and workspace states without changing request or session behavior.

## Purpose and current scope

### Delivered pending acceptance: storefront and workspace localization

The storefront and Staff/Admin workspace bundle `i18next` 26.5.2 and
`react-i18next` 17.1.0 with `common`, `storefront`, and `admin` JSON namespaces
for `en`, `ar`, `th`, and `zh-Hans`. `src/lib/i18n` initializes before React,
validates the browser-local `book-store-language` preference, falls back to English,
updates document language/direction/title, and keeps blocked storage usable in memory.
The headers expose a 44px icon-only language control with a translated accessible
name and self-identifying native-language dropdown options; the same control is also
available within shared dialog/sheet content.

Changing language updates application-owned copy, validation/errors, navigation,
activity/status labels, charts, and display formatting without changing routes,
queries, canonical API values, persisted cart/checkout records, authorization, or
transaction identity. Dates use browser-local time and the Gregorian calendar; money
remains USD; dashboard totals retain exact cents. Arabic sets RTL direction, uses
logical layout and correctly directed portals, moves workspace navigation to the
right, and preserves mixed-script content direction. Persisted catalog and customer
content, backend emails, and hosted Stripe Checkout remain outside this frontend
scope.

Automated evidence includes 314 frontend tests in 58 files, clean lint, a production
build (with the existing Vite chunk-size warning), and all 79 SQLite Chromium
journeys passing in 7.9 minutes. The sibling backend's PostgreSQL browser command
currently times out during its pre-browser compiled SQLite readiness smoke, so it has
not supplied PostgreSQL parity evidence.
Actual 200% browser zoom, comprehensive visual review, and native semantic review are
also outstanding; therefore the linked feature specification remains Proposed.

### Implemented: collapsible workspace sidebar

Desktop workspace navigation starts expanded and can collapse through its labeled
header toggle to a 64px icon rail. Collapsed links retain accessible names and active
state, with tooltips shown only on collapsed desktop. The seven-day sidebar preference
cookie is restored on reload; missing, invalid, or blocked storage falls back to the
expanded state. The mobile workspace remains a full labeled Sheet independent of the
desktop preference, closes after navigation or Escape, and restores focus. Opening
workspace search preserves sidebar state.

Ctrl+B on Windows/Linux and Cmd+B on macOS toggle the desktop sidebar. The shortcut
ignores editable fields, open modals, repeats, and modified key combinations. No route,
API, GraphQL, code-generation, dependency, or backend change was made.

The sidebar browser journey verifies persisted/invalid-cookie state, collapsed
navigation and desktop tooltips, workspace-search state, mobile behavior, and keyboard
guards. The existing mobile Escape/focus regression also passed. The blocked-cookie
fallback is covered by the implementation guard but has no dedicated browser audit.
Verification completed with 136 frontend tests across 33 files, lint, build, and the
full 44-journey isolated SQLite browser suite. A live Admin dark collapsed-dashboard
screenshot was inspected. The existing main-bundle warning is 932.90 kB and the lazy
dashboard chunk is 385.87 kB. The earlier 43-journey PostgreSQL workspace-search run
is historical evidence and was not rerun for this frontend-only task.

The implemented [order workflow](specs/order-workflow/SPEC.md) adds customer
status details and Staff/Admin processing while preserving order-request wording.

The implemented [icons and typography specification](specs/icons-typography/SPEC.md) defines compact, accessible icon actions and self-hosted Lora/Source Sans 3 fonts across the storefront and workspace.

The implemented [appearance specification](specs/appearance/SPEC.md) defines the shared Light/Dark switch for the storefront and workspace. Dark is the default; the browser-level choice is stored independently of accounts and applies before React renders.

The implemented [activity history specification](specs/activity/SPEC.md) defines an Admin-only Activity page and book history. It requires the coordinated backend migration and deployment.

The implemented [dashboard specification](specs/dashboard/SPEC.md) defines the
read-only operations overview and Admin-only 7/30/90-day recorded-payment reporting.
It presents compact summary cards, then the dashboard graphics, then stock/refund
and action alerts, with Recent orders last.
Operational and inventory cards use icons with explicit text status cues so urgency
does not depend on color alone.
The workspace uses quieter borders and unoutlined cards while retaining distinct form,
focus, and status treatments.

Provide a browser storefront for finding books, maintaining a cart, and beginning an
authenticated Stripe hosted Checkout payment through the separate GraphQL API. Checkout
collects a delivery address, requires a reviewed server quote, and displays delivery status.

### Implemented: storefront homepage and dedicated catalog

The curated homepage is defined by [the storefront homepage specification](specs/storefront-homepage/SPEC.md).
Its featured banner is unframed, with static Light/Dark sage and amber washes that fade
into the page background; mobile places the washes below the copy, behind the featured book.
Storefront discovery surfaces use softer decorative borders and unoutlined rounded cards
while preserving control, focus, and status treatments.
The implemented [catalog-upgrade specification](specs/catalog-upgrade/SPEC.md) defines
the `/books` filter, sorting, URL, return-context, and responsive-card contract. It
uses an additive backend GraphQL contract and changes no database schema, persistence,
payment, or authentication behavior.

## Routes and behavior

- `/` is a curated homepage. It has a short editorial hero with one available API-backed featured book, illustrated API-genre tiles, up to four configured selected books, available reading-mood cards, an optional matching editorial recommendation, an available selected author, a short store note, and the shared footer. It does not mount the full catalog toolbar or pagination.
- `/books` is the full catalog. It requests 12 books per page with URL-backed text search, exact genre, stock, inclusive price-cents, and server sorting controls. At desktop widths, its sticky sidebar contains the catalog heading, range, search, sorting, filters, active-filter controls, and clear action; the adjacent column starts directly with books. Mobile uses a draft-and-apply **Filter & sort** drawer, including sorting. The backend filters, counts, and sorts before pagination; the frontend does not filter returned books itself. See the catalog-upgrade specification for normalization, price-draft, and scroll-return details.
- The shared header uses the logo as Home, visible desktop **All books**, and icon controls for search, account/sign-in, bag, and desktop appearance. It sticks at the viewport top while the promotion strip scrolls normally, except on `/books` (including query and trailing-slash URLs), where it scrolls in normal flow. The catalog therefore uses a zero effective header height: its desktop sidebar and in-page anchors use a 24px viewport offset. Other storefront routes, including book details, retain the measured sticky-header behavior after route changes. At mobile widths its dialog menu contains Home, All books, and appearance while search, account/sign-in, bag, and the menu remain directly accessible above the header. **Search the store** is initially closed in an autofocus dialog; Escape, close, and submit restore focus to its trigger. Its trimmed text opens `/books?search=…`, and empty input opens `/books`; repeated submissions work after navigation. Catalog-local **Search books** keeps its existing draft and browser-history behavior. Homepage genre and mood links use the exact `genre` parameter; author discovery and header search use text search and start at the first page.
- Root URLs containing `search` or `page`, including empty values, replace history to `/books` while retaining the full query and any hash other than `#collection`. `/#collection` replaces history to `/books`; a root catalog URL with that hash removes it. Other root parameters and hashes remain on the homepage.
- Homepage editorial selections are frontend configuration, currently IDs `1`, `2`, `4`, and `8`. One bounded `StorefrontHome` GraphQL query resolves those aliases and API genres. Missing selections are omitted, sold-out selections remain honestly disabled, and a recommendation is hidden when its configured book or editorial note is unavailable. This changes no backend schema, persistence, authentication, inventory, or payment contract.
- `/books/:id` shows a responsive cover and purchase summary with linked genre/author discovery, unit price, availability, and a Quantity select bounded by stock, the ten-copy per-book limit, and current bag quantity. A successful guest or verified-account addition writes its full selected increment once and confirms it only after the visible bag accepts it. **About this book** preserves description line breaks with an unavailable-description fallback. A bounded same-genre query renders up to four deduplicated related cards without blocking the main book; the shared related-books rail aligns its first card with page content, previews the next card at the viewport edge, accepts native scrolling, pages by its visible width, and uses motion-aware six-second autoplay. Related detail links retain validated catalog-return context. PUSH detail navigation scrolls to the top, while POP/catalog restoration remains intact. No backend schema, migration, or dependency changed.
- `/cart` shows cart lines, quantity controls, removal, and a client-side estimated total. Zustand manages the visible bag: guests use the versioned `book-store-cart` envelope, while verified accounts load and save their server-owned bag. Prior raw arrays are readable only as unowned legacy imports. Count and estimated total are derived from visible items. Invalid guest entries are filtered out, and unavailable browser storage leaves guest interactions usable in memory. Shared bag feedback keeps routine loading/saved/up-to-date status screen-reader-only while visible feedback is reserved for progress, recovery, actionable failures, warnings, decisions, and adjustments.
- `/sign-up` and `/sign-in` create or access a Better Auth account. Authentication is required for `/checkout`, `/account/orders`, `/account/orders/:id`, and `/account/profile`; a guarded route sends guests to sign-in with an internal return path.
- When Vite is in development, `VITE_DEMO_LOGIN=true`, and the browser uses a loopback host, `/sign-in` also offers the three local demo accounts seeded by the backend. Their normal Better Auth sign-in destinations are `/` for Customer and `/admin` for Staff or Admin; production, non-loopback, sign-up, and signed-in states show no demo controls.
- `/checkout` validates a delivery address, obtains a server quote, and sends book IDs,
  quantities, a generated request key, the normalized address, reviewed expected
  fee/total, and an account bag's accepted optional revision through `createCheckout`.
  It redirects only to the returned Stripe hosted test URL. The server rejects a stale
  account bag before reservation and, after confirmed payment, removes only unchanged
  submitted lines once; the browser refreshes the visible bag. Unavailable or failed
  attempts retain it. `/checkout/return/:orderId` refreshes backend payment state and
  offers bounded confirmation polling/resume where allowed.
- `/account/orders` lists only the signed-in customer's order requests with pagination, status badges, and detail links. `/account/orders/:id` shows that owner's saved request and safe oldest-first status timeline; a missing or non-owned request has the same not-found state.
- `/account/profile` shows the signed-in email and join date as read-only text. The same person can save their display name and change their password. The storefront Account menu links to Profile before Orders. See [the account profile spec](specs/profile/SPEC.md).
- The storefront header and workspace headers, including workspace access screens, expose an icon-only, keyboard-accessible Light/Dark switch. Its sun/moon icon shows the current mode; its Dark mode switch semantics and tooltip state describe the next action. It uses the `book-store-theme` browser-storage key, accepts only `light` and `dark`, and falls back to Dark when the key is missing, invalid, removed, or unavailable. Preferences synchronize across tabs; device appearance is not used.
- A session boundary treats only a session with `emailVerified: true` as usable, unmounts routed content during revalidation, hides the previous account bag, and clears Apollo data before rendering after any usable verified-user identity change, including sign-out or loss of verification. A successful explicit storefront or workspace sign-out replaces history with `/sign-in`; it retains the server bag and exposes the separate guest bag.
- Unknown routes show a not-found page.

## Admin routes

- `/admin` opens the implemented [Dashboard](specs/dashboard/SPEC.md) for Staff and Admin; guests redirect to sign-in with an internal return path, and Customers see access denied. The Account menu exposes Admin for Admin and Staff workspace for Staff after server authorization.
- Admin routes render outside the storefront shell, with neutral surfaces, compact tables/forms, and sans-serif headings. At desktop widths (1024px and above), the full-height dark forest-green grouped sidebar starts expanded and can become a 64px icon rail through its header toggle. The compact rail retains accessible link names, active treatment, and collapsed-only tooltips. Smaller screens use the full labeled navigation in an accessible Admin menu Sheet. The menu closes after navigation or Escape and restores focus, and nested routes retain active navigation. Back to store is in the sidebar footer. A compact sticky header provides the sidebar toggle, workspace search, account/sign-out access; after successful workspace sign-out it replaces the document location with `/sign-in` to discard stale SPA session state. Access-denied and retry screens retain an account menu.
- `/admin/books`, `/admin/books/new`, and `/admin/books/:id/edit` support catalog search/filter/pagination, creation, metadata editing, optional staged cover changes, and atomic stock adjustments for Staff and Admin. The unified book form saves details first and then its staged cover upload/removal; a partial cover failure retains the saved book ID and form draft for explicit retry without duplicate creation or opening-stock changes. Only Admin sees or can use archive/restore confirmations. `AdminFilterToolbar` trims submitted searches, accepts page-specific filters, and leaves Books responsible for URL filters and pagination reset. `BookRowActions` owns row links, role-specific History and More-actions controls, and archive-menu focus handling; `ArchiveBookDialog` owns archive confirmation, busy/error feedback, refresh, and focus return. `StockDialog` remains the stock interaction boundary. Catalog rows use compact storefront-palette thumbnails; Edit and Adjust stock stay direct actions, while Archive/Restore is in a per-row More actions menu for Admin.
- Admin list pages share `AdminPageTable` for table structure, empty states, visible item ranges, totals, and pagination, with a shared page size of five used for API limits, offsets, and page counts. `AdminPageHeader` provides reusable titles, descriptions, and actions on list and book-form pages.
- `/admin/orders` and `/admin/orders/:id` show saved orders, captured contact/price
  snapshots, and payment state to Staff and Admin. The list has URL-backed status
  filtering and five-item pagination. Paid orders can move from Submitted to Preparing,
  Shipped, and Delivered; cancellation is available only before shipment, restores stock
  once, and queues a full fee-inclusive refund. Workspace detail shows attributed status
  history; owner detail does not.
- `/admin/users` is Admin-only and lists registered accounts in pages of five, with search, an All/Customers/Staff/Admin filter, copyable user IDs, and confirmed role changes. Each row opens `/admin/users/:id`. See [the staff roles specification](specs/staff/SPEC.md).
- `/admin/users/:id` is Admin-only, shows one account, and lets an admin set another person's password. The signed-in admin's own page links to `/admin/profile`. `/admin/customers` and `/admin/customers/:id` replace browser history while redirecting to the equivalent user route, preserving the ID, query string, and hash. A recognized internal legacy list return location is normalized to `/admin/users`; other return state is not used.
- `/admin/activity` is Admin-only and lists recorded catalog, account, and order-status changes newest first. It has URL-backed actor, action, local-date, and price-change filters, with five-item pagination. `/admin/books/:id/history` is Admin-only and presents that book's retained history, including cancellation stock-restoration events and archived or deleted-target snapshots. Only Admin sees Activity navigation and book-row History links; denied direct routes do not mount activity queries. History begins after the migrated backend is running and never backfills earlier changes.
- `/admin/profile` shows the signed-in Staff or Admin user's email and join date, and lets that person update their own name and password. The workspace Account menu opens it before Sign out. See [the account profile spec](specs/profile/SPEC.md).
- Admin queries use no-cache responses; session changes clear Apollo data, and detected role loss or Admin-to-Staff transition hides private user-management views. Route entry and focus revalidate server access. A denied Admin-only action refreshes the viewer while retaining Staff workspace access when still permitted. Expired sessions refresh Better Auth state before redirecting to login.
- Inventory mutation network failures are not automatically retried. Archived cart items fail checkout visibly while preserving the cart. See [the admin feature spec](specs/admin/SPEC.md) for all routes and acceptance criteria.

## GraphQL integration

- `src/operations.graphql` defines bounded homepage selections, catalog, checkout creation/resume/refresh, receipt,
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
- Playwright Chromium tests cover account creation, checkout access, owner-safe order history/detail, Customer→Staff→Admin workflow completion/cancellation, archived-stock restoration, direct API rejection, session/role loss, mobile/keyboard behavior, appearance, and Activity permissions/history. Run `bun run test:e2e:install` once, then `bun run test:e2e` with both repositories installed. The default suite starts an in-memory SQLite API on 4100 and frontend on 4173, keeping persisted databases untouched. Run `bun run test:postgres:browser` from the backend for the same suite against an isolated disposable PostgreSQL database.
- Homepage and catalog loading, empty and error states, search, pagination, book detail, cart updates, and order-request success and failure remain usable.

## Implemented: stable dashboard navigation during refresh

On `/admin`, background focus refreshes keep existing links and controls fixed so
the first click reaches its intended target. Refresh progress is announced by an
sr-only status and represented by a motion-safe spinner in the reserved inline
update area; initial loading and error feedback are unchanged.

The regression holds a workspace-dashboard response after focus, clicks the
original position of the first status link once, and reaches
`/admin/orders?status=SUBMITTED`. It failed before the fix because the visible
refresh paragraph shifted that link by 32px, then passed in the 39-journey isolated
SQLite browser suite. Frontend tests (132 across 32 files), lint, and build also
passed; the pre-existing 922 kB main-bundle warning remains. No API, schema, route,
or backend change was made. The earlier 38-journey PostgreSQL browser result remains
historical dashboard-delivery evidence and was not rerun for this frontend-only fix.
