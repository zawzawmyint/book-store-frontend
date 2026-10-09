# Workspace search — frontend specification

> **Status:** Implemented. **Date:** 2026-10-09.

## Goal

Give Staff and Admin one search entry point across Books and Orders, helping them open the correct record from any workspace page. See the [backend specification](../../../backend/specs/workspace-search/SPEC.md).

## Scope and entry points

- The shared `AdminLayout` header has a search trigger on permitted `/admin` pages. Desktop shows **Search workspace** with a shortcut hint; mobile uses an accessible search icon button.
- Ctrl+K on Windows/Linux or Cmd+K on macOS opens the dialog. Scope the listener to the workspace; do not intercept shortcuts while typing in inputs, textareas or editable content, or while another modal is open. Repeated shortcuts must not stack dialogs.
- First version searches Books and Orders for both roles. User-account search is deferred even for Admins. No storefront search, recent-search history, inline record mutations or new search-results route.

## Dialog and results

- Reuse the existing shadcn/Radix Dialog primitives and workspace styling. Build a feature-local search dialog and hook; use existing icons, book covers and order-status presentation where useful. A new command-menu dependency is not required.
- Accessible title: **Search workspace**. Input label: **Search books and orders**. Placeholder: **Book title, author, order number, customer name or email**.
- Opening focuses the input. Empty input shows guidance, not the full catalog/order list. Close or navigation clears the term/results; do not persist private searches to storage or put dialog terms in the current page URL.
- Start after 250ms without input changes when the trimmed term has at least two characters. An all-digit one-character term searches Orders only and announces the Orders result state. `#2` is also an exact-order term. Limit input to 100 characters; whitespace-only input sends no requests.
- Run separate Books and Orders operations so each group can have its own loading, empty, retry and error state. Each requests at most five results and total count. Keep the latest term visibly paired with its results; hide previous-term results as soon as the input changes.
- **Books:** active books matching title, author or genre; show title, author and stock, including a clear out-of-stock label. A result opens `/admin/books/:id/edit`.
- **Orders:** exact order ID or saved customer name/email; show order number, customer name/email and fulfillment status. A result opens `/admin/orders/:id`. Do not request addresses, phone numbers, financial totals or order history for this dialog.
- Use existing server ordering rather than adding relevance ranking. No client-side filtering of a previously downloaded complete list.
- Each nonempty group offers **View all matching books/orders**, with total count. Books opens `/admin/books?search=<encoded>&filter=ACTIVE`; Orders opens `/admin/orders?search=<encoded>&status=ALL`. Construct URLs with `URLSearchParams`, never concatenate unescaped input.

## Full-list integration

- Reuse the Books page's existing search/filter/pagination behavior.
- Add an order search field through `AdminFilterToolbar` and a `search` URL parameter on `OrdersPage`. Pass it to the additive `adminOrders(search)` argument.
- Changing search resets page; changing status retains search and resets page. Pagination preserves both. Clearing search restores the existing status-filtered list.
- Preserve supported list return paths when opening details, using existing safe internal-navigation conventions. Dialog selection closes the dialog before navigating; Escape returns focus to the opener or a safe header fallback when opened by shortcut.

## Keyboard and accessibility

- Trap focus inside the dialog and restore it on close. Escape dismisses it; opening/closing must preserve unsaved state in the underlying workspace page.
- Use a labeled combobox/listbox pattern for input/result navigation, with stable option IDs and `aria-activedescendant`. Arrow Down/Up moves across selectable record results; Enter activates the selected result. Do not hijack IME composition or submit a result before one is selected.
- Group headings and result text expose type, identity and state without relying on icons or color. Announce loading/result counts through a polite live region without reading every keystroke.
- View-all links and retry controls remain reachable by Tab. Respect reduced motion, both themes and the existing visible focus treatment. The dialog and results must fit a 390px viewport without horizontal scrolling.

## API, permissions and asynchronous state

- `WorkspaceSearchBooks` selects `adminBooks` total and `id/title/author/stock`; `WorkspaceSearchOrders` selects `adminOrders` total and `id/customerName/email/status/createdAt`. They use an explicit search, five-item limit, and zero offset.
- Requests are made only while the dialog is open, the input qualifies and workspace access permits it. Use no-cache server responses and a request generation/term guard; late responses cannot publish after a term change, close, sign-out or role/session change.
- Reuse `AdminAccessProvider` and access-error handling. `FORBIDDEN` or `UNAUTHENTICATED` must immediately discard results and trigger existing revalidation/expiry handling. A normal group error may retain the other successful current-term group and offer a scoped retry.
- Role/session transitions discard the dialog's private results. Do not treat client role checks as API authorization. No private search UI or data is mounted for Customers or guests.
- No API query may be initiated from the storefront shortcut listener; the search component belongs in `AdminLayout`.

## Files affected during implementation

- `src/features/admin/AdminLayout.tsx`, `src/features/admin/components/WorkspaceSearchDialog.tsx`, and `src/features/admin/search/use-workspace-search.ts`.
- `src/features/admin/pages/OrdersPage.tsx`. The existing
  `components/AdminFilterToolbar.tsx` and `pages/OrderPage.tsx` safe return-path
  handling are reused unchanged.
- `src/operations.graphql`, with `src/generated/graphql.ts` regenerated through codegen.
- Targeted hook/integration tests and `e2e/workspace-search.spec.ts`; root specs updated with verified delivery.

## Acceptance criteria

- [x] Staff/Admin can open search from any permitted workspace page by trigger or supported shortcut; it never opens in the storefront or over another dialog.
- [x] Books and Orders display bounded correctly grouped results, exact-ID and text matching, and working detail links.
- [x] View-all links preserve the search in the relevant list; order search/status/pagination work together.
- [x] Empty/short input sends no requests; debounce, rapid typing, close and role/session changes cannot show stale or unauthorized results.
- [x] Independent group errors, loading, no matches and scoped retry are clear and recoverable.
- [x] Keyboard selection, Escape, focus restoration, unsaved form preservation, mobile layout and both themes work.
- [x] API authorization, SQLite/PostgreSQL parity, codegen, relevant tests, lint,
  build, and the isolated SQLite/disposable PostgreSQL browser suites pass.

## Validation and rollout

Three hook tests cover qualification/debounce, late response handling, and reopen
deduplication. Four workspace-search Playwright journeys cover Staff entry,
shortcuts/selection, list drill-down, role access, mobile/theme behavior, and error
recovery. The complete 43-journey SQLite browser suite passed. Verification also
completed with 136 frontend tests across 33 files, code generation, lint, and build.
The desktop Admin and mobile Staff light/dark screenshots were inspected. No dedicated
screen-reader or IME session audit was recorded; the implemented guards and keyboard
browser coverage are narrower evidence.

The complete 43-journey browser suite also passed against the disposable PostgreSQL
fixture; the runner exited cleanly after awaiting cluster shutdown. The existing main
bundle warning is 931.73 kB and the lazy dashboard chunk is 385.87 kB. No dependency,
migration, production configuration, or data reset was added; the disposable
PostgreSQL fixture now initializes UTF-8 for provider parity. Publish the additive
API first, then frontend. Removing the header trigger/listener rolls back the dialog;
existing list routes remain valid.
