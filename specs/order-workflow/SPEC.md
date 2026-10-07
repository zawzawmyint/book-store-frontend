# The Quiet Shelf storefront — order workflow

> **Status:** Implemented. **Date:** 2026-10-07. The paired backend schema and workflow UI are delivered.

## Goal and scope

Connect customer order requests to Staff/Admin handling and customer-visible
progress. Follow [the backend specification](../../../backend/specs/order-workflow/SPEC.md)
for transitions, permissions, privacy, atomic inventory, and migration rules.
Keep the existing storefront/workspace layouts, session boundary, generated Apollo
operations, shadcn/ui controls, and established feedback/access patterns.

Include order status badges, workspace status filtering/actions, customer detail
and timeline, cancellation reasons, and Admin Activity integration. Payment state and
full-refund feedback are delivered by [the Stripe checkout specification](../stripe-checkout/SPEC.md).
Delivery claims, notifications, customer cancellation, bulk processing, line editing,
reopening, and dashboards remain out of scope.

## Customer journey

- Checkout retains its current cart/stock/error behavior. A successful receipt shows
  Submitted and offers View order details linking to `/account/orders/:id`.
- `/account/orders` retains twenty-item pagination and snapshots; add a status badge
  and View details link per card.
- Add session-protected `/account/orders/:id` under the storefront layout. Display
  saved request number/date/items/amounts, status, and oldest-first timeline.
- Display cancellation reason with the Cancelled event. Do not expose staff
  attribution, private workspace links, or generic Admin Activity through this page.
- Include Back to your orders, loading/empty/error/retry handling. Valid missing
  or non-owned orders share Order request not found. Validate malformed IDs before
  querying. Session expiry follows existing account session refresh/cache clearing
  and returns to the intended detail URL after normal login.
- Timeline describes Completed as request handling finished, without asserting
  payment or delivery. Customers have no status-changing controls.

## Workspace journey

- `/admin/orders` retains five-item pagination; add Status column and a URL-backed
  `status` filter with All, Submitted, Accepted, Completed, and Cancelled.
  Reuse the existing filter toolbar/table. New filter resets `page`; preserve status
  across pagination, detail links, and Back to order requests. Unknown filter values
  fall back to All; correct pages that no longer exist after filtering/transitions.
- `/admin/orders/:id` displays current status and oldest-first timeline with actor
  name/recorded role/time for Staff/Admin. Preserve contact and price snapshots.
- Add client `PROCESS_ORDERS` capability mirroring the backend permission map.
  Both Staff and Admin receive it; Customers/guests cannot mount workspace content.
- Submitted offers Accept request and Cancel request. Accepted offers Complete
  request and Cancel request. Completed/Cancelled offer no processing actions.
- Each action opens an accessible confirmation dialog showing request number,
  current status, and requested result. Cancellation requires a reason labeled
  **Reason shown to customer**, trimmed to 1–500 characters, and explains that saved
  book quantities return to stock. Accept/Complete do not alter stock.
- Send `setOrderStatus` with the last fetched expectedStatus. Disable processing
  controls while pending; retain draft reason and display field/server errors.
  Do not optimistically update status, stock, timeline, or Activity.
- On success replace detail from server result and show a concise notice. Refresh
  affected order/stock views on their next query; do not refetch private Activity
  for Staff or unrelated user data.
- On CONFLICT fetch current detail and show that the request changed. Recompute
  allowed actions and require a fresh confirmation; never replay the stale action.
- On network failure explain that the outcome could not be confirmed, refresh
  detail when available, and permit a deliberate retry with the same target. If
  status already matches, show its confirmed result; backend no-op rules prevent
  repeat restoration. Do not automatically resubmit mutations.
- Retain existing role/session revalidation and private cache clearing. A revoked
  role hides controls/views; staff denial must not falsely demote an allowed role.

## Local data reset

The user approved deleting existing local data. Start from the backend's fresh
database with reseeded sample books and demo accounts. Every request has a non-null
status and a real submission event; remove legacy-request labels/branches from
workspace order screens. No historical-order filter or read-only compatibility
state is required. An empty order list after reseeding is expected.

During the explicit local reset, clear stale sessions, Apollo data, and saved cart
entries that reference the previous catalog. Ordinary sign-in/sign-out must still
preserve the cart under the existing rules. Do not add an automatic browser-storage
wipe on normal startup; the database reset is a development setup action.

## Activity and presentation

- Extend Admin Activity action labels/filter for Order status changed, field labels
  for Order status, and target rendering for orders. Link order targets to the
  existing workspace detail route. Preserve recorded target snapshots and fallback
  text for unavailable targets. Staff still has no Activity access.
- Existing book history shows cancellation stock-restoration events using current
  stock-change presentation. No new book-history permission or tab system.
- Use text labels as well as status colors, keyboard-accessible actions/dialogs,
  focus restoration, accessible pending/error announcements, and safe plain-text
  reason rendering. Support Light/Dark appearance and narrow screens.
- Render timestamps with the existing local-time conventions; timeline dates
  should show time, with chronological order derived from backend event IDs.

## Components and integration

Implemented files include `src/app/App.tsx`,
`src/features/account/pages/OrdersPage.tsx`,
`src/features/checkout/components/OrderReceiptView.tsx`,
`src/features/admin/pages/OrdersPage.tsx`, `src/features/admin/pages/OrderPage.tsx`,
`src/features/admin/admin-access.ts`, and Activity presentation/filter consumers.
The customer detail component is `src/features/account/pages/OrderPage.tsx`.
Keep feature-specific dialogs/timeline rendering in their feature; share a status
label/presentation helper only where customer/workspace views actually reuse it.

Extend existing operations in `src/operations.graphql` with list/receipt statuses,
MyOrder, workspace history, SetOrderStatus, and status filter variables. Generate
`src/generated/graphql.ts` against the updated backend using `bun run codegen`.
Request customer-safe history through MyOrder and attributed history through
AdminOrder; list requests omit history. Backend status is authoritative.
No new frontend dependency, credential handling, or browser storage is required.

## Acceptance criteria and validation

- [x] Customer placement shows Submitted and opens an owner-scoped detail page.
- [x] Staff accepts/completes/cancels allowed requests; customer progress updates
      when detail is refreshed or revisited. Real-time push/polling is out of scope.
- [x] Admin can perform the same actions and inspect their Activity records.
- [x] Cancel reason is visible to the owner; stock restores once and history persists.
- [x] Status filtering, counts, pagination, and return navigation remain consistent.
- [x] Freshly reseeded accounts see empty order lists and can place new workflow
      requests; no legacy labels, filters, or null-status branches remain.
- [x] Invalid transitions, conflict, uncertain network outcomes, and role/session
      loss do not show a false success or automatically replay an action.
- [x] Cross-account and direct URL access do not expose private orders or history.
- [x] Keyboard/dialog focus, mobile layout, Light/Dark, loading, empty, and retry
      states remain usable; no unsanitized HTML rendering of cancellation reasons.

Focused component tests cover controls, validation, conflicts, refetch handling,
safe customer history, filters, and session/role boundaries. The isolated Playwright
suite covers all three roles, Submitted→Accepted→Completed,
Submitted/Accepted→Cancelled, repeated cancellation, saved-price preservation,
archived-book restoration, fresh-data setup, direct access denial, session loss,
mobile, keyboard focus, and Light/Dark appearance. It never writes development data.

## Delivery and verification

The explicit local development reset produced twelve sample books, the three demo
accounts, and no old orders. Ordinary startup and sign-out do not clear browser
storage. Backend and frontend code generation, backend tests (102), frontend tests
(89), lint, and production builds passed. The full isolated Playwright suite passed
32 journeys, followed by two focused workflow visual/spacing checks. Existing-data
preservation remains out of scope; use the backend migration procedure for any
environment that needs the fresh-data guard explained in the paired specification.
