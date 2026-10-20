# Shadcn component adoption implementation plan

> Execute the approved [specification](../../../specs/shadcn-component-adoption/SPEC.md) in this session, using independent workers for disjoint files and a final review. Existing uncommitted notification/search changes must be preserved. Branch: `feat/shadcn-storefront-admin`.

## Constraints

- Preserve existing GraphQL, permission, navigation, form, cart, payment, localization, theme, and asynchronous-search contracts.
- No bulk actions, new sorting/filtering, persistent column preferences, or replacement shell.
- Root owns dependencies, locale resources, Command/search files, execution record, and final integration. Workers do not edit these shared files.
- Characterize preserved behavior, test new behavior before implementation, then verify focused checks. No concurrent browser fixtures on ports 4100/4173; root runs browser checks after source/doc edits are frozen.
- No commits or pushes during concurrent edits; report changed files and exact verification evidence.

## Tasks and ownership

### 1. Shared presentation and navigation — worker presentation

- [x] Add reviewed shadcn-compatible `ui/empty.tsx`, `ui/item.tsx`, and `ui/breadcrumb.tsx`.
- [x] Integrate compact Empty/Item in notification quick/full inboxes, empty bag, and existing compact order summaries. Keep native list/link/action semantics and all read/mutation behavior.
- [x] Add breadcrumbs to `AdminLayout.tsx`, deriving hierarchy from `admin-navigation.ts` and preserving header fit, navigation permissions, and return-context Back links. Add focused navigation tests.
- [x] Own notification components, CartPage, account OrdersPage, DashboardShared, AdminLayout/admin-navigation and new presentation primitives. Do not edit catalog/forms/table/search files.
- [x] Export standard Empty/EmptyHeader/EmptyTitle/EmptyDescription/EmptyContent/EmptyMedia and Item/ItemContent/ItemTitle/ItemDescription/ItemMedia/ItemActions compositions so other workers can consume them.

### 2. Inputs, forms, and pagination — worker controls

- [x] Add reviewed `ui/input-group.tsx`, `ui/field.tsx`, and `ui/pagination.tsx`.
- [x] Compose Field within shared FormField; integrate remaining book, profile, auth, and delivery form controls without changing IDs, refs, validation, errors, or state.
- [x] Apply InputGroup to catalog/admin search and price/currency fields. Integrate Empty at catalog no-results using task 1's standard primitive API.
- [x] Compose Pagination for catalog and shared AdminPagination; keep URL/server state authoritative, preserve current page sizes and corrections, add bounded numeric links/current-page semantics.
- [x] Own FormField, CatalogSection/CatalogFilters, AdminFilterToolbar, AdminFeedback, book/profile/auth/delivery form files and new control primitives. Do not edit table list pages, notifications, search drawer, or global CSS/locales; communicate any required integration.
- [x] Export InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton for root SearchFinder integration.
- [x] Add focused validation/ref/pagination tests; characterize existing form behavior.

### 3. Admin Data Tables and confirmation — worker tables

- [x] Review TanStack Table manual pagination and shadcn Data Table composition.
- [x] Adapt AdminPageTable boundary and migrate Books/Orders/Users using typed local columns, stable IDs, manual pagination/filtering, server totals, and local column visibility. Keep identity/action columns visible and semantics/overflow contained.
- [x] Use task 1's Empty compositions inside correct table row/cell span; preserve errors/loading and role-gated cells/actions.
- [x] Add `ui/alert-dialog.tsx` and migrate ArchiveBookDialog: initially focus Cancel, prevent pending duplicate/dismissal, retain error recovery, restore focus safely after disappearing row.
- [x] Own AdminPageTable/new table helper, BooksPage/OrdersPage/UsersPage, ArchiveBookDialog, alert primitive and associated tests. Do not edit shared pagination/form/search/layout/locales/dependencies.
- [x] Add meaningful column visibility/pagination and confirmation pending/error/focus tests.

### 4. Command search and integration — root

- [x] Install only required `@tanstack/react-table` and `cmdk`; review current upstream source/API.
- [x] Add reviewed `ui/command.tsx` and integrate Command/CommandInput/List/Group/Item in both existing drawer shells with server filtering disabled locally.
- [x] Keep explicit empty selection; prevent cmdk default first selection from changing Enter-to-catalog. Preserve arrow/Tab/Escape/IME, stale-result guards, independent errors/retry, public/private destination rules and shortcuts.
- [x] Compose InputGroup within SearchFinder while keeping measured header/RTL/sidebar geometry and modal behavior.
- [x] Integrate Empty for search no-results; keep loading/error/eligibility states separate.
- [x] Add translations requested by workers for all four languages, scoped shared styling only where necessary, and tests for selection/race regressions.

### 5. Verify, review, document — root + reviewer + documentation worker

- [x] Run targeted unit checks during integration, then full unit suite, lint, build, and full browser regression.
- [x] Extend browser acceptance for columns/server pages, archive error/pending/focus, breadcrumbs/Back context, notification modified clicks, and Command search keyboard/async behavior.
- [x] Verify four languages, both themes, mobile/desktop, and native 200% zoom; inspect and save representative screenshots.
- [x] Obtain independent code/spec review, fix substantive findings, and rerun affected checks.
- [x] Delegate final spec reconciliation; review docs diff and record exact test evidence, dependency/bundle delta, and limitations.

## Execution record

- Branch renamed from `feat/compact-notification-popover` to `feat/shadcn-storefront-admin`; existing working changes preserved.
- All tasks completed. Independent review found no actionable issues. Final evidence is recorded in [the adoption verification record](../../../specs/shadcn-component-adoption/VERIFICATION.md).
