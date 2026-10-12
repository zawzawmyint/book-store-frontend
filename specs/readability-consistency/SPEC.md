# Frontend readability and consistency

**Status:** Implemented

**Date:** 2026-10-12

## Goal

Make workspace page state, navigation definitions, and search-hook inputs easier to understand and maintain while preserving the existing UI and behavior. This is a frontend refactor separate from the backend readability work.

## Scope

In scope:

- Shared pagination and URL-update mechanics in admin list pages.
- Navigation metadata used by the workspace sidebar and header.
- Named options for the workspace-search hook and its callers.
- Small page-local extractions where they clarify filter handling or rendering.
- Relevant tests and documentation updates.

Out of scope:

- Visual redesigns, new features, changed routes, or changed permissions.
- Storefront, account, cart, checkout, and payment refactoring.
- Backend changes, GraphQL operations or schema changes, and generated-file edits.
- Dependency upgrades, a generic CRUD framework, or broad component splitting.
- Reworking copied shadcn/ui primitives solely for stylistic consistency.

## Baseline observations

- Books, Orders, Users, Activity, and Book History repeat page-limit calculation and URL correction after query results arrive.
- Books and Users repeat URL parameter patching; Orders and Activity have related mechanics but different filter submission rules.
- [AdminLayout](../../src/features/admin/AdminLayout.tsx) defines sidebar links and separately selects header section labels from the pathname.
- [Workspace search](../../src/features/admin/search/use-workspace-search.ts) takes positional arguments, including a boolean whose meaning is unclear at the call site.
- Existing admin tables, feedback, toolbars, dialogs, and feature-local hooks already provide useful reusable boundaries. Keep them rather than introducing a replacement framework.

## Delivered implementation

- [use-admin-pagination.ts](../../src/features/admin/use-admin-pagination.ts) now owns URL parameter access, the five-item page limit, offset calculation, page changes, and result-driven correction. [admin-data.ts](../../src/features/admin/admin-data.ts) provides the merged parameter patching used by the pages that already preserve unrelated URL parameters.
- [BooksPage](../../src/features/admin/pages/BooksPage.tsx), [OrdersPage](../../src/features/admin/pages/OrdersPage.tsx), [UsersPage](../../src/features/admin/pages/UsersPage.tsx), [ActivityPage](../../src/features/admin/pages/ActivityPage.tsx), and [BookHistoryPage](../../src/features/admin/pages/BookHistoryPage.tsx) use the shared pagination mechanics. Activity still creates a fresh filter parameter set on form submission; its invalid-filter gate and Book History's book scope remain page-local.
- [admin-navigation.ts](../../src/features/admin/admin-navigation.ts) is the single source for sidebar entries, header labels, active-route matching, and Admin-only navigation metadata. [AdminLayout](../../src/features/admin/AdminLayout.tsx) keeps the established sidebar DOM, order, icons, collapse behavior, search behavior, and access boundaries.
- [use-workspace-search.ts](../../src/features/admin/search/use-workspace-search.ts) accepts named options. [WorkspaceSearchDialog](../../src/features/admin/components/WorkspaceSearchDialog.tsx) keeps Books' default eligibility and Orders' existing one-digit eligibility.
- Focused pagination and navigation tests cover URL preservation, invalid and out-of-range pages, correction gates, history replacement, distinct header/sidebar labels, active routes, and role visibility. Existing workspace-search tests retain stale-response and remount coverage.

The implementation preserves the existing workspace UI, routes, permissions, GraphQL operations, generated files, and dependencies.

## Implemented design

The following decisions were delivered without changing the workspace contract.

### Pagination and URL state

- Keep [admin-data.ts](../../src/features/admin/admin-data.ts) as the owner of `ADMIN_PAGE_SIZE` and `readPage`; preserve the page size of five and the current safe-offset validation.
- Use the feature-local [use-admin-pagination.ts](../../src/features/admin/use-admin-pagination.ts) hook for shared page reading, limit/offset derivation, page navigation, and result-driven page correction.
- Give correction a named input describing total, loading state, and whether the page permits correction. Avoid running it before data exists, while loading, or while Activity filters are invalid.
- Preserve the existing lower bound of one page for empty results. Correct out-of-range pages with router history replacement, not a new history entry, and avoid navigation loops.
- Extract a small URL patch helper into `admin-data.ts` only for pages that already merge changes into existing parameters. Preserve unrelated parameters and delete keys according to the existing page rules.
- Keep Activity's form submission behavior explicit: it creates a new filter parameter set after validation. Do not convert every page to the same merge strategy.
- Keep feature-specific filter parsing local. In particular, Orders currently trims its search text, while Books and Users retain their existing search handling; this refactor must not silently normalize them differently.

Affected pages:

- [BooksPage](../../src/features/admin/pages/BooksPage.tsx)
- [OrdersPage](../../src/features/admin/pages/OrdersPage.tsx)
- [UsersPage](../../src/features/admin/pages/UsersPage.tsx)
- [ActivityPage](../../src/features/admin/pages/ActivityPage.tsx)
- [BookHistoryPage](../../src/features/admin/pages/BookHistoryPage.tsx)

### Workspace navigation

- Keep navigation metadata and route matching in [admin-navigation.ts](../../src/features/admin/admin-navigation.ts).
- Distinguish sidebar group labels from header labels. Preserve `Sales` in the sidebar and `Orders` in the header rather than treating them as interchangeable.
- Preserve link order, titles, icons, active-route matching, and Admin-only Users/Activity visibility.
- Include Profile header matching without adding a Profile sidebar entry. Preserve the current fallback header label and exact dashboard route behavior.
- Keep authentication and permission enforcement in the existing access boundaries; navigation metadata must not become the authorization layer.
- Keep sidebar collapse, preference storage, mobile closing, keyboard shortcuts, and search remount behavior unchanged.

### Search-hook inputs

- `useWorkspaceSearch` accepts one named options object containing `query`, `term`, `onDenied`, and optional `allowSingleDigit` (default false).
- Preserve typed document inference, the 250 ms debounce, eligibility rules, retry behavior, fetch policy, and query deduplication setting.
- Preserve generation-based stale-response protection after typing, closing, and remounting. Do not expose data from an earlier term or session.
- Update [WorkspaceSearchDialog](../../src/features/admin/components/WorkspaceSearchDialog.tsx) and the existing hook tests together. Books keep the default eligibility rule; Orders opt into the existing single-digit rule.
- Preserve permission/session-loss handling and existing keyboard and focus behavior.

### Page readability

- Use clear names for filters, pagination, navigation definitions, and query state.
- Extract only cohesive repeated mechanics or substantial page-local sections. Leave simple table rows and short handlers inline where they are easier to read.
- Preserve existing loading/error transitions, filter labels, empty states, notices, mutation/refetch behavior, and dialog focus restoration.
- Do not replace feature-specific Apollo queries with a generic list-query abstraction.

## Delivered slices

1. **Pagination:** established behavior coverage, added shared pagination/URL helpers, and migrated the five scoped pages while preserving their filter rules and history behavior.
2. **Navigation:** consolidated metadata and verified header labels, active links, and role-specific visibility.
3. **Search inputs:** converted the hook and callers to named options while retaining race and access-loss coverage.
4. **Documentation:** reconciled project guidance and this spec after all acceptance criteria passed.

The final filenames follow the existing feature-local naming convention.

## Acceptance criteria

- [x] The five scoped list pages share pagination mechanics without changing page size, offset validation, or correction timing.
- [x] Filter changes, page resets, query parameters, browser history, and detail-page return links preserve existing behavior.
- [x] Activity filter errors still prevent requests and automatic page correction; Book History remains scoped to its book.
- [x] Sidebar and header metadata use one definition while preserving their distinct labels and role visibility.
- [x] Sidebar state, mobile navigation, focus behavior, and keyboard shortcuts remain unchanged.
- [x] Workspace search uses named options at every call site, with existing debounce, retry, race protection, and access-loss behavior preserved.
- [x] Existing shared components are reused; new abstractions serve current repeated behavior rather than speculative needs.
- [x] No UI redesign, backend change, route change, GraphQL/generated-file change, or dependency change is introduced.
- [x] Relevant automated checks pass and documentation reflects the verified result.

## Validation

This refactor preserved behavior. Existing coverage was run before and after each slice; focused characterization coverage was added for material pagination and navigation invariants. No failing test was manufactured for renames or signature-only changes.

- Pagination: retain Orders, Users, Activity, and related admin route/component coverage. Add focused coverage only where needed for empty totals, invalid/oversized page values, loading/correction gates, filter preservation, and history replacement. Exercise Books and Book History through existing admin/activity browser coverage where appropriate.
- Navigation: retain admin-route and sidebar coverage; verify nested routes, Profile's header label, Admin/Staff visibility, collapsed tooltips, and mobile behavior.
- Search: update `use-workspace-search.test.tsx` callers without removing race coverage. Run existing workspace-search E2E tests.
- Final frontend checks: `bun run test`, `bun run lint`, `bun run build`, and `bun run test:e2e`. Browser fixtures must remain isolated from development and production data.
- Inspect the diff for accidental UI, route, operation, generated-file, or dependency changes. No code generation or database migration is expected.
- Backend tests or PostgreSQL parity checks are needed only if implementation unexpectedly crosses the approved frontend boundary; resolve that scope change before editing backend code.
- Documentation checks included local-link validation and `git diff --check`.

## Verification record

- The final unit run passed 148 tests across 35 files; the focused pagination run passed 20 tests across 4 files, and the focused navigation, search, and route run passed 20 tests across 3 files.
- `bun run lint` and `bun run build` passed. The build retained the pre-existing main-bundle size warning.
- The final isolated browser run passed all 44 Playwright journeys. An earlier 43/44 run had one dashboard native Home-key failure; the affected journey then passed three focused repetitions and the complete 44/44 rerun without source changes.
- Independent review found no actionable issues. The final diff check passed.

## Risks and rollback

- Shared URL mechanics can erase filters or change history behavior: preserve each page's current merge/reset rules and verify browser navigation.
- A pagination effect can loop or use stale results: retain the current loading/data gates and replace history only when correction is necessary.
- Consolidated navigation can change labels or visibility: store sidebar groups and header labels explicitly and keep access guards independent.
- Hook signature changes can miss callers or alter request races: update callers together, run the build, and retain stale-response tests.
- If a slice regresses behavior, revert that slice without touching the independent backend refactor. No data migration or storage reset is required.
