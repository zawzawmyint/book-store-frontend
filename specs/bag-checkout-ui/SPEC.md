# 🛍️ Bag and Checkout UI Improvements

> **Goal:** Help shoppers understand their bag, enter delivery details, and review one clear total before Stripe test payment.

---

## 🎯 Objective

**Status: Proposed.** **Date: 2026-10-15; verification updated 2026-10-16.** Source implementation and automated validation are complete. This feature remains Proposed because the in-app browser could not perform actual 200% zoom validation; that acceptance item remains unchecked below.

The prior bag repeated its subtotal, showed only unit prices for multi-copy lines, and had small quantity controls. Checkout used a long single-column address form. At review, the quoted delivery-inclusive total competed with an order panel that still said delivery was added at review. On mobile, the order panel followed the form and payment action. A conditional legacy-bag recovery notice could dominate the page.

The source changes implement the target presentation using the store's cream/green palette, serif headings, controls, and spacing conventions. Only actual 200% browser-zoom verification remains pending.

---

## 📦 Scope

**In scope**

- `/cart`: clearer prices, one subtotal, delivery explanation, larger controls, and accessible mobile checkout access.
- `/checkout`: responsive delivery form, visible progress, coherent order summary, review actions, and accurate copy.
- Compact legacy saved-bag recovery presentation in the existing shared feedback component.
- Loading, validation, quote invalidation, blocked cart, and interrupted-attempt presentation affected by these layouts.

**Out of scope**

- New routes, guest checkout, live payments, saved addresses, discounts, tax calculations, or delivery-rate changes.
- Changes to GraphQL operations/schema, cart persistence, ownership, merging rules, database migrations, payment recovery, or backend services.
- Payment-return/order-page redesign, external Stripe UI, new dependencies, or a new visual identity.

---

## ⚙️ Assumptions & Constraints

**Technical**

- [Delivery](../delivery/SPEC.md), [account carts](../account-carts/SPEC.md), and [authentication](../authentication/SPEC.md) remain the current behavior contracts. The [Stripe specification](../stripe-checkout/SPEC.md) contains explicitly labeled historical behavior; its superseded statements do not override those current contracts.
- Reuse existing React components, generated types, cart selectors, form validation, and quote/attempt state. No new API/data-contract or configuration change is expected.
- Cart prices are estimates. Only a valid server quote supplies reviewed subtotal, delivery fee, and total. An interrupted attempt uses its saved immutable address and expected amounts, clearly labeled as that attempt.
- Preserve current quantity/stock limits, disabled states, cart revisions, owner isolation, explicit legacy import/discard, stale-quote invalidation, and deliberate retry with the original request key.

**Product / Business**

- USD and Stripe test-mode messaging remain accurate. No saved-address feature or delivery-date guarantee is implied.
- UI copy uses “bag” consistently for customer-facing edit actions.

**Dependencies**

- Existing frontend and isolated browser fixture API. No external service configuration is required for UI implementation.

---

## 🧩 Proposed Approach

- **Bag rows:** distinguish unit price and quantity-adjusted line total, for example `$16.99 each` and `$33.98` for two copies. The line total has screen-reader context naming the relevant book. Derive these from current items without changing price authority. Keep one **Books subtotal** and a separate **Delivery — calculated at checkout** row; do not label the subtotal as a final total.
- **Touch controls:** quantity and remove controls have at least 44×44 CSS-pixel hit areas. Preserve accessible book-specific names and current disabled behavior.
- **Bag mobile action:** provide a compact sticky subtotal/checkout bar while items scroll. Label the amount as books subtotal and preserve checkout gating. Reserve space so the bar cannot obscure content, alerts, or focused controls. Desktop retains its summary panel.
- **Checkout progress:** display **Delivery → Review → Payment**, identify the current step accessibly, and describe Payment as the next external Stripe step. Do not add a route or suggest payment is complete.
- **Address form:** keep recipient, phone, street, city, region, postal code, and country rules unchanged. On desktop pair recipient/phone and city/region where space permits; keep fields single-column on narrow screens. Put address line 2 behind an accessible **Add apartment, suite, etc. (optional)** disclosure. Expand it when it already contains a value or has an error, retain its value across review/edit, and keep other optional-field labels visible.
- **Summary states:** use one consistent presentation of amounts. Before review, show estimated books subtotal, delivery as calculated at review, and no final payable total. The configured per-order fee can remain clearly labeled informational copy. After review, every visible summary uses the valid quote's subtotal, delivery, and total and removes pre-review delivery wording. On invalidation immediately return to the pre-review presentation; never retain an apparently payable stale total.
- **Interrupted attempt:** prioritize the existing saved-attempt details and recovery actions. Do not present the current bag's estimate as that attempt's payable total or enable ordinary new-payment submission from a summary.
- **Responsive summary:** desktop places the order panel beside the form. Mobile places a compact expandable order summary above the form with a visible amount/state even when collapsed. At review, show the complete quoted breakdown beside the primary **Continue to payment** action, followed by secondary **Edit address** and **Edit bag** actions. Avoid duplicate conflicting totals and duplicate payment submissions.
- **Legacy notice:** replace the large expanded notice with a compact explanation that an older bag was found on this browser and may belong to someone else. Keep book/quantity details available through disclosure and explicit import/discard choices discoverable. Signed-out users retain the sign-in explanation. Expansion/collapse alone must never merge or delete data. Preserve unreadable-storage and failed-import recovery.
- **Copy and feedback:** replace “saved destination” before address entry with wording about entering a delivery address. Show full country names at review. Keep a concise Stripe test-payment notice and Orders recovery path. Preserve field-associated errors, live announcements, and retry states.

**Key existing files**

- [CartPage](../../src/features/cart/pages/CartPage.tsx), [CartLine](../../src/features/cart/components/CartLine.tsx), and [CartFeedback](../../src/features/cart/CartFeedback.tsx).
- [CheckoutPage](../../src/features/checkout/pages/CheckoutPage.tsx), [DeliveryAddressForm](../../src/features/checkout/components/DeliveryAddressForm.tsx), and [CheckoutReview](../../src/features/checkout/components/CheckoutReview.tsx).
- [Delivery address utilities](../../src/features/checkout/delivery-address.ts) for country labels. Reuse shared summary/layout primitives without changing other consumers' appearance accidentally.

---

## 🚀 Execution Plan

1. **Bag clarity and controls** — _(role: frontend)_ — add focused behavior coverage, then implement row pricing, one subtotal, larger targets, and mobile checkout access.
2. **Delivery and summary layout** — _(role: frontend)_ — cover quote-state transitions, then implement progress, grouped fields, optional-line disclosure, and responsive summary placement.
3. **Review and recovery presentation** — _(role: frontend)_ — align quoted totals/actions, saved-attempt presentation, country labels, and compact legacy notice while preserving existing recovery behavior.
4. **Verify and reconcile specifications** — _(role: frontend)_ — run required checks, inspect responsive/theme states, and synchronize root and affected feature specs only after acceptance passes.

Follow the repository's failing-test → passing-test → refactor cycle for behavioral changes. Do not add tests that merely mirror styling classes.

---

## ✅ Acceptance Criteria

**Functional**

- [x] Two copies at $16.99 show $16.99 each and a $33.98 line total; quantity changes update line and bag amounts together.
- [x] Bag summary has one books subtotal, clearly explains pending delivery, and preserves empty/unavailable/loading/conflict checkout gating.
- [x] Mobile bag checkout remains accessible during scrolling and follows the same disabled/readiness rules as desktop.
- [x] Checkout exposes its current Delivery/Review stage; Payment never appears completed before provider confirmation.
- [x] All existing address fields and validation remain available; optional line 2 is keyboard operable, retains its value, and expands for errors or existing content.
- [x] Mobile order summary precedes the form and remains understandable when collapsed; desktop keeps the side-by-side layout.
- [x] A $31.98 books quote plus $5.00 delivery shows $36.98 consistently at review, with no pre-review delivery copy remaining in a visible summary.
- [x] Address/cart changes and quote conflicts invalidate reviewed amounts and require explicit fresh review before payment.
- [x] Review places the final total with the primary payment action; Edit address/Edit bag remain available with existing pending-state safeguards.
- [x] Interrupted checkout displays its saved address/amounts and retains exact-attempt retry and Orders recovery; another account cannot see or replay it.
- [x] Legacy recovery explains uncertain ownership, exposes saved items and explicit choices, and never imports/discards merely through disclosure or navigation.
- [x] Initial checkout copy does not claim an address is saved; review uses a readable country name and retains accurate test-payment wording.

**Non-functional** (performance, security, accessibility, reliability)

- [x] Quantity/remove targets are at least 44×44 CSS pixels; visible focus, labels, error associations, and live announcements survive layout changes.
- [x] At 390px mobile and 1440px desktop widths, both themes remain readable with no horizontal overflow; the 720×450 reflow check and settled focused-control clearance confirm the sticky bar does not obstruct the tested layout.
- [ ] Actual 200% browser zoom keeps focused controls unobstructed. The in-app browser did not apply zoom through either tested shortcut, so this has not been verified.
- [x] No extra mutation, automatic submission, ownership/persistence change, new dependency, or backend/API change is introduced.
- [x] Existing cart and checkout regression coverage remains green, including uncertain payment, duplicate-click prevention, and account switching.

---

## 🧪 Validation Plan

**Manual tests**

- Inspect bag, delivery, and review at mobile/desktop widths in light/dark themes; include long titles, multiple quantities, long account text, empty bag, blocked bag, and legacy notice states.
- Check keyboard/disclosure operation, visible focus, error focus, 200% zoom, touch-target measurements, and sticky-bar clearance. Confirm country labels and optional-line retention through edit/review.
- Verify quoted, invalidated, and saved-attempt amounts remain distinguishable. Inspect loading, delivery-options failure/retry, and payment-setup error states with the isolated fixture; do not submit real payments.

**Automated tests**

- Extend the relevant existing [checkout component tests](../../src/features/checkout/pages/CheckoutPage.test.tsx), [cart feedback tests](../../src/features/cart/CartFeedback.test.tsx), and focused coverage for changed bag/form behavior where a material gap exists.
- Extend [checkout browser journeys](../../e2e/checkout.spec.ts) and [account-cart journeys](../../e2e/account-carts.spec.ts) for distinct mobile summary, quote invalidation, and ownership/recovery risks without duplicating assertions across every test level.
- Run affected tests, then `bun run test`, `bun run lint`, `bun run build`, and `bun run test:e2e`. Coordinate the existing isolated PostgreSQL browser checks for affected connected cart/checkout journeys under the delivery parity policy.
- Keep **Status: Proposed** until the remaining actual 200% browser-zoom check passes. Automated results from this implementation are recorded below.

**Verification record — 2026-10-16**

- The final frontend unit run passed **268 tests in 48 files**. Final lint passed.
  The final production build passed with the existing bundle-size warning: the main
  chunk is **1005.59 kB** and the dashboard chunk is **385.87 kB**.
- The broad SQLite browser run completed **69/72** journeys. Its three failures were
  rerun with fresh fixtures after the sticky-focus assertion waited for settled smooth
  scrolling; all **3/3** passed in **32.2 seconds**. The two non-feature failures were
  an unrelated Staff dashboard dialog timeout and its dependent stock case; all changed
  bag and checkout journeys passed.
- `bun run test:postgres:browser account-carts.spec.ts checkout.spec.ts` passed
  **16/16** Chromium journeys in **2.0 minutes**. Disposable PostgreSQL migration
  preservation and same-build SQLite/PostgreSQL smoke checks also passed.
- Manual visual inspection covered 390px and 1440px layouts in light and dark
  themes. A 720×450 viewport reflow check found 705px content within a 720px
  viewport, and the settled geometry assertion covered focus clearance above the
  sticky bar. The in-app browser could not apply actual 200% zoom through either
  tested shortcut, so the reflow observation is only a proxy and does not verify
  actual zoom behavior or full WCAG conformance.

**Rollback / mitigation**

- Revert the frontend presentation changes if necessary. No database, API, saved-bag format, or payment-attempt migration is planned; retain current data and recovery controls.

---

## ⚠️ Risks & Open Questions

**Risks**

- **Risk:** A summary uses current bag estimates for a reviewed or interrupted attempt — _Mitigation:_ derive presentation from the active quote/attempt state and cover invalidation/recovery transitions.
- **Risk:** Sticky actions obscure content or introduce a second payment trigger — _Mitigation:_ restrict the bag bar to checkout navigation, reserve clearance, and retain one deliberate review-stage payment action.
- **Risk:** Compact recovery UI hides an ownership decision — _Mitigation:_ retain visible explanation and explicit choices; test signed-out, signed-in, failed, and unreadable legacy states.
- **Risk:** Shared primitive changes alter unrelated screens — _Mitigation:_ prefer feature-local composition and inspect other consumers if shared defaults change.

**Open questions** _(blockers for implementation)_

- None identified. Exact spacing and breakpoint composition can follow the existing design system within these acceptance criteria.
