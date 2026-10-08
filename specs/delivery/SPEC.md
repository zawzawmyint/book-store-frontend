# The Quiet Shelf storefront — delivery

> **Status:** Implemented. **Date:** 2026-10-08.

## Goal and scope

Let a signed-in customer order books for delivery only, review a saved destination
and complete amount before Stripe test payment, and follow preparation, shipment
and delivery. Staff confirms shipment and actual delivery in the existing workspace.
Follow [the backend specification](../../../backend/specs/delivery/SPEC.md) for
the authoritative contract, configuration, validation, pricing and transition rules.

The [implemented database-support specification](../../../backend/specs/database-support/SPEC.md)
provides SQLite development/test and PostgreSQL production support. The storefront
uses the same GraphQL contract, generated types and build for both; do not introduce
database-specific UI or client configuration. Verify delivery journeys against both
backend providers using the existing isolated test runners.

Include address entry, a flat delivery fee, reviewed server quote, immutable order
details, optional carrier/tracking display, order history, order filters and
permission-aware staff actions. Exclude pickup, live payments, address books,
courier integration, automated tracking updates, email/SMS notifications, returns,
post-shipment cancellation and tracking/address edits after submission.

Remain on existing routes and reuse layouts, form controls, dialogs, feedback and
account/session boundaries. No new UI library or separate fulfillment application.

**Agreed model:** one order/fulfillment status — SUBMITTED, PREPARING, SHIPPED,
DELIVERED or CANCELLED — plus separate payment status. Remove Accepted/Completed
and do not introduce a second delivery-status badge/filter/history.
The user approves fresh local development data: old orders, accounts and sessions
will not carry forward. Reset/reseed occurs during implementation, not spec drafting.

## Checkout journey

**Cart → Delivery address → Review total → Stripe payment → Preparing → Shipped → Delivered**.

- `/cart` keeps its compatible storage format and estimated book subtotal.
  Label it **Books subtotal** and explain that delivery is added at checkout.
  Do not add a flat fee per book or claim that cart prices are authoritative.
- `/checkout` remains session-protected. Show account email/contact information
  and an address form: recipient name, phone, address line 1, optional line 2,
  city, optional region/postal code, and country.
- Load authenticated `deliveryOptions` for supported country choices and the
  configured USD fee. Display country names with their codes as values; only
  configured whole countries are supported in the initial slice. Do not infer
  coverage or fee from browser location or hardcode a default country.
- The local demo configuration uses a **$5 USD flat fee per order**, not per
  book. Display the backend value rather than hardcoding $5 in components. For
  example, review shows $20 Books subtotal + $5 Delivery = $25 Total. The fee is
  adjustable configuration and is not a quote from a courier.
- Use React Hook Form/Zod with backend-equivalent trimmed lengths, country casing,
  phone character/digit limits, optional-field normalization and control-character
  rejection. Prefill recipient name from the account; allow a different recipient.
  Do not imply the address or phone has been independently verified.
- **Review order** calls `quoteCheckout` with current lines and normalized address.
  Display the reviewed address, Books subtotal, Delivery, and Total in USD; show
  **Free delivery** when the server fee is zero. Provide Edit address/cart actions.
  A review is not a reservation or delivery-date guarantee.
- **Continue to payment** is available only after a successful quote for the
  current lines/address. Changing either invalidates the reviewed quote and
  requires review again. Ignore late responses for superseded input snapshots.
- Submit normalized address, saved reviewed fee/total, line IDs/quantities and
  requestKey through `createCheckout`. Never submit a price to be trusted by the
  server, user identity, a paid flag or a client-selected currency/redirect URL.
- A price/fee `CONFLICT` means show updated pricing via a new quote and require
  explicit review/submission; do not automatically redirect to payment at a new
  amount. Stock/input errors show actionable messages and preserve cart/form state.
- Display the existing test-payment explanation. Validate the returned Stripe
  HTTPS origin as today. Null URL displays the returned order state.
- Disable duplicate Review/Continue submissions while their operation is pending.
  Delivery/payment unavailable blocks new attempts with a visible retry/error state.
  Never fall back to `placeOrder` or skip the destination/fee review.

## Retry, storage and payment return

- Extend `src/features/checkout/checkout-attempt.ts` with a versioned payload
  including normalized address and reviewed expected fee/total. Same user,
  same normalized lines/address/amounts reuse the original UUID. Differences
  require a deliberate new attempt; disable inputs while submission is running.
- Preserve an uncertain attempted payload/key across refresh and network failure.
  Show **Retry payment setup** for that exact attempt; do not replace it with a
  newly quoted fee or edited address. Let the customer inspect Orders before
  deliberately beginning another attempt, since the earlier one may exist.
- Persist the bounded validated attempt in user-scoped sessionStorage only,
  retaining the existing `book-store-checkout:<userId>` namespace. The delivery
  address is private data: do not add it to cart localStorage, URLs, analytics,
  console output or a global address draft. Fall back to memory if storage fails.
- At the coordinated fresh-data cutover, clear old checkout attempts and the
  persisted cart once. Old book/order IDs can be reused by reseeding, so retaining
  them could submit different books or resume unrelated orders. Use a versioned
  browser-data marker so this cleanup does not repeat on ordinary reloads.
  Discard unversioned pre-delivery attempts without resuming their deleted orders.
  Preserve the existing cart key/raw-array format for newly created carts.
  Clear stale auth/Apollo state and sign in again to the reseeded accounts.
- Clear private attempt/address memory and storage on explicit sign-out/account
  switch. Session expiry during a retry may require re-entry and Orders recovery;
  do not expose one account's payload to another. Keep normal cart compatibility.
- Preserve the existing confirmed-paid matching-cart clearing rule: compare the
  submitted lines and matching user/order ID, rather than the current address form.
  Retire matching terminal unpaid attempts as today. Remove their address payload
  when retired/paid; never clear a changed cart or one without a matching snapshot.
- `/checkout/return/:orderId` keeps backend-confirmed payment state, bounded polling,
  explicit refresh/resume and owner checks. Show saved subtotal/fee/total and
  destination after confirmed payment; opening a success URL is not payment proof.
- Every new order has saved delivery details. Resume always uses the same order
  and original address/amount; old order bookmarks may show not found after reset.

## Customer order views

- `/account/orders` shows payment and the single order status with
  saved final total. Keep existing pagination and ownership boundaries; do not
  request every order's address or history for a list badge.
- `/account/orders/:id` shows recipient/address/phone, subtotal, delivery charge,
  final total, shipment details/timestamps and the existing safe order history.
  Render all input as text. Keep existing payment/refund state and actions.
- Order labels: SUBMITTED + Pending payment means **Awaiting payment**;
  SUBMITTED + Paid means **Awaiting acceptance**; PREPARING means **Preparing**;
  SHIPPED means **Shipped**, DELIVERED means **Delivered**, CANCELLED means
  **Cancelled**. Payment/refund state stays visible separately; awaiting-payment
  wording is derived, not a third stored status.
- DELIVERED means staff confirmed delivery. Never infer delivery
  from payment, tracking-link clicks, dates or elapsed time.
- Carrier/tracking details are optional; missing details say **Tracking details
  not provided** when shipped. A valid tracking URL opens with `noopener noreferrer`;
  display the carrier and number as text, validate HTTPS before rendering a link,
  and label it **Track with carrier**. It is an external carrier page, not live
  tracking in our app. Reject dangerous URLs rather than rendering them.
- Customer history contains statuses and timestamps only, with no staff IDs,
  names or roles. Preserve not-found equivalence for missing/non-owned orders.
- Delivery details are required for every order in the fresh dataset. No historical
  null-delivery or Legacy unpaid UI is needed. Do not relabel historical orders.
- Do not offer customer cancellation, address edits or tracking edits.

## Staff/Admin journey

- `/admin/orders` retains its existing status filter and five-item pagination.
  Replace filter values with ALL/SUBMITTED/PREPARING/SHIPPED/DELIVERED/CANCELLED.
  Reset pagination when it changes and send the existing `status` argument.
  No second deliveryStatus filter. Normalize old Accepted/Completed URL filters
  to ALL. Reuse the
  current filter toolbar and page table. Lists need status, not full address/history.
- `/admin/orders/:id` shows saved destination/phone, subtotal/fee/total, the single
  order status and attributed order history alongside payment details.
  Restrict access using existing VIEW_ORDERS; actions require PROCESS_ORDERS.
- **Accept and prepare** changes Paid SUBMITTED to PREPARING. Replace old Complete
  controls with **Mark shipped**, then **Confirm delivery**; no Accepted/Completed labels.
- Mark shipped is enabled only for Paid + PREPARING with no cancellation intent. The safe `payment.cancellationPending` boolean disables processing actions while cancellation is queued.
  Its confirmation dialog optionally collects carrier/tracking as one shipment
  object; when provided carrier is required and a URL requires a tracking number.
  Explain that the books have left the store and cancellation will be unavailable.
  Require explicit confirmation and validation before sending the mutation.
- Confirm delivery is enabled only for Paid + SHIPPED.
  Explain that staff must have actual delivery confirmation and that this action
  marks the order Delivered. Show Delivered only after server success.
- Use the existing `setOrderStatus` mutation with expectedStatus and target status;
  include shipment only for SHIPPED and cancellationReason only for CANCELLED. Disable
  actions while pending. After stale/uncertain errors, refresh state before offering
  an explicit retry. Never optimistically mark shipped, delivered or refunded.
- Hide cancellation for Shipped/Delivered. Before shipment, keep the existing
  required reason and refund confirmation, explicitly including the delivery fee.
  Payment cancellation uncertainty retains the existing refresh/recovery behavior.
- Backend rejection remains authoritative if role, payment or order status changes.
- Reuse Admin Activity ORDER_STATUS_CHANGED/ORDER_STATUS rendering with new order
  state labels, preserving Admin-only access and private-data exclusion. Do not
  add a separate delivery event/filter family.

## API integration and affected files

Select the safe `payment.cancellationPending` Boolean and disable preparation
and shipment while it is true. The backend derives it from the saved cancellation
intent and remains authoritative when state changes after a page is loaded.

Use the backend's exact field names and enum values. Add DeliveryOptions,
QuoteCheckout operations to `src/operations.graphql`; update the existing
SetOrderStatus input/operation and OrderStatus/OrderStatusFilter values. Extend
CreateCheckout input, money fields, delivery details and existing history selections;
remove Legacy unpaid value handling. Update list status
selections. Regenerate `src/generated/graphql.ts` against the changed API.

Affected existing units include `src/features/checkout/pages/CheckoutPage.tsx`,
`CheckoutReturnPage.tsx`, `src/features/checkout/checkout-attempt.ts`, checkout
receipt components, customer order pages under `src/features/account/pages/`,
workspace order pages/dialogs under `src/features/admin/`, Activity labels,
shared order UI under `src/features/orders/`, and cart subtotal wording.
New address validation/forms or delivery status components belong in their
owning feature; share them only where there is actual customer/workspace reuse.

Do not hand-edit generated types. Delivery implementation synchronized
root SPEC.md, README, AGENTS checkout wording and related workflow/Stripe/auth/
Activity specs after acceptance checks passed. Historical specs retain their former
terminology only as explicit historical context.

## Acceptance criteria

- [x] Address form is accessible and validates exactly the supported backend inputs.
- [x] Only configured countries/fee are shown; zero fee and disabled delivery are clear.
- [x] Customers review address, subtotal, delivery fee and final total before payment.
- [x] Edits and stale quote responses cannot submit an unreviewed destination/amount.
- [x] Changed pricing requires explicit renewed review; failures preserve cart and input.
- [x] Exact retries preserve request keys; address/amount changes cannot reuse them.
- [x] Fresh-data cutover clears stale carts/attempts/cache once; ordinary reload preserves new data.
- [x] Storage failure, sign-out and account switching remain safe.
- [x] Paid return displays saved totals/address and clears only the matching cart.
- [x] Customer detail/history hides other accounts and staff attribution.
- [x] Single order status/actions/filter follow server permissions and allowed transitions.
- [x] Delivery confirmation sets Delivered; no Completed or separate delivery status remains.
- [x] Shipped orders cannot cancel; pre-shipment cancellation explains a full fee-inclusive refund.
- [x] Tracking is optional, rendered safely and described as manually entered.
- [x] Unit/component tests, lint/build and coordinated Playwright journeys pass.
- [x] The same delivery browser journeys pass with SQLite and disposable PostgreSQL, without provider-specific frontend behavior.

## Validation and rollout

Extend checkout/attempt/return/account/workspace component tests for address,
quote drift, retries, zero fee, browser-data cutover, state actions and privacy.
Extend `e2e/server.ts` and payment provider fixtures for explicit test-only delivery
configuration and fee-inclusive charge/refund assertions; preserve in-memory isolation.
Retain SQLite in-memory isolation for default browser runs and the existing
UUID-owned loopback database guard for PostgreSQL runs. Do not replace these with
the developer's configured database URL or run the delivery reset from the harness.
Use an explicit 500-cent demo fee and explicitly selected test countries in fixtures;
also test zero fee and a changed fee to catch hardcoded pricing.
Extend `e2e/checkout.spec.ts` and `e2e/order-workflow.spec.ts` to cover address →
payment → accept → ship → deliver and the separate pre-shipment cancellation path.
Cover shipped-cancel rejection, invalid/old enum inputs, role loss and cross-account reads.

Manually verify mobile forms, field errors/focus, keyboard confirmation dialogs,
review/edit flow and text-safe tracking display. Run `bun run test`, `bun run lint`,
`bun run build` and `bun run test:e2e`; also run backend
`bun run test:postgres` and `bun run test:postgres:browser` with both repositories
installed; the latter runs the same browser journeys against real disposable
PostgreSQL. All listed checks passed for this delivery change.

Deploy alongside the new backend: the order enum replacement, removal of legacy
unpaid handling, required checkout fields and final-total meaning are coordinated
breaking changes. Use the authorized fresh local database/reseed and one-time
browser cleanup; old data/session/attempt preservation is out of scope. Clear/refresh
old client bundles before enabling checkout. Coverage is still a store decision;
the agreed local US demo fee is $5 with no implicit runtime default. Courier
updates, notifications and returns remain later features.

## Verification record — 2026-10-08

- All 125 frontend tests, lint and production build passed.
- All 34 browser journeys passed against SQLite and real disposable PostgreSQL.
  Targeted review tests passed with zero and 700-cent delivery fees.
- Manual desktop/mobile review verified the local US/500-cent configuration and
  $21.99 final total. Local demo accounts were reseeded; sign in again after reset.
  Browser payment journeys use a fake provider; this verification created no new
  manual Stripe payment/refund.
