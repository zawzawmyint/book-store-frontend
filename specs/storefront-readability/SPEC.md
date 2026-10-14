# 🧭 Storefront readability and consistency

> **Goal:** Make catalog state and checkout responsibilities easier to read and maintain while preserving existing customer behavior.

**Status:** Implemented

**Date:** 2026-10-12

**Superseded catalog-route context:** This document records the 2026-10-12 behavior-preserving catalog extraction. The later [storefront homepage and dedicated catalog](../storefront-homepage/SPEC.md) delivery moves the catalog from `/` to `/books` and adds a shared header search; its current behavior governs those route and navigation statements. The checkout boundaries and the historical verification record below remain accurate.

---

## 🎯 Objective

The admin readability refactor is separate from this work. The storefront already has useful boundaries in Home, book cards, cart calculations, and cart lines. Focus on the two areas where responsibilities are concentrated: catalog URL/query handling and checkout orchestration/rendering.

The delivery kept catalog and checkout as independently reviewable slices. This is a behavior-preserving refactor, not a visual redesign or a claim of faster runtime performance.

---

## 📦 Scope

**In scope**

- Separate catalog URL state, query variables, and filter/page actions from rendering.
- Improve checkout names and state types; extract cohesive address-form and review rendering.
- Preserve existing request lifetime, quote invalidation, payment retry, and session boundaries.
- Characterization coverage for material gaps and synchronized documentation.

**Out of scope**

- Redesigning Home, Book, Cart, checkout, account pages, or shared UI primitives.
- New search behavior, filters, pagination rules, routes, features, or permissions.
- Backend, GraphQL operations/schema/generated files, dependencies, storage formats, and database changes.
- Replacing Apollo, Zustand, React Hook Form, or Zod; a generic storefront/admin pagination framework.
- Refactoring payment return handling or checkout-attempt persistence beyond any strictly necessary caller typing.

---

## ⚙️ Assumptions & Constraints

**Technical**

- Preserve `/`, `/books/:id`, `/cart`, `/checkout`, and `/checkout/return/:orderId` route behavior; no route definitions change.
- Catalog uses **12 items**, a **zero-based** URL page, and the existing page expression `Math.max(0, Number(params.get('page') || 0) || 0)`. It differs from admin pagination. Do not silently tighten parsing or add automatic page correction during this refactor.
- Preserve `search` as the current single search/genre parameter. Search submission trims the draft; genre selection and clear update the draft; both replace the filter parameter set and reset the page. Previous/Next retain search and write the page parameter.
- Preserve current draft initialization and browser-navigation behavior. If characterization exposes a defect, record it separately with an explicit behavior contract and regression test rather than bundling a fix.
- Preserve query documents, variables, fetch policies, skip conditions, labels, accessibility, loading/error/empty states, and DOM structure where practical.
- Keep the keyed checkout remount on user identity, generation/unmount guards, cart-change invalidation, and repeated-submission protection.

**Product / Business**

- The backend remains authoritative for stock, delivery options, prices, and totals. Stripe remains hosted test payment.
- Preserve destination normalization, explicit server review, exact saved-attempt retries, cart retention, and payment recovery messaging.
- [Delivery](../delivery/SPEC.md) is the current checkout contract; the addressless portions of [Stripe checkout](../stripe-checkout/SPEC.md) are historical.

**Dependencies**

- Reuse current shared controls, `SummaryPanel`, `DeliveryDetails`, cart helpers, address schema, and checkout-attempt utilities.
- Work follows [repository guidance](../../AGENTS.md); no new package or API endpoint is required.

---

## 🧩 Delivered Approach

- **Catalog:** [use-catalog.ts](../../src/features/books/use-catalog.ts) now owns the existing URL parsing, draft/search actions, page actions, and `BooksDocument` query. [CatalogSection](../../src/features/books/components/CatalogSection.tsx) retains rendering and receives named state and handlers; no unnecessary component split was added.
- **Checkout names/types:** [CheckoutPage](../../src/features/checkout/pages/CheckoutPage.tsx) uses responsibility-specific request-guard names plus `CheckoutSessionProps` and `ReviewedQuote` types. Generated query inference and the existing quote `value`, `address`, and `snapshot` semantics remain intact.
- **Checkout rendering:** [DeliveryAddressForm](../../src/features/checkout/components/DeliveryAddressForm.tsx) owns address controls, while [CheckoutReview](../../src/features/checkout/components/CheckoutReview.tsx) owns the reviewed-order display. Their named props preserve existing field identifiers, validation messages, disabled states, and edit/payment actions.
- **Checkout orchestration:** `DeliveryCheckout` remains the single owner of quote/attempt state, network work, guards, and transitions. No controller hook or duplicate state owner was introduced.
- Keep [delivery-address.ts](../../src/features/checkout/delivery-address.ts), [checkout-attempt.ts](../../src/features/checkout/checkout-attempt.ts), and cart persistence behavior intact. Reuse existing helpers before adding new ones.
- **Data flow stays unchanged:** catalog URL → Books query → cards; cart + normalized address → server quote → explicit confirmation → saved attempt → createCheckout → validated payment redirect or order return.
- **API/data contracts:** no external changes. `DeliveryOptionsDocument`, `QuoteCheckoutDocument`, and `CreateCheckoutDocument` retain their current inputs and outputs. New types and component props are internal only.

The final boundaries above were verified without changing routes, API contracts, generated files, dependencies, storage formats, backend code, or visual design.

---

## 🚀 Delivery Record

1. **Catalog extraction** — _(role: frontend)_ — ran baseline coverage, added URL/filter/page characterization, then moved state/query handling without changing URL semantics or rendered results.
2. **Checkout naming** — _(role: frontend)_ — clarified names and types while retaining guards and effects.
3. **Checkout rendering boundaries** — _(role: frontend)_ — extracted the address form and review display while retaining a single orchestration owner and existing invalidation, recovery, and late-response behavior.
4. **Verification and reconciliation** — _(role: frontend)_ — completed focused and required checks, full browser coverage, independent review, and documentation reconciliation.

Each slice must remain independently usable and reviewable. Do not combine an unrelated bug fix with the extraction.

---

## ✅ Acceptance Criteria

**Functional**

- [x] Catalog rendering uses feature-local state handling while keeping page size 12, zero-based URLs, search/genre behavior, page actions, and browser history unchanged.
- [x] Catalog query variables, results, retry, loading, empty states, and accessible controls retain their current behavior.
- [x] Checkout responsibilities have clear names and named state types; address and review rendering have cohesive boundaries without duplicate state ownership.
- [x] Address edits and cart changes invalidate quotes; a cart edit followed by reversal still invalidates the prior review. Late responses cannot restore stale review or navigate after unmount/account change.
- [x] Payment creation requires the existing explicit review or saved attempt. Retry retains the exact saved destination, amounts, and request key after uncertain failure.
- [x] Price conflicts require renewed review; session-loss handling, supported-country checks, payment URL validation, and existing return navigation remain intact.
- [x] Existing cart retention, attempt persistence, and payment-return behavior remain intact.

**Non-functional** (performance, security, accessibility, reliability)

- [x] No route, API, generated-file, dependency, storage-format, backend, or visual-design changes are introduced.
- [x] Existing focus behavior, form labels/error associations, loading/disabled controls, responsive layouts, and theme behavior are preserved.
- [x] No additional network calls, request races, subscription leaks, or repeated-submission paths are introduced by extraction.
- [x] Required automated checks pass; documentation records actual delivered files and verification evidence.

---

## 🧪 Validation Plan

**Manual tests**

- No separate manual visual pass was run. Source/DOM comparison and automated coverage were used for this behavior-preserving refactor.

**Automated tests**

- Use the repository's **baseline → refactor → green** workflow for behavior-preserving changes. Add characterization tests only for material uncovered invariants; do not manufacture red tests for renames or extraction. Any separately authorized behavior fix uses failing-test → passing-test TDD.
- Added [CatalogSection.test.tsx](../../src/features/books/components/CatalogSection.test.tsx) coverage for observable URL/filter/page behavior. It avoids assertions on hook internals.
- [CheckoutPage.test.tsx](../../src/features/checkout/pages/CheckoutPage.test.tsx) retains prior coverage and adds account-change and repeated pending-retry characterization; [checkout-attempt.test.ts](../../src/features/checkout/checkout-attempt.test.ts), address/cart tests, and existing stale-response, conflict, reload, and retry coverage remain in place.
- Ran `bun run test`, `bun run lint`, `bun run build`, and full `bun run test:e2e`. Relevant browser journeys include [checkout](../../e2e/checkout.spec.ts), [order workflow](../../e2e/order-workflow.spec.ts), [appearance](../../e2e/appearance.spec.ts), and [icons/typography](../../e2e/icons-typography.spec.ts).
- Preserved [browser fixture isolation](../../e2e/server.ts). The diff contained no unexpected operations, generated files, routes, dependencies, or storage changes; no code generation or migration was needed.

**Verification evidence**

- Baseline: `bun run test` passed with 148 tests in 35 files.
- Refactor checks: focused catalog and checkout coverage passed with 24 tests in 3 files; final `bun run test` passed with 155 tests in 36 files; `bun run lint` and `bun run build` passed.
- Browser coverage: final `bun run test:e2e` passed with 44 tests. The build retained the existing Vite chunk-size warning above 500 kB.
- Independent review found no actionable issues. It compared catalog URL/query behavior and checkout DOM, accessibility predicates, request/attempt, and session guards.

**Rollback / mitigation**

- Revert the affected catalog or checkout slice independently. No migration, data reset, or storage conversion is needed. Preserve the unrelated admin and backend refactors.

---

## ⚠️ Risks & Open Questions

**Risks**

- **Risk:** Reusing admin pagination changes storefront page semantics — _Mitigation:_ keep a catalog-local boundary and characterize current URLs before extraction.
- **Risk:** Form extraction changes validation, focus, or quote invalidation — _Mitigation:_ retain form ownership and callback timing; verify accessible field associations and edit behavior.
- **Risk:** Moving checkout effects changes request lifetime or retry identity — _Mitigation:_ retain one orchestration owner, user-keyed remount, guards, subscriptions, and saved-attempt helpers; keep race/recovery tests.
- **Risk:** A broad rewrite increases review cost without improving clarity — _Mitigation:_ deliver two small slices, reuse existing units, and leave simple Home/Book/Cart code alone.

**Open questions** _(blockers for implementation)_

- None. The delivery preserved current behavior; any future defect or contract change requires separate scope agreement.
