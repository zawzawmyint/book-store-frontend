# Storefront homepage and dedicated catalog

**Status: Implemented**

## Purpose

Give The Quiet Shelf a curated homepage for discovery while keeping the complete
catalog at `/books`. The homepage keeps the forest-green palette, warm surfaces, serif
headings, Light/Dark appearance, and existing shopping flows. Catalog controls and
their backend contract are specified in [the catalog upgrade](../catalog-upgrade/SPEC.md).

This specification describes the delivered frontend contract. The root
[storefront specification](../../SPEC.md) summarizes the public contract.

## Scope

- Curated homepage at `/` and a dedicated catalog at `/books`.
- Compact shared storefront navigation, dialog search, API-backed discovery, four
  selected books, an optional recommendation, and a short store note.
- Catalog search, exact genre discovery links, pagination, shared book cards,
  generated covers, account controls, cart feedback, and checkout behavior.
- Existing catalog-bookmark compatibility.
- The original homepage delivery introduced no backend schema, database migration,
  authentication, price, inventory, payment, dependency, or GraphQL-contract change.
- No real cover upload, reviews, wishlists, discounts, newsletter, CMS, or admin
  curation editor. Exact genre filtering and catalog controls are outside this
  homepage delivery and are covered by the catalog upgrade.

## Routes and compatibility

- `/` is a homepage without the catalog toolbar or pagination.
- `/books` is the full catalog. It preserves the trimmed `search` parameter, the
  zero-based `page` parameter, page reset, twelve-book page size, and loading, error,
  and empty states. Its page heading is **All books**.
- `/books/:id` retains existing detail and add-to-bag behavior.
- A root URL containing `search` or `page`, including an empty value, uses history
  replacement to reach `/books` while retaining its full query string and any hash
  except `#collection`. `/#collection` replaces history to `/books`; root catalog
  URLs remove that obsolete hash. Unrelated root parameters and hashes stay on `/`.
- The logo and workspace **Back to store** lead to `/`. All books, browsing-return,
  book-detail collection, and post-order shopping actions lead to `/books`.

## Homepage composition

### Header and navigation

The logo is the home link; there is no redundant visible **Home** control in the
desktop header. Desktop shows visible **All books**, then icon controls for search,
account/sign-in, bag, and appearance. The All books link is active at catalog and
book-detail routes.

The storefront header sticks at the viewport top while the small promotion strip
remains in normal flow, except on `/books` (including query and trailing-slash URLs),
where the header scrolls normally with the catalog. The shared height variable updates
after viewport, font, and route changes: the catalog uses an effective zero header
height and its own 24px sidebar/anchor offset, while the homepage and book-detail routes
retain measured sticky-header clearance. Search, account, and mobile-menu dialogs layer
above the header; Admin navigation is unchanged.

At 320px and other mobile widths, the compact two-line brand remains visible. Search,
account/sign-in, bag, and the menu remain directly accessible as icons. The menu dialog
contains **Home**, **All books**, and the existing Light/Dark switch. Desktop keeps the
Light/Dark icon control in the header. All controls retain their accessible labels,
focus behavior, and existing account and bag semantics.

The icon-triggered **Search the store** dialog is closed initially. Its search input
autofocuses when opened. Escape, the dialog close control, and a submission close the
dialog and restore focus to its trigger. A submission trims text and opens
`/books?search=…`; empty or whitespace-only text opens `/books`. It supports a
repeated search after navigation. This dialog is distinct from catalog-local
**Search books**, which retains catalog draft and browser-history behavior.

### Featured hero and genres

The homepage has one H1 in a short editorial banner. It contains static discovery copy,
a **Browse all books** action, and a **Browse genres** in-page anchor only when the API
supplies usable genres. When a selected book is available, the banner also shows one
current API-backed featured title and author with its generated cover and detail link.
It does not use a slideshow, overlapping-cover arrangement, or invented book fallback.

The genre section appears only when usable API genres exist. Each API genre is an
illustrated tile whose vector icon is decorative; its label opens
`/books?genre=<encoded genre>`. These links use the catalog's exact genre filter and
have no cart side effect.

### Selected shelf and discovery

**Selected for your shelf** displays up to four configured books in editorial order
inside an edge-to-edge horizontal rail. Its first card aligns with the page content.
Desktop shows about three cards and a preview; smaller screens show fewer cards with
the next card peeking in. Previous/next controls advance by one visible rail width,
touch/trackpad scrolling stays native, and a subtle fade marks more books at the right
edge. The rail loops automatically every six seconds, pausing while hovered, focused,
off screen, or the document is hidden; reduced-motion preferences disable autoplay.
Controls expose a named carousel region and remain keyboard accessible. No API or
dependency changes.
Cards use current API metadata, generated covers, stock state, and existing cart
behavior. Missing or archived selections are omitted; a sold-out selection remains
visible with its existing disabled purchase action. The section has a link to the full
catalog and keeps loading separate from a successful empty result.

**Find your reading mood** follows the shelf. Its editorial cards are available only
for API genres named Adventure, Fantasy, or Classic Fiction. Each available card is an
exact-genre catalog link; unavailable moods are omitted.

The existing editorial recommendation appears after the mood cards only when its
configured selected book and note are available. **Explore an author** follows that
recommendation and uses the first selected book with a non-blank current API author.
It shows that book's title, author, and generated cover, with a factual author
text-search link. It does not invent an author biography. Dynamic mood, recommendation,
and author content is omitted after failed or empty homepage data.

### Store introduction and footer

The shorter StoreNote gives a factual invitation to browse the selected titles and
links to `/books`. The shared footer retains working Home, All books, and existing
account destinations, plus the accurate Stripe test-payment disclosure. It does not
publish placeholder contact, policy, delivery, or returns links.

## Data and editorial ownership

The frontend owns a small ordered configuration of up to four unique entries shaped as
`{ bookId: string, editorialNote?: string }`. It currently selects IDs `1`, `2`, `4`,
and `8`; product metadata always comes from the API. The first available configuration
entry with an editorial note provides the recommendation. There is no database or
admin curation record.

The named `StorefrontHome` operation in `src/operations.graphql` makes one bounded
request: four existing `book(id: ID!)` lookups aliased for those selections plus
`genres`. It does not fetch or scan the complete catalog and requires no new schema or
query. Generated documents are updated through codegen rather than manually.

On a query error, the header, static hero, **Browse all books**, StoreNote, and footer
remain usable; dynamic data is replaced with an accessible retry state and partial
GraphQL data is not treated as a successful editorial selection. A successful result
with no selections shows an honest empty state and a catalog link, without fabricated
selected covers, recommendation, or author content. Genre tiles and mood cards remain
only when their corresponding API genres are available. Cart contents remain intact.

## Delivered code boundaries

- `src/app/Layout.tsx`, `src/app/components/StorefrontSearch.tsx`, and
  `src/app/components/StorefrontMenu.tsx` own the shared compact navigation, search
  dialog, and mobile navigation.
- `src/features/books/pages/HomePage.tsx`, `HomeHero.tsx`, `ReadingDiscovery.tsx`,
  `BookRecommendation.tsx`, and `StoreNote.tsx` compose homepage discovery.
- `src/features/books/components/BookRail.tsx` owns the shared accessible shelf rail,
  including viewport-width paging, native scroll, edge fade, and motion-aware autoplay;
  it is also used for related books on the detail page.
- `src/features/books/homepage.ts` owns editorial selection IDs and notes.
- `src/features/books/pages/CatalogPage.tsx`, existing catalog code, and existing
  shopping-return links retain catalog behavior and destinations.
- `src/operations.graphql` and generated documents define the bounded homepage query.
- `src/features/books/pages/HomePage.test.tsx`,
  `src/features/books/components/BookRail.test.tsx`, and `e2e/homepage.spec.ts` cover
  homepage behavior, rail interaction, and storefront regressions.

## Acceptance criteria

- [x] `/` provides the curated homepage without catalog toolbar or pagination, while
      `/books` retains full search, genre shortcuts, pagination, and direct reloads.
- [x] The logo replaces a redundant desktop Home link; desktop and 320px mobile
      navigation expose the documented navigation, icon controls, and theme controls.
- [x] Dialog search is initially closed, autofocuses, dismisses through Escape/close/
      submit with focus restoration, and handles trimmed, empty, and repeated searches.
- [x] The hero uses one available API-backed featured book and Browse genres only when
      genres exist; genre tiles use API genres and exact-genre links.
- [x] The shelf preserves configured order and handles missing/archived, sold-out, and
      no-result states honestly. Its full-width rail starts at the content edge, peeks
      at the next book, pages by visible width, and supports touch scroll and reduced
      motion. Mood and author discovery use only available API data.
- [x] Legacy root catalog URLs replace history correctly, while unrelated root query
      strings and hashes remain homepage URLs.
- [x] Homepage failures keep static navigation and cart state usable; no partial error
      data appears as editorial content.
- [x] No new backend schema, persistence, authentication, inventory, payment, or
      GraphQL contract is introduced.
- [x] Final targeted browser verification and visual inspection confirm the redesign;
      the full-suite infrastructure failure is recorded below.

## Validation and delivery

Focused component coverage in [HomePage.test.tsx](../../src/features/books/pages/HomePage.test.tsx)
exercises the bounded alias query and selection order, missing and sold-out selections,
loading/error/empty behavior, partial GraphQL errors, legacy URL replacement, unrelated
root URLs, available moods, and author discovery.

Affected Chromium coverage in [homepage.spec.ts](../../e2e/homepage.spec.ts) exercises
homepage discovery, bag behavior, detail and catalog navigation, search dialog focus
and submission, legacy URLs, 1440px/320px Light/Dark layouts, mobile navigation, moods,
and author search. The targeted homepage-plus-checkout rerun passed **8/8** journeys in
1.5 minutes, including the checkout address-edit journey that isolated the one full-suite
failure. Seven screenshots were inspected: homepage at 1440px and 320px in both themes,
the search dialog, mobile navigation, and the 320px dark catalog.

Frontend checks passed: `bun run test` (**205 tests across 40 files**), `bun run lint`,
and `bun run build`. The production build retained the existing >500 kB warning; its
main bundle was 975.73 kB (281.67 kB gzip). The full isolated SQLite Chromium suite
ended **61/62** in 5.6 minutes because the checkout address-edit journey's test-helper
payment POST (`/__test__/pay/12`) received `ECONNRESET`. The immediate targeted rerun
passed that exact journey, and no redesigned-component assertion failed. This is an
honest mixed full-suite record, not a claim that 62/62 passed.

No PostgreSQL browser run, hosted-payment validation, or real-cover-upload validation
is claimed for this frontend-only change.

The final sticky-header increment passed **226 tests in 44 files**, lint, build with
the existing bundle warning, and **8/8** affected Chromium journeys in 1.3 minutes.
Live desktop and 375px inspection confirmed the sticky header, dialog layering, Escape
behavior, restored homepage viewport, and the saved catalog-layout screenshot.

Rollback is frontend-only: deploy the preceding compatible frontend. If rolling back to
a version that lacks `/books`, hosting must redirect new `/books` bookmarks to `/` while
preserving query parameters.
