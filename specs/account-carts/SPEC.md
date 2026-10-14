# Account carts — storefront specification

> **Goal:** Keep shopping selections separate for each account, preserve guest shopping during sign-in, and save account carts across browsers/devices.

**Status:** Implemented

**Date:** 2026-10-13

## Delivered behavior

[cart-store.ts](../../src/features/cart/cart-store.ts) now keeps guest carts in the
versioned `book-store-cart` envelope and displays a server-owned cart for a verified
Customer, Staff, or Admin. It can still read the prior raw-array value as an unowned
legacy import. [SessionBoundary.tsx](../../src/app/SessionBoundary.tsx) and
[CartSession.tsx](../../src/features/cart/CartSession.tsx) hide owner-scoped cart UI
while the session changes.

This feature keeps guest carts local and replaces the signed-in shared cart with a
server-owned account cart. The [backend specification](../../../backend/specs/account-carts/SPEC.md)
is authoritative for GraphQL shapes, limits, merge rules, authorization, concurrency,
and payment cleanup.

Excluded: offline account edits, server-stored guest carts, live push updates, wishlists, abandoned-cart messages, and the duplicate denied-page header found during browser testing.

## Customer flow

1. **Guest:** add/remove/update items locally, surviving reload when storage works. A guest cart has no account owner and performs no account-cart API calls.
2. **Sign-in:** hide the old cart while identity resolves; load the verified account's cart and merge newly created guest items once. Clear the guest snapshot only after confirmed merge success. No cart from another account is a merge source.
3. **Shopping:** save authenticated changes immediately through `setCartItem`. A detail-page quantity addition sends one absolute target-quantity write with the accepted revision and request key; it confirms only when the same owner visibly receives the full requested increment. Show save progress and actionable errors; never label a failed write as saved.
4. **Reload/another device:** read `myCart`. Revalidate on cart-page entry and window focus; do not interrupt an in-flight edit with stale read results. Server state is authoritative.
5. **Logout/session expiry:** hide account items and unresolved responses immediately, clear private query state, and expose a separate guest cart. A successful explicit storefront or workspace logout goes directly to `/sign-in` with history replacement; session expiry retains its existing guarded recovery. Normally the guest bag is empty because prior guest items were consumed at login. Saved account items stay on the server.
6. **Switch accounts:** B sees only B's server cart. Returning to A reloads A's selections. All three roles follow this rule when shopping; role changes do not transfer cart ownership.
7. **Checkout:** wait for saves/merges, review current server items, submit their revision with existing checkout input, and rely on server payment cleanup. Failed/unconfirmed payment preserves selections.

## Guest merge and legacy compatibility

- New guest carts use the version-2 local envelope containing validated items and a guest identity. Preserve the ability to read prior raw `book-store-cart` arrays, but distinguish those unowned legacy arrays from new guest data.
- At rollout, show a clear prompt before importing legacy selections: **Add this browser's saved bag to your account?** Explain that the old bag was shared on this browser. Keep it in a separate local legacy-import slot until imported or explicitly discarded; do not present it automatically as A's or B's account cart.
- After the first successful new-format migration, `book-store-cart` stores only new guest data. Never write signed-in account carts to that shared key. Do not silently erase an unreadable legacy payload; report that recovery is unavailable and offer a fresh guest cart.
- Newly created guest carts merge automatically on verified sign-in. Matching quantities add, limited to ten/current stock; existing account lines take priority at twenty lines. Show backend notices for skipped unavailable items or capped quantities. Clear the guest snapshot after a confirmed merge even when notices explain partial acceptance.
- Freeze the merge payload and UUID before sending. Persist a bounded pending-merge record with intended account ID, guest identity, payload, and key so a lost response/reload retries the same operation without doubling quantities.
- Once submitted for A, that snapshot is hidden from guests/B and can only be recovered by A. If A signs out during an uncertain merge, retain it in A's pending slot; do not reclassify it as a new guest cart. New guest additions are separate.
- Resolve older pending merges before new guest merges for the same account. Retry the same payload/key; on an explicit conflict reload the revision, retain the key and snapshot, and offer **Retry merge**. Successful receipt replay returns current server state and original notices.
- When browser storage is blocked/full, guests remain usable in memory. Explain that guest recovery across reload is unavailable; retry-safe in-memory merge still works, but do not promise persisted recovery after closing the page.

## State ownership and request lifecycle

- Better Auth remains the session authority. Treat an unverified or unresolved identity as unable to access account carts; never derive ownership from role or submitted email.
- Reuse the existing session boundary to gate the full cart UI, badge, and checkout, not just routed content. Immediately hide the previous owner's items during transitions, including browser Back and cached pages.
- Apollo handles typed server operations; Zustand can retain guest actions and a session-scoped view of account items. Keep one visible cart source at a time and derive count/estimated total from it. Do not persist account carts in the guest key or build a second durable account cache.
- Tag reads/writes with account ID and a session generation. After a switch/unmount, discard their UI results and queued actions. A request already accepted by the server may complete for its original owner but must never be submitted under the new session.
- Serialize edits in the first version. Disable cart-changing actions while a write is unresolved; no debounce/coalescing or offline write queue is required. This favors reliable behavior over speculative synchronization machinery.
- `add(book, quantity = 1)` validates a positive whole-number increment and the current stock, ten-copy, and 20-line limits at the action boundary. Guests make one complete locked storage update; existing single-copy callers remain compatible. A false result covers rejection, adjustment, incomplete confirmation, or owner change and must not produce a success announcement.
- Each write uses the latest accepted revision and a fresh UUID. An uncertain network result retries only the exact payload/key under the original owner; do not create a new key and risk duplicating an action. Show **Retry save**; disable checkout until resolved.
- On `CART_CONFLICT`, reload the latest cart, announce that it changed elsewhere, and let the shopper retry their intended edit. Never replay an obsolete absolute quantity automatically. Ignore background refreshes older than the accepted mutation result.
- Refresh during an unresolved ordinary edit loads server truth and warns that an unconfirmed edit may not have been saved. Only merge recovery is persisted in this first version; offline account edit survival is not promised.
- Origin/session checks and credentialed GraphQL remain unchanged. Cart reads, writes,
  and cart-linked checkout requests send `X-Cart-Account` as an optional client-side
  expectation. The backend compares it with the authenticated session; the session,
  never this header, remains authoritative. No tokens, addresses, payment details, or
  account profiles enter cart persistence.

## UI and checkout integration

- Keep existing public catalog/detail/cart routes and authenticated checkout/account routes; no new page is required. Reuse current controls, shadcn/ui feedback, and accessible labels.
- Show distinct loading, empty, saving, saved, conflict, unavailable-item, and retry states. Use polite status announcements; use alerts for actionable failures without shifting focused controls unexpectedly.
- Read current catalog metadata from the cart API. Show archived/insufficient-stock lines as unavailable and allow remove/decrease; block checkout until unavailable selections are corrected. Saving a cart is not a reservation or price guarantee.
- Block checkout if the cart is loading, unsaved, merging, empty, or invalid. Invalidate the review after an accepted cart change or revision conflict. Send optional `cartRevision` alongside existing IDs/quantities, quote amounts, address, and request key.
- Key checkout attempts to account identity as today. Include cart revision in new attempt comparisons. Resumed payments use the original order snapshot, not a replacement cart or the currently signed-in person's selections.
- Replace blanket local `clear()` after payment with reloading the server cart. Paid reconciliation removes only submitted lines whose quantity/version is unchanged. Later additions and every edited/re-added line remain in full; do not subtract quantities from changed lines locally.
- The payment return URL is not proof of payment. Pending/expired/failing payment keeps the cart; duplicate reconciliation and payment return under B cannot clear B's cart for A's order. Existing owner-safe order-detail behavior remains intact.

## Affected files and compatibility

Existing boundaries include [cart.ts](../../src/features/cart/cart.ts), [cart-store.ts](../../src/features/cart/cart-store.ts), [CartPage.tsx](../../src/features/cart/pages/CartPage.tsx), catalog add controls, [Layout.tsx](../../src/app/Layout.tsx), [SessionBoundary.tsx](../../src/app/SessionBoundary.tsx), [App.tsx](../../src/app/App.tsx), [checkout-attempt.ts](../../src/features/checkout/checkout-attempt.ts), [CheckoutPage.tsx](../../src/features/checkout/pages/CheckoutPage.tsx), and [CheckoutReturnPage.tsx](../../src/features/checkout/pages/CheckoutReturnPage.tsx).

Add cart operations to [operations.graphql](../../src/operations.graphql) and regenerate [graphql.ts](../../src/generated/graphql.ts) against the running updated backend. Extend isolated E2E fixtures and meaningful cart/session/checkout tests; do not duplicate backend calculation coverage through every UI control.

This deliberately replaces the prior sign-out/cart-persistence contract. Root
SPEC/README and authentication, auth-email, checkout/delivery, and state-ownership
documentation are reconciled, including the old `book-store-cart` raw-array
compatibility instruction in AGENTS.md.

## Acceptance criteria

- [x] Guest selections survive refresh/storage fallback and carry into sign-in without unintended loss.
- [x] A's cart is hidden on logout/switch; B cannot see A's items or stale badge/checkout content, including delayed requests and browser Back.
- [x] Returning to A or using another browser restores A's saved selections; Staff/Admin shopping is isolated by account too.
- [x] Legacy shared-cart import requires confirmation; an uncertain merge cannot attach to another account or apply twice after reload/retry.
- [x] Save failure/conflict is visible, retry is owner-scoped, and checkout stays blocked until server state is confirmed.
- [x] Changes in another tab/device load on refresh/focus without silently overwriting local accepted edits.
- [x] Unavailable items and adjusted merge quantities have understandable, accessible feedback.
- [x] Checkout rejects stale review state; paid cleanup preserves later additions and changed lines while clearing unchanged purchased lines once.
- [x] Desktop/mobile cart, merge prompt, keyboard navigation, and status announcements are usable.

## Validation and release

Focused tests cover legacy/new-format guest loading, merge recovery, session generation,
delayed response rejection, and cart revision in checkout attempts. Isolated E2E covers
guest-to-A, A-to-B-to-A, Staff/Admin accounts, conflicts, lost merge/save responses,
expired sessions, and paid cleanup without browser return while preserving email
verification and interrupted-checkout coverage.

Completed evidence: frontend `bun run test` passed **194** tests in **39** files;
lint, build, and codegen passed, with the existing chunk-size warning retained. Full
SQLite Chromium E2E passed **58** journeys in **5.1 minutes**; the full PostgreSQL
Chromium suite passed **58/58** journeys in **5.4 minutes** with no filters or
last-failed selection. Composed SQLite/PostgreSQL build smokes, populated additive
migrations, and cleanup passed. Manual desktop/mobile
checks passed guest reload, one-time Customer merge, keyboard saves, reload warning,
logout isolation, Staff/Admin persistence, and mobile blocked/retried save and checkout
states. Backend coverage passed 232 tests, PostgreSQL 36-contract/parity and populated
migration checks, lint, build, and codegen. No production database, live Stripe, or
live SMTP flow was used.

Release after the additive API and both database migrations. There are no new secrets,
external services, or required dependencies in this implementation. Rollback keeps
server cart data; reverting to the old frontend restores its shared-browser semantics
and does not provide isolation. Never copy an account cart into the old shared key as a
rollback shortcut.

## Implemented: quiet routine bag feedback

Storefront and Staff/Admin share one `CartFeedback` policy. Loading, saving,
**Bag saved.**, and **Your bag is up to date.** are polite screen-reader announcements
with no visible wrapper or reserved space. Merging progress, unconfirmed-edit recovery,
actionable failures/conflicts and retry controls, validation/storage warnings, legacy
decisions, and adjusted merge notices remain visible. Cart synchronization, ownership,
retry operations, storage, and API behavior are unchanged; no toast dependency was
added.

Focused `CartFeedback` coverage passed **8** tests (the four new tests failed before
the change). The frontend suite passed **226 tests in 44 files**, lint and build passed
with the existing main-chunk warning, and account-cart Chromium passed **11/11** in
1.6 minutes, including Staff workspace unavailable-merge, retry, and session-ownership
coverage.

## Release constraints

- Automatic merge applies to new guest carts; old unowned carts require confirmation.
- Conflicts reload server state and require an explicit retry; account editing while offline is deferred. There is no offline account-save queue.
- Edited checkout lines are preserved in full rather than subtracting purchased quantities.
- A pending guest merge is bound to its original account and remains recoverable only by that account. If storage is unavailable, only same-page recovery is promised.
- Release the additive backend migrations before the compatible frontend. Reverting a
  client version cannot restore account isolation and must retain server cart data;
  removing the new database tables requires an explicit preservation decision.
