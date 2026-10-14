# Catalog filtering, sorting, and continuity

**Status: Implemented**

## Search focus correction

**Status: Implemented** — The sidebar search input and submit icon share a complete
bordered row. Its inset focus indicator must remain visible within the sidebar's
scroll boundary in both themes; keyboard submission and search drafts are unchanged.
The shared input ring is suppressed for this row so keyboard focus has one unclipped
indicator rather than competing outlines.

## Catalog header exception

**Status: Implemented** — On `/books` (including query URLs and a trailing slash),
the storefront header scrolls normally. Other storefront routes retain a sticky
header. The desktop catalog sidebar remains sticky 24px from the viewport top,
with no reserved header space; anchor offsets use that same effective header height
of zero. Route changes remeasure the header state, so leaving the catalog restores the
sticky header.

- [x] Catalog query and trailing-slash URLs keep the storefront header in normal flow.
- [x] The desktop sidebar stays 24px from the viewport top with internal scrolling.
- [x] Leaving the catalog restores the sticky header on the homepage.

## Sidebar organization increment

**Status: Implemented**

On `/books`, remove the separate collection banner. At desktop widths (1024px+),
one 280px sticky sidebar owns the small **All books** heading, result range, search,
sorting, genre, stock, price controls, removable active filters, and **Clear all**.
The right column starts with the book grid and contains only loading/error/empty
states and pagination in addition to books. The catalog uses a zero effective header
height and retains internal scrolling. Search submission, immediate desktop sorting,
genre, and stock,
price validation, URL state, and detail-return behavior remain intact.

Below 1024px, show a compact title/count/search and **Filter & sort** trigger above
the grid. Sorting joins the drawer drafts and applies with the other filters only
on valid **Apply**; dismissal discards it. Active filters and clear-all stay with
the controls. No API, backend, dependency, or book-detail change is required.

- [x] All desktop browsing controls are in the sidebar; books start at its top.
- [x] Mobile sorting is drafted, discarded on dismissal, and applied with filters.
- [x] Both themes fit 320–1440px; sticky controls remain reachable on short screens.
- [x] Existing combined-filter, pagination, and detail-return journeys still pass.

## Purpose and scope

`/books` provides server-backed search, exact genre filtering, availability and price
filters, sorting, twelve-item pagination, and a return path from a book detail. This
specification is coordinated with the [backend catalog contract](../../../backend/specs/catalog-upgrade/SPEC.md).

The delivery changes no database schema, migration, dependency, authentication,
pricing, payment, or stock-reservation rule. It adds the documented GraphQL query
arguments. Generated covers remain illustrative UI; they are not uploaded assets or
new book metadata.

## URL state and API use

Applied catalog state is shareable through `/books` query parameters:

- `search` and `genre` are trimmed to 100 characters. Search remains a text search;
  genre is an exact API genre.
- `sort` is `default`, `title-asc`, `price-asc`, or `price-desc`; `inStock=1` selects
  positive stock.
- `minPrice` and `maxPrice` are inclusive integer cents from 0 through 1,000,000.
  They are expressed as major-unit drafts in the UI and converted exactly, with at
  most two fractional digits.
- `page` is zero-based and capped at `floor(2147483647 / 12) = 178956970`, so its
  request offset remains a GraphQL `Int`; it is not a general safe-integer promise.

Default and empty values are omitted. Invalid supported values are normalized with
history replacement: invalid price values are removed, and reversed valid price bounds
are both removed. Automatic normalization preserves unknown query parameters and the
hash. Catalog interactions and saved detail-return context write only supported
catalog parameters. Filter/sort/search changes reset to page zero; pagination retains
the applied state. A successful stale page is replaced with the last valid page; an
empty result uses page zero. Loading and errors do not correct the URL.

The frontend sends all applied state to the additive `books` operation. It neither
downloads the full catalog nor filters or sorts one page in the browser.

## Catalog controls and responsive layout

At 1024px and above, one 280px left sidebar contains the small **All books** heading,
the filtered total/range, search, **Sort by**, exact genre, **In stock only**, draft
Min/Max price fields with **Apply**, removable active filters, and **Clear all**.
Search submission and immediate sort, genre, and stock changes retain their existing
URL behavior; prices apply only after valid submission. The adjacent results column
starts directly with a two- or three-column book grid, followed only by its loading,
error, empty, and pagination states. The catalog header scrolls normally, so its
effective measured-header height is zero: the sidebar sticks 24px from the viewport
top, is bounded to the viewport minus 48px, and scrolls internally so all controls and
**Apply** remain reachable on short viewports. Catalog in-page anchors use the same
24px effective offset.

Below 1024px, a compact **All books** heading, count, search, and **Filter & sort**
trigger sit above the grid. The focus-managed drawer contains sort, genre, stock, and
price drafts; it applies them together only on valid **Apply**, which closes the drawer.
Dismissing the drawer discards all drafts, including sorting. Active filters and
**Clear all** stay with these controls. The filter badge counts genre, stock, and price
as three independent groups, with either price bound counting once. The grid is one
column below 375px and two columns from 375px where readable. Catalog top spacing is
24px below 640px and 32px at wider widths; the mobile drawer has no sticky-sidebar
behavior.

The controls use accessible errors for invalid price drafts, retain keyboard focus
through result updates, and keep visible focus and usable controls in both themes.

## Cards, bag feedback, and return context

Cards show generated cover art, linked title, author, genre, price, availability, and
existing cart controls. Positive stock says **In stock**; zero says **Sold out**.
Cards preserve the existing `min(10, stock)` bag limit and show **Maximum in bag** at
that limit.

**Added · View bag** is announced only after the card action produces a visible cart
quantity increase. It resets for a new attempt, rejection, a zero quantity, or a cart
owner change; pending or failed account-cart writes are never confirmation. The shared
card behavior is used by the homepage as well. At narrow cover widths the decorative
brand line is hidden and long cover text wraps/clamps; full title and author remain in
the card content, while the decorative author also has a title tooltip.

Book cover and title links save the normalized applied `/books` URL and scroll position
in navigation state. The detail **All books** link accepts only a local `/books` return
with supported parameters. Catalog history entries keep their own scroll positions;
restoration waits until a matching successful result layout is ready, clamps shorter
lists, and avoids the loading-layout overwrite race. Filter and page changes instead
move to the results region, which begins with the grid or its current loading,
error, or empty state.

## Homepage coordination and compatibility

Homepage genre tiles now live in `HomePage.tsx` and open exact `genre` URLs. Reading
moods do the same. **Explore an author** and header search stay text-search links.
Existing root catalog redirects retain their established behavior; legacy `search` and
`page` bookmarks keep their meanings.

## Delivered boundaries

- `src/features/books/catalog.ts` and `use-catalog.ts` own URL parsing,
  normalization, price drafts, and GraphQL variables.
- `CatalogSection.tsx` and `CatalogFilters.tsx` own catalog presentation and controls.
- `catalog-navigation.ts` and `BookPage.tsx` own validated return state and scroll
  restoration.
- `BookCard.tsx` and `BookCover.tsx` own shared card feedback and responsive cover
  presentation.
- `HomePage.tsx` and `ReadingDiscovery.tsx` create exact genre discovery links;
  `src/operations.graphql` and generated output carry the additive query.

## Acceptance and verification

- [x] Search, exact genre, stock, inclusive price bounds, and stable sorting combine
      before server pagination, with truthful total/range and stale-page correction.
- [x] URL normalization, share/reload, Back/Forward, root compatibility, drawer
      drafts, chips, clear-all, and price validation follow this contract.
- [x] The desktop sidebar owns catalog controls while its adjacent column starts with
      the grid; mobile drafts sorting with the other filters at the documented
      breakpoints, with keyboard and theme coverage.
- [x] Cards show availability and only confirm bag addition after a visible increase;
      return links and per-history scroll restoration preserve browsing continuity.
- [x] Homepage genre and mood links use exact genre; author discovery remains search.
- [x] Narrow generated-cover presentation remains readable without claiming all
      decorative cover text is untruncated.

Frontend code generation against an isolated API, lint, and the final production build
passed. The final affected catalog/homepage Chromium run passed **6/6** in 36.7 seconds;
the full isolated SQLite Chromium suite previously passed **64/64** in 5.2 minutes
before the final styling-only cover adjustment. The final build reports 987.29 kB
(284.92 kB gzip) for the main bundle, 73.17 kB (14.16 kB gzip) CSS, and the existing
main-bundle >500 kB warning; the Dashboard chunk is 385.87 kB (113.11 kB gzip).
Screenshots were inspected at
320, 375, 768, and 1440px in the covered themes, including the final 375px cover.

The wider frontend suite passed **226 tests in 44 files** after the unrelated
AuthEmailPages async navigation assertion was changed to wait for committed navigation.
That test-only change documents an observed async race; it does not alter catalog or
authentication behavior. No PostgreSQL browser full-suite or live Stripe validation is
claimed.

The compact-spacing/sidebar increment passed lint and build plus **2/2** affected
Chromium catalog journeys in 49.7 seconds. Its 1480×360 inspection confirmed internal
scrolling and keyboard access to **Apply**. The subsequent sticky-header coordination
passed **226 tests in 44 files**, lint, build with the existing main-chunk warning,
and **8/8** affected catalog/homepage/appearance journeys in 1.3 minutes. Live desktop
inspection confirmed the measured-header +24px sidebar gap. Existing tests cover the
behavior without adding CSS-mirroring tests.

The sidebar-organization increment passed **226 tests in 44 files**, lint, and build
with the existing main-chunk warning (988.03 kB / 285.15 kB gzip). Its final **2/2**
affected Chromium catalog journeys passed in 26.2 seconds. Inspected 320px Light,
375px Dark, and 1440px Dark layouts had no horizontal overflow; a 1440×360 desktop
check confirmed the keyboard-focused **Apply** control remains below the sticky header
and inside the viewport.

The catalog-header exception passed **226 tests in 44 files**, lint, and build with the
existing main-chunk warning (988.09 kB / 285.19 kB gzip). Its **7/7** affected catalog
and homepage Chromium journeys passed in 39.1 seconds, covering a catalog trailing
slash/query URL with the header scrolled away, the 24px sidebar position, and sticky
header restoration after navigation home.

The search-focus correction passed **226 tests in 44 files**, lint, and build with the
existing main-chunk warning (988.21 kB / 285.21 kB gzip). Its final **3/3** catalog
Chromium journeys passed in 27.7 seconds. Focused screenshots at 320, 375, 768, and
1440px in both themes, including inspected 320px Light and 1440px Dark layouts,
confirmed one complete, unclipped search-row focus indicator.

## Delivery and rollback

Deploy the compatible backend before the frontend. Roll back the frontend first; the
additive API remains compatible with older clients. Do not remove backend arguments
while a frontend may still send them.
