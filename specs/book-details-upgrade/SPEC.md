# 📖 Book Details Upgrade

> **Goal:** Help shoppers understand a book, choose a quantity, and add it confidently while preserving catalog browsing context.

---

## 🎯 Objective

**Status: Implemented.**

`/books/:id` is a compact shopping page. It keeps price, availability, and purchase
controls above the description, supports one confirmed multi-copy addition, and keeps
catalog discovery and return context available from related books.

---

## 📦 Scope

**In scope**

- Responsive cover and purchase summary; a separate **About this book** section.
- Quantity selection, stock/bag limits, pending state, confirmed addition, and recovery.
- Author/genre catalog links and up to four **More in this genre** book cards.
- Existing loading, retry, missing-book, themes, keyboard access, and catalog return.

**Out of scope**

- Uploaded covers, galleries, previews, reviews, wishlists, and edition metadata.
- Buy now, checkout changes, delivery promises, or a fixed mobile purchase bar.
- Backend/schema changes, migrations, new dependencies, and admin redesign.

---

## ⚙️ Assumptions & Constraints

**Technical**

- The change is frontend-only and reuses React, Apollo, Zustand, shadcn primitives,
  `BookCover`, and `BookCard`.
- The page uses the available `id`, `title`, `author`, `genre`, `description`,
  `priceCents`, and `stock` fields. Generated covers remain illustrative designs.
- Account-cart revision checks, recovery, owner isolation, guest storage locks, the
  20-line bag limit, and `min(10, stock)` per-book limit remain in force.
- Client addition is compatible with existing single-copy callers. Server prices,
  stock, and checkout totals remain authoritative.

**Product / Business**

- The Quiet Shelf typography and both themes remain in use. The page invents no
  ratings, discounts, urgency, edition facts, or fulfillment claims.
- Price is a unit price; a selected-quantity subtotal is explicitly exclusive of delivery.
- Book details retain the shared sticky storefront header; the catalog-only header
  exception remains intact.

**Dependencies**

- The existing [catalog contract](../catalog-upgrade/SPEC.md) and
  [account-cart contract](../account-carts/SPEC.md) remain authoritative.
- Existing `book(id)`, bounded `books(genre, limit, offset)`, and account-cart
  absolute-quantity operations are reused; no endpoint or schema changed.

---

## 🧩 Proposed Approach

**Delivered page layout and discovery**

- At 768px and wider, the cover and top-aligned purchase summary form two columns;
  below that width they stack. The title uses a responsive 2–3rem range and wraps.
  The validated catalog back link remains above the page.
- The summary orders linked genre, title, linked author, unit price, stock, quantity,
  Add to bag, and confirmation before **About this book**. The description preserves
  line breaks, wraps long text, and uses a truthful unavailable-description fallback.
- Genre opens a fresh exact `genre` catalog URL and author opens a fresh text `search`
  catalog URL. The bounded related query uses the nonempty genre with `limit: 5` and
  `offset: 0`; it excludes the current book and duplicates, then renders at most four
  existing cards. Related loading, error, or empty data never blocks the main page.
- Related detail links carry only validated catalog-return state. Direct detail visits
  use `/books`; browser Back keeps ordinary history behavior. A PUSH detail navigation
  scrolls to the top, while POP/catalog restoration is preserved.

The related books use the shared full-width editorial rail. Its first card aligns with
the page content; a responsive group and right-edge fade preview the next books. Arrows
advance one rail viewport, and touch/trackpad scrolling remains native. Autoplay loops
every six seconds, pauses for hover, focus, off-screen state, or a hidden document, and
is disabled for reduced motion. The rail has an accessible name and carousel role
description. No query, server, or dependency change.

**Delivered quantity and confirmation contract**

- **Quantity** defaults to one and offers integers through
  `max(0, min(10, stock) - inBag)`. It represents copies to add, while the existing
  bag quantity is shown separately. It clamps when capacity falls and resets on book
  or cart-owner changes.
- Zero stock reports **Sold out**; positive stock with no capacity reports
  **Maximum in bag**. The page shows **Adding…** and prevents duplicate submission
  while its addition is pending.
- `add(book, quantity = 1): Promise<boolean>` validates the integer and capacity at
  the action boundary. A guest writes one full increment inside the existing storage
  lock. An account sends one existing revision-aware absolute-quantity write with one
  request key. It resolves true only when the same owner visibly receives the full
  requested amount; rejection, adjustment, failure, or an owner change resolves false.
- **Added N to your bag** appears only after a true result, with **View bag**. New
  attempts, route/owner changes, and a missing line clear that confirmation. Existing
  catalog and homepage single-copy controls use the same contract.

**Components and contracts**

- [BookPage.tsx](../../src/features/books/pages/BookPage.tsx) composes the page,
  primary/related query states, discovery links, and detail scrolling.
- [cart-store.ts](../../src/features/cart/cart-store.ts) and
  [cart.ts](../../src/features/cart/cart.ts) own one validated quantity increment.
- [BookCard.tsx](../../src/features/books/components/BookCard.tsx) carries validated
  related-detail return context; [operations.graphql](../../src/operations.graphql)
  defines the bounded related query and generated documents were refreshed.
- [BookRail.tsx](../../src/features/books/components/BookRail.tsx) provides the shared
  accessible shelf, viewport-width paging controls, native scroll, and motion-aware
  autoplay used by this related-books section and the homepage shelf.

---

## 🚀 Execution Plan

1. **Quantity addition contract** — _(role: frontend)_ — delivered atomic guest and
   account quantity addition with owner, limit, recovery, and single-copy coverage.
2. **Purchase summary** — _(role: frontend)_ — delivered responsive composition,
   quantity controls, pending/confirmed feedback, and description recovery states.
3. **Discovery and continuity** — _(role: frontend)_ — delivered the bounded related
   query, discovery links, related-detail context, and scroll behavior.
4. **Verify and reconcile** — _(role: frontend)_ — completed focused tests, code
   generation, lint, build, browser journeys, and this documentation reconciliation.

---

## ✅ Acceptance Criteria

**Functional**

- [x] Purchase controls precede the full description in desktop and mobile layouts.
- [x] Selected quantity adds the requested increment once for guests and verified
      accounts, preserving existing items and cart persistence/recovery semantics.
- [x] Zero stock, stock below ten, the ten-copy cap, existing bag quantities, invalid
      quantities, and a full 20-line bag produce accurate controls and feedback.
- [x] Pending, failed, adjusted, or owner-switched attempts never announce full success.
- [x] Quantity/confirmation reset on book and owner changes; catalog and homepage
      single-copy additions remain correct.
- [x] Author and exact-genre links open fresh valid catalog URLs. Related cards exclude
      the current book, show at most four books, and preserve original catalog return.
- [x] Related books render in an accessible full-width rail, aligned with page content,
      with responsive card previews, viewport-width navigation, and touch scrolling.
- [x] Related loading/failure/empty states leave the main book usable. Missing books
      have a catalog recovery link; main query failures have an accessible retry.

**Non-functional** (performance, security, accessibility, reliability)

- [x] Both themes fit 320, 375, 768, and 1440px without horizontal overflow; long titles,
      author names, and descriptions remain readable.
- [x] Quantity and purchase controls have accessible names, visible focus, usable touch
      targets, polite status announcements, and keyboard submission.
- [x] Related requests are bounded and skipped until the primary book/genre exists;
      route-specific state prevents a stale shelf or confirmation.
- [x] Owner isolation, storage locking, revision/request-key recovery, and server
      authority are preserved; no schema, dependency, or migration changed.

---

## 🧪 Validation Plan

**Manual tests**

- Inspected 1440px in Light and Dark plus 320px Light and 375px Dark, including long
  title/author text and focused controls.
- Confirmed quantity, pending, confirmation, limits, and catalog → detail → related
  detail → catalog continuity in the isolated browser coverage.

**Automated tests**

- Focused cart, card, page, and new book-details browser coverage passed. The frontend
  unit suite passed **256 tests in 45 files**; code generation and lint passed.
- The production build passed with the existing >500 kB main-chunk warning
  (994.38 kB / 286.55 kB gzip; CSS 74.56 kB). A cold Chromium details/checkout run
  passed **10** journeys in 1.6 minutes.
- The final frozen-code Chromium suite passed **71/71** journeys in 6.1 minutes.

**Rollback / mitigation**

- Revert this frontend upgrade as a unit, including the addition contract and related
  operation. The existing backend schema and persisted bag envelope remain compatible;
  no data rollback is required.

---

## ⚠️ Risks & Open Questions

**Risks**

- **Risk:** Stock or bag state changes between selection and submission. —
  _Mitigation:_ revalidate at the action boundary, apply only an accepted cart result,
  and retain existing recovery feedback.
- **Risk:** A multi-copy addition repeats a write or crosses owners. —
  _Mitigation:_ use one locked guest edit or one revision-aware account write with
  owner validation and single-copy regressions.
- **Risk:** Related navigation loses catalog filters or shows stale data. —
  _Mitigation:_ retain validated return context and isolate book-specific state by ID.

**Open questions** _(blockers for implementation)_

- None. A fixed mobile purchase bar, covers, reviews, and extra metadata remain deferred.
