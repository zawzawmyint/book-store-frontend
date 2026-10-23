# Review remediation

**Status:** Partially implemented

**Date:** 2026-10-21

**Branch:** `docs/review-remediation-spec`

**Baseline:** `4261f38` on `main`

## Purpose and status

Specify frontend work from the audit, clean-code and QA review and follow-up suggestions. R4–R6, S7 and the S2 book-edit conflict slice are delivered. The deferred backend policy and rollout inventory remains explicit.

The [backend companion](../../../backend/specs/review-remediation/SPEC.md) records the complete R1-R6/S1-S7 inventory and owns stream logging, Redis connection health, pricing validation, final-admin policy, cover failures, payment-mode provenance, distributed auth limits and startup wiring. This document owns R4-R6, S7 and the client half of S2.

## Scope and exclusions

### Remediation delivery — verified 2026-10-22

**Status:** Delivered for R4–R6 and S7.

The delivered work covers R4, R5, R6 and S7, coordinated with backend R1–R3. It preserves the existing S2 implementation and its revision/cover conflict recovery. Affected feature specifications and root documentation now reflect the verified behavior.

The delivery introduced no GraphQL contract, cart persistence format, dependency or database changes. The final-admin policy decision, live-payment support and mandatory book-revision enforcement remain outside this delivery.

- Improve cart-state readability without changing ownership, persistence, locks or retries.
- Share GraphQL error-code reading while retaining feature-specific recovery.
- Lazy-load ten admin page modules behind the workspace shell with a localized route loader.
- Make admin list-return validation consistent and type-safe.
- Coordinate conflict-aware book-detail editing with the backend revision contract.
- No new checkout/payment behavior, new state library, dependency upgrades, live-payment enablement, broad UI redesign or database-provider abstraction.
- Final-admin protection is an unapproved backend policy change; do not imply it exists by hiding frontend controls alone.

## R4: Cart store boundaries

**Affected:** [cart-store.ts](../../src/features/cart/cart-store.ts), [cart persistence](../../src/features/cart/cart-persistence.ts), [cart session](../../src/features/cart/CartSession.tsx), [account-cart spec](../account-carts/SPEC.md).

The delivered store keeps one Zustand public state/action surface while [cart-guest.ts](../../src/features/cart/cart-guest.ts) owns guest synchronization and [cart-account.ts](../../src/features/cart/cart-account.ts) runs captured account operations and retries. This separates orchestration without adding a generic state-machine framework or a second visible state source.

Preserve owner/generation/read-sequence protection, server revision handling, merge notices, pending-operation identity and retry idempotency. Keep account bags server-owned, legacy guest arrays unowned until explicit import/discard, Web Locks where available and in-memory usability when storage fails. No cart storage-key/envelope migration or API changes belong to this refactor.

Delivered acceptance criteria:

- [x] Existing guest/account/session/race tests pass before and after extraction; public store consumers need no behavior changes.
- [x] Late reads/mutations cannot populate a different user's bag after logout or account switching.
- [x] Retrying a pending write does not double-apply quantity changes or merge claims.
- [x] Storage denial and cross-tab guest edits retain existing behavior; account items never enter guest persistence.
- [x] Checkout failures retain the bag and existing actionable feedback.

## R5: Shared GraphQL error-code reader

**Affected:** [admin-access.ts](../../src/features/admin/admin-access.ts), [cart-store.ts](../../src/features/cart/cart-store.ts), [NotificationProvider.tsx](../../src/features/notifications/NotificationProvider.tsx).

The delivered [graphql-errors.ts](../../src/lib/graphql-errors.ts) reads ordered valid string codes from Apollo combined GraphQL errors and returns an empty result for unknown, null or malformed inputs without throwing. `firstGraphqlErrorCode` preserves the cart's positional first-GraphQL-error policy, while [cart-error.ts](../../src/features/cart/cart-error.ts) retains its plain `{ code }` fallback. The reader does not parse error-message text or turn transport errors into authentication errors.

Keep selection policy local: admin chooses the first recognized FORBIDDEN/UNAUTHENTICATED code; notifications chooses its first recognized NOTIFICATIONS_DISABLED/UNAUTHENTICATED/FORBIDDEN code; cart retains first-GraphQL-error semantics and the existing plain-code fallback. Do not accidentally change precedence by making every caller choose any recognized code. Any desired recovery-policy change needs separate regression criteria.

Delivered acceptance criteria:

- [x] Combined, multiple-error, plain-code, network, null and malformed error cases have focused coverage.
- [x] Each feature preserves its existing access/session/disabled/retry behavior and code precedence.
- [x] Three separate shape parsers are replaced by the shared reader without a broad error framework.

## R6: Frontend delivery performance

**Evidence:** The comparable baseline build reported approximately 1,444.05 kB of initial JavaScript (408.54 kB gzip). This is one measured baseline, not proof of poor real-user timing. [App.tsx](../../src/app/App.tsx) eagerly imported most admin pages; the dashboard page was already lazy.

Measure a fresh baseline with the same dependencies/build settings. Prefer lazy admin route/page imports and the existing Suspense/BookLoader pattern. Keep small shared shell/access code shared where appropriate. Do not suppress the warning, increase its threshold, add a splitting dependency or create arbitrary vendor chunks just to change the displayed number.

Delivered acceptance criteria:

- [x] A production build records before/after raw and gzip sizes under comparable settings: complete static closure is 1,334,207 bytes (385,087 bytes gzip) across 14 shared assets.
- [x] All ten admin page modules are dynamic entries in the Vite manifest and absent from the initial storefront module graph.
- [x] Direct admin URLs, refresh, denied access, localized loading states and route transitions remain functional without blank screens or lost state.
- [x] Remaining large chunks are recorded; no Core Web Vitals improvement is claimed.

The main chunk remains 592.01 kB; dashboard (385.68 kB), alert (363.71 kB), and pagination (163.54 kB) also remain large. The build split reduces initial delivery but does not itself establish field performance.

## S2: Conflict-aware book-detail forms — delivered

**Affected:** [operations.graphql](../../src/operations.graphql), [BookFormPage.tsx](../../src/features/admin/pages/BookFormPage.tsx), [book form validation](../../src/features/admin/book-form.ts), generated operations and the [backend revision contract](../../../backend/specs/review-remediation/SPEC.md).

The delivered backend fields are `AdminBook.detailsRevision: Int!` and `updateBook(..., expectedRevision: Int)` during compatibility rollout. The frontend requests the revision with the detail form and sends the revision associated with the loaded form values. Do not silently substitute a newer refetched revision while keeping older dirty values.

Selected delivery slice: the optional backend argument remains for legacy-client compatibility; this frontend always supplies a revision for detail writes. Conflict reload uses an accessible confirmation dialog warning that unsaved details and a staged cover are discarded only after the latest book loads successfully.

On `CONFLICT`, preserve all entered values, keep the user on the form and display localized accessible feedback that the book changed. Provide an explicit reload-latest action with a warning that it discards unsaved edits. Do not automatically retry using a newer revision or offer a force-overwrite bypass. Preserve the current form when reload fails. After a successful save, follow the existing validated return destination and success feedback.

Stock remains a separate delta adjustment; cover replacement retains its existing `coverRevision`/If-Match contract. Their revisions must not be conflated. Coordinate translations in en/ar/th/zh-Hans, labels, focus and error announcement.

Compatibility: deploy additive backend fields/optional argument first, update source operations, run frontend codegen against that API and commit generated output. After old clients are retired, backend may require the argument. Frontend rollback during the compatibility window remains supported; after enforcement, rolling back to a client that omits the revision is incompatible.

Delivered acceptance criteria:

- [x] Two admins edit the same book; the first save succeeds and the second preserves its conflict draft.
- [x] Reload behavior, later saves, localization, independent stock/cover behavior, and generated operations remain correct.

## S7: Validated admin list-return destinations

**Affected:** [activity-data.ts](../../src/features/admin/activity-data.ts), [UserPage.tsx](../../src/features/admin/pages/UserPage.tsx), [OrderPage.tsx](../../src/features/admin/pages/OrderPage.tsx), [BookFormPage.tsx](../../src/features/admin/pages/BookFormPage.tsx), existing dashboard return handling.

Before delivery, several return links used prefix checks or TypeScript assertions without runtime validation. This was not an established external-redirect defect. The delivered `adminListReturnTo` parser validates explicit allowed list paths and supplies a feature-specific fallback, preserving the existing books parser's same-origin, exact-path, control-character and backslash rejection. It preserves valid query strings and drops fragments.

- User details allow `/admin/users`, with `/admin/customers` normalized to `/admin/users` for legacy navigation.
- Order details allow `/admin/orders`; preserve the separate existing `dashboardReturnTo` validation and its priority.
- Book details/history/edit allow `/admin/books`; BookFormPage and book history use the same books-return validation.
- Missing/non-string/malformed values, absolute URLs (even same-origin), protocol-relative URLs, controls, backslashes and unexpected paths fall back safely. Unknown history state must never cause `.startsWith` to throw.
- No list filter, authorization or routing contract changes; valid search/filter/pagination queries survive the return trip.

Acceptance criteria:

- [x] All affected return links accept valid base/list-query destinations and preserve allowed query parameters.
- [x] Legacy customer links normalize correctly and existing dashboard-return tests remain green.
- [x] Invalid origins, unexpected paths, controls, backslashes and non-string state fall back without exceptions.
- [x] Book-history and book-form navigation use the same validation rules.

## Validation and evidence limits

Final evidence: frontend tests passed 373/373 across 74 files; lint and build passed. The comparable build reported approximately 1,444.05 kB of initial JavaScript (408.54 kB gzip); the final complete static closure is 1,334,207 bytes (385,087 bytes gzip) across 14 shared assets. All ten admin page modules are dynamic Vite entries. The completed Chromium run collected 95 tests: 94 passed and one native notification zoom test was skipped because it requires the separate notification-acceptance project. A focused final admin-loader run passed 3/3, including Arabic RTL translated loading copy after reload. Coordinated backend verification passed 375 tests with 4 skips, 49/49 PostgreSQL contract tests, compiled SQLite/PostgreSQL smokes, populated-migration checks, and the focused notification lifecycle suite 27/27. All four shipped locales include the conflict/reload copy.

- For behavior-preserving refactors, record a passing targeted baseline and rerun existing coverage. Add failing behavior cases for conflict handling and malformed navigation before implementation.
- Run `bun run test`, `bun run lint`, `bun run build`; execute isolated browser journeys for account switching/cart retries, two-editor conflicts, admin back navigation and lazy direct-route access.
- No real-user performance or Core Web Vitals measurement was performed. The native notification zoom path remains outside the executed browser project.
- Production Redis/TLS/proxy/capacity and backend retention gates remain outside this frontend validation; preserve those existing release gates.

## Delivery, documentation and rollback

The delivered cart extraction, error-reader reuse, URL validation and route splitting are independent. The book form continues to require compatible backend revision support. Existing account-cart, admin, readability, loading and root documentation are synchronized with delivered behavior.

Frontend-only slices can be reverted independently with no storage migration. Keep cart envelope and API operation compatibility intact. Keep backend revision columns on rollback and observe the staged GraphQL compatibility window. This partially implemented spec retains per-slice evidence and leaves deferred/backend policy decisions explicitly unresolved.
