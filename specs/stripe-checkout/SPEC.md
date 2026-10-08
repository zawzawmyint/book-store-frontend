# The Quiet Shelf storefront — Stripe checkout

> **Historical contract:** This document records the pre-delivery addressless checkout. Current checkout and fulfillment use [the delivery specification](../delivery/SPEC.md); its no-delivery, legacy, Accepted, and Completed statements are historical.

> **Status:** Implemented. **Date:** 2026-10-07. Checkout opens Stripe hosted Checkout for test payments only.

## Goal and scope

Let a signed-in customer pay for books through Stripe hosted Checkout in test mode
before Staff processes their order. Follow [the backend contract](../../../backend/specs/stripe-checkout/SPEC.md)
for authoritative prices, payment/refund state, expiry, permissions and compatibility.

Include checkout redirect, payment return/resume, customer and workspace payment
labels, payment-aware processing, full-refund feedback and retry for Staff/Admin.
Exclude delivery/pickup forms, shipping fees/tracking, live payments, customer
cancellation, subscriptions, saved cards, email notifications and partial refunds.
USD and a 30-minute provider payment window are implemented scope; the backend's
initial 31-minute local deadline preserves that full window during session creation.

## Checkout journey

- Keep `/checkout` session-protected and retain the existing account name/email,
  cart summary, server-owned totals and stock validation. Explain test payment,
  no delivery integration, and that Completed means handling finished.
- Replace Submit order request with **Continue to payment**. Call `createCheckout`
  with cart IDs/quantities and a UUID requestKey. Never send client prices, currency,
  paid flags, arbitrary redirect URLs or customer identity.
- Generate the key once per deliberate submission and retain it plus the submitted
  cart snapshot across refresh/network failure in validated sessionStorage. Scope
  it to the signed-in user; do not store credentials/provider URLs. Same lines
  retry with the same key; changed lines start a deliberate new attempt. When
  storage is unavailable, keep the attempt in memory and offer Orders recovery.
- Disable repeated clicks while pending. Redirect to the backend-returned HTTPS
  `checkout.stripe.com` URL only after validating its origin. Missing URL means
  show/open the returned order state, not invent a redirect or repeat payment.
- Preserve the cart during creation failure, declines, interrupted payment and
  uncertain network outcomes. Do not clear it when Stripe merely opens.
- After server-confirmed Paid, clear the cart only if it still exactly matches
  the persisted submitted snapshot for this user/order. Preserve a changed cart
  or a cart without that snapshot; clear the matching attempt record afterwards.
  This avoids deleting books added while payment was open.
- Retire only the matching user/order attempt after backend-confirmed Cancelled with
  Pending or Expired payment, retaining the cart so a new stock-checked attempt can
  start. Uncertain and resumable attempts retain their key. Changed lines receive a
  new deliberate attempt; a return without its matching snapshot preserves the cart.
- With checkout disabled, show payment unavailable and retain the cart. Never fall
  back to the old unpaid `placeOrder` mutation.

## Return, resume, and account views

- Add guarded `/checkout/return/:orderId` under the storefront layout. Stripe's
  success and back/cancel URLs point here with a UI-only outcome hint. Validate ID
  and owner scope. URL values are never proof of successful payment or cancellation.
- Call `refreshOrderPayment` on entry and show confirmed backend state. A Pending
  return says **Confirming payment**; refresh at 3-second intervals for at most
  30 seconds while mounted/visible, then offer explicit Check payment status.
  Do not keep polling terminal state or issue automatic checkout/refund mutations.
- A back/cancel return says payment has not been confirmed and offers Resume payment
  while the same Session remains open. Returning from Stripe does not cancel the order.
- Paid shows a confirmed receipt with saved lines/total, payment status, and View
  order details. Expired shows reservation released and invites returning to the cart
  for a new stock check. Never reopen the old order or promise stock remains available.
- Show safe unavailable/not-found/error states and keep existing session refresh,
  private Apollo cache clearing, sign-in return paths and cross-account isolation.
- `/account/orders` and `/account/orders/:id` display payment independently of order
  status: Payment pending, Paid, Payment expired, Refund pending, Refunded,
  Refund failed, or Legacy unpaid. Use saved USD currency/amounts and timestamps.
- Owner detail offers Resume payment for a Pending Submitted payment-required order
  and Check payment status for uncertain outcomes. Backend denial takes precedence.
  Legacy/terminal orders have no payment action. Refund failure explains that staff
  needs to resolve it; customers cannot retry refunds.

## Staff/Admin journey

- Add payment text/badges to `/admin/orders` and `/admin/orders/:id`; preserve current
  status filtering, pagination, return navigation, attribution and permission checks.
  No new payment filter/dashboard is needed in this phase.
- For payment-required orders, Accept is available only when Paid; Complete requires
  Accepted and Paid. Legacy unpaid retains existing processing controls and a clear
  label. Backend rules remain authoritative under stale data or role changes.
- Pending cancellation warns that the payment session must be closed before stock
  is released. Uncertain results require refresh/confirmation, never automatic replay.
- Paid cancellation requires the existing customer-visible reason and confirmation
  explaining a full refund will be requested. Show **Order cancelled; refund pending**
  until the backend reports success. Do not optimistically claim refunded or restocked.
- Show Refund failed with a safe message and confirmed Retry refund action to
  PROCESS_ORDERS users. Disable while pending; refetch state after uncertain responses.
  Repeated clicks must not create another refund or cancel event.
- Render system workflow attribution without a fabricated Staff role. Update Admin
  Activity labels for payment-state changes; preserve Admin-only Activity access.

## Files and API integration

Modify `src/features/checkout/pages/CheckoutPage.tsx`, checkout receipt components,
`src/features/account/pages/OrdersPage.tsx` and `OrderPage.tsx`, workspace order
pages/dialogs, Activity rendering and `src/app/App.tsx`. Add a return page in the
checkout feature and a payment label helper in `src/features/orders/` only where
customer/workspace views share it. Reuse existing layouts, dialogs and feedback.

Update `src/operations.graphql` for CreateCheckout, ResumeCheckout,
RefreshOrderPayment, RetryOrderRefund and payment fields; regenerate
`src/generated/graphql.ts` against the paired API. Stop calling PlaceOrder.
Hosted redirect needs no Stripe.js dependency, frontend publishable key, secret key
or webhook secret. Retain the existing Zustand storage key/raw-array cart format.

## Acceptance criteria and verification

- [x] Signed-in checkout reaches hosted test payment using backend prices; guests
  and expired sessions return to sign-in safely. No unpaid fallback exists.
- [x] Declined/interrupted/uncertain attempts preserve the cart and request key;
  same-key retries reuse one order; refresh and duplicate clicks remain safe.
- [x] Success/back URLs never fabricate Paid or Cancelled. Return-before-webhook,
  provider unavailable, expiry and bounded polling have accurate messages/actions.
- [x] Confirmed payment clears only the unchanged submitted cart, including tests
  for cart edits while away, missing storage, another user and another device.
- [x] Customer lists/details expose only owner-safe payment information and allowed
  resume actions; legacy orders remain explicitly unpaid with no Pay button.
- [x] Staff accepts/completes only eligible orders; cancellation/refund pending,
  failure/retry and concurrency show backend truth without false success.
- [x] System attribution, Admin Activity, role revocation and private cache isolation
  remain correct; no provider internals or secrets appear in client operations/storage.
- [x] Keyboard focus, accessible pending/error announcements, text status labels,
  Light/Dark and mobile layouts work for new pages/dialogs.

Use targeted component tests plus isolated Playwright journeys with an injected fake
Stripe provider in `e2e/server.ts`; intercept hosted navigation to a controlled test
fixture. Do not automate real Stripe Checkout or contact Stripe in ordinary CI.
The full component suite (105 tests), codegen, lint, build, and 33 isolated Chromium
journeys passed. Manual Stripe Sandbox verification covered a signed-webhook payment
and staff-confirmed full refund; manual decline, 3DS, and provider-outage checks are
not yet performed. Automated tests cover the associated client business failure paths.

This feature requires the paired API because old PlaceOrder calls are rejected. Root,
authentication, workflow, README, and AGENTS documentation now describe the delivered
test-payment flow.
