# Shadcn component adoption for storefront and admin

**Status: Implemented**  
**Date:** 2026-10-20  
**Branch:** `feat/shadcn-storefront-admin`  
**Verification:** [VERIFICATION.md](VERIFICATION.md)

## Goal

Use shadcn's existing component patterns to make storefront and admin screens more consistent, reduce repeated presentation code, and preserve The Quiet Shelf's visual identity and working behavior. This delivered update covers nine components: Empty, Item, Input Group, Breadcrumb, Field, Pagination, Alert Dialog, Data Table, and Command search.

## Current architecture

- The frontend uses copied UI primitives in [src/app/components/ui](../../src/app/components/ui), configured by [components.json](../../components.json), with Radix, Tailwind, Lucide, TanStack Table, and cmdk where the adopted components require them.
- Shared application components include [FormField](../../src/app/components/FormField.tsx), [SearchFinder](../../src/app/components/SearchFinder.tsx), and [AccountPreferences](../../src/app/components/AccountPreferences.tsx).
- Admin list pages use [AdminPageTable](../../src/features/admin/components/AdminPageTable.tsx), [AdminFeedback and AdminPagination](../../src/features/admin/components/AdminFeedback.tsx), and [use-admin-pagination](../../src/features/admin/use-admin-pagination.ts). GraphQL supplies filtered rows and totals.
- Search, notifications, and Account menus already have verified asynchronous, permission, focus, language, and appearance behavior. Their existing specifications remain authoritative for those contracts.

## Scope and constraints

**In scope**

- Add and integrate Empty, Item, Input Group, Breadcrumb, Field, Pagination, Alert Dialog, Data Table, and Command in the placements below.
- Refine spacing, density, visual hierarchy, control alignment, rows, menus, and empty states where it improves usability, as authorized during implementation. Keep changes cohesive across storefront and admin.
- Retain the bookstore's colors and typography identity, usable touch targets, visible focus, light/dark modes, and four languages: English, Arabic, Thai, and Simplified Chinese.
- Adapt relevant [shadcn Blocks](https://ui.shadcn.com/blocks) composition patterns within the existing shell. Retain the current Sidebar foundation and header controls.

**Out of scope**

- A new site theme, replacement dashboard, sidebar redesign, new navigation destinations, or installation of the entire component catalog.
- Backend/schema changes, GraphQL operation changes, payment/authentication changes, new bulk mutations, or new admin sorting/filtering capabilities.
- Persistent table preferences, row selection, column reordering, and virtualization. Existing server pagination remains sufficient.

**Technical constraints**

- Prefer Radix-compatible component variants to match the current stack. Review registry output before integrating; preserve tailored primitives and CSS rather than overwriting them wholesale.
- Only required dependencies were added. Data Table is a composition based on Table and TanStack Table, not a drop-in replacement package. The delivered additions are `@tanstack/react-table` 8.21.3 and `cmdk` 1.1.1; both were verified against the existing Radix/Tailwind stack.
- Application-owned translations belong in the existing locale namespaces. Keep persisted/API values canonical, locale-aware formatting intact, and mixed-script content isolated.
- No data migration or API compatibility transition is required.

## Delivered component behavior

### 1. Empty

Use [Empty](https://ui.shadcn.com/docs/components/empty) for the empty bag, notification inboxes/quick inboxes, catalog no-results state, search no-matches state, and empty Books/Orders/Users lists.

- Provide a concise title, optional supporting sentence, subtle decorative icon, and an existing useful action where appropriate: browse books, clear applied filters, or retry after an error.
- Keep quick-inbox and search variants compact; avoid a large illustrated card inside a small overlay.
- Distinguish loading, errors, short-input hints, zero matches, and truly empty collections. An error must retain its recovery control rather than become a successful empty state.
- Preserve table structure: an empty table remains a row/cell with the correct visible-column span.

### 2. Item

Use [Item](https://ui.shadcn.com/docs/components/item) to standardize compact notification rows and existing compact order-summary lists.

- Consistently align icon/media, title, supporting text, metadata, and trailing actions. Retain current information and density.
- Preserve notification destinations, unread indicators, event icons, test-payment/refund copy, modified-click behavior, and mark-read behavior.
- Avoid nested interactive elements. Keep a row's link and independent actions accessible. Do not replace Command option roles with generic Item roles.
- Keep the book grid and financial dashboard cards in their existing components.

### 3. Input Group

Use [Input Group](https://ui.shadcn.com/docs/components/input-group) for catalog/admin search controls, the search drawer input composition, price fields with currency context, and existing password-field actions.

- Give each group one consistent boundary and focus treatment; align icons, suffixes, and buttons without duplicate borders.
- Preserve labels, submit behavior, Enter/IME handling, numeric validation, units, autofill, and keyboard order. Decorative icons must not replace accessible labels.
- This adoption does not introduce new password actions or alter validation rules.

### 4. Breadcrumb

Use [Breadcrumb](https://ui.shadcn.com/docs/components/breadcrumb) in the admin header for existing route hierarchies, such as Books → Edit/History, Orders → order details, and Users → user details.

- Derive known paths and translated section labels from the existing navigation/route structure. Reuse already-loaded record identity when available; do not add requests just to label a breadcrumb.
- Parent links navigate to existing routes; the current page is non-interactive and exposes `aria-current="page"`.
- Preserve existing Back links and their filtered-list return context. Breadcrumb parents do not erase that separate behavior.
- Collapse/truncate gracefully on mobile and at zoom. Keep sidebar toggle, search, notifications, and Account usable without header overflow.

### 5. Field

Compose [Field](https://ui.shadcn.com/docs/components/field) within the existing shared FormField boundary, then apply it to book forms, storefront/admin profiles, authentication forms, and delivery details.

- Standardize label, description, control, and error placement while preserving field IDs, registration, refs, `aria-invalid`, and error-description associations.
- Keep current React Hook Form/Zod ownership, validation timing, localized feedback, disabled/pending states, and server error recovery.
- Preserve entered values, dirty state, and focus during language/theme changes. Keep page-specific fields local where they have different behavior; do not create a generic form engine.

### 6. Pagination

Use [Pagination](https://ui.shadcn.com/docs/components/pagination) for catalog pagination and the existing shared admin pagination presentation, including Activity and Book History consumers.

- Keep existing page sizes, count/range copy, total calculations, invalid/out-of-range correction, and previous/next boundaries.
- Retain URL-backed filters, sorting, browser history, and detail-return context. The server remains responsible for selecting the requested page.
- Expose the current page, accessible translated labels, and genuinely unavailable previous/next controls. Limit numeric links and use ellipses on large lists; keep narrow layouts compact.

### 7. Alert Dialog

Use [Alert Dialog](https://ui.shadcn.com/docs/components/alert-dialog) for the simple book archive/restore confirmation currently implemented by [ArchiveBookDialog](../../src/features/admin/components/ArchiveBookDialog.tsx).

- Show the book identity, existing consequences, Cancel, and the explicit archive/restore action. Initially focus Cancel.
- Send the existing mutation only on explicit confirmation. Prevent duplicate requests and dismissal while pending, preserve inline failure/retry, and close only after confirmed success.
- Restore focus to the opener, or a suitable fallback if that row disappears. Preserve catalog refresh and save feedback.
- Keep stock, role-change, fulfillment, and refund forms in their existing Dialog flow; this update does not remove their validation or recovery behavior.

### 8. Data Table

Adopt the [Data Table](https://ui.shadcn.com/docs/components/data-table) composition for admin Books, Orders, and Users. Adapt the existing AdminPageTable boundary and share only the table mechanics those three pages need.

- Define typed page-local columns and stable row IDs. Preserve existing cells, badges, formatting, links, row actions, loading/error/empty states, and role-based content.
- Add a translated Columns menu that lets users hide optional information columns. Keep each table's primary identity and action columns visible. Visibility is local to the mounted page; no persistence or query parameter is added.
- Use manual/server pagination and existing GraphQL filtering. Do not filter or sort just the fetched page, fetch all records, or treat the current page's row count as the server total.
- Keep the existing pagination hook as the URL owner; adapt its one-based page to the table's pagination state without competing state/effects or duplicate requests.
- Retain semantic table markup and contained horizontal scrolling on narrow screens. Activity, history, and small dashboard tables continue using the simpler existing table composition.

### 9. Command

Adopt [Command](https://ui.shadcn.com/docs/components/command) for result grouping, selection, and keyboard presentation inside the existing storefront/admin search drawers. Preserve SearchFinder as the geometry/overlay shell.

- Keep the corrected workspace drawer/header bounds, expanded/collapsed sidebar alignment, RTL placement, mobile fit, backdrop behavior, Escape closure, and trigger focus return.
- Preserve current API queries, eligibility rules, debounce, public five-book previews, workspace Books/Orders grouping, per-group error/retry, safe destinations, shortcuts, and permission/session guards.
- Disable automatic local filtering when displaying server-filtered results. Preserve returned ordering and numeric-order search eligibility. Prevent automatic selection from changing storefront Enter-without-selection catalog submission.
- Keep stale/old-term responses unselectable, discard closed-drawer results, reset active selection appropriately, and retain IME handling, loading announcements, and reachable all-results/retry controls.
- Adapt the component's focus/selection model where necessary to preserve these contracts. Do not add a second modal, a second search system, recent-search persistence, or extra network requests.

## Affected integration points

Delivered integration points include:

- [AdminLayout](../../src/features/admin/AdminLayout.tsx), [admin-navigation](../../src/features/admin/admin-navigation.ts), AdminPageTable, AdminFeedback, and Books/Orders/Users pages.
- [FormField](../../src/app/components/FormField.tsx), [CatalogSection](../../src/features/books/components/CatalogSection.tsx), [CartPage](../../src/features/cart/pages/CartPage.tsx), and the existing account/authentication/delivery forms.
- [NotificationList](../../src/features/notifications/NotificationList.tsx), [NotificationBell](../../src/features/notifications/NotificationBell.tsx), and [NotificationsPage](../../src/features/notifications/NotificationsPage.tsx).
- [StorefrontSearch](../../src/app/components/StorefrontSearch.tsx), [WorkspaceSearchDialog](../../src/features/admin/components/WorkspaceSearchDialog.tsx), and ArchiveBookDialog.
- Copied primitives `empty.tsx`, `item.tsx`, `input-group.tsx`, `breadcrumb.tsx`, `field.tsx`, `pagination.tsx`, `alert-dialog.tsx`, and `command.tsx` under `src/app/components/ui/`, existing locale resources, and scoped styles in [index.css](../../src/index.css). Data Table is composed in AdminPageTable rather than a separate primitive.

## Delivery order

1. Empty, Input Group, Breadcrumb: establish shared presentation and verify both shells.
2. Item, Field, Pagination, Alert Dialog: migrate existing consumers incrementally with their behavioral regression checks.
3. Data Table: migrate Books first, then Orders and Users; verify server paging and column visibility before proceeding.
4. Command: migrate storefront and workspace independently after keyboard/async characterization coverage is in place.
5. Reconcile affected canonical specifications and record final screenshots and verification evidence.

## Acceptance criteria

**Functional**

- [x] All nine components are integrated at the stated placements; installed-but-unused components do not count as delivery.
- [x] Empty/loading/error/short-input states remain distinct and expose appropriate existing actions.
- [x] Notification/order rows preserve content, links, independent actions, and read/mutation behavior.
- [x] Input and Field changes preserve submission, values, validation, autofill, and dirty-form behavior.
- [x] Breadcrumbs resolve existing routes, identify the current page, and preserve Back-link return behavior.
- [x] Catalog/admin pagination preserves server totals, page sizes, URL state, and out-of-range correction.
- [x] Archive/restore requires explicit confirmation, retains failures for recovery, and cannot duplicate a pending mutation.
- [x] Books/Orders/Users Data Tables preserve server filtering/pagination and permissions; optional-column visibility works without hiding identity/actions.
- [x] Command retains Enter/arrow/Escape/Tab/IME behavior, async isolation, grouped recovery, shortcuts, and safe navigation.
- [x] Workspace search stays aligned with the header in both directions and sidebar states, including after resizing.

**Non-functional**

- [x] Keyboard access, semantic roles, accessible names, focus restoration, and visible focus remain correct.
- [x] Both themes and all four locales fit 375px mobile, desktop, and native 200% zoom; table overflow is contained and page content does not overflow horizontally.
- [x] No new GraphQL operations, additional fetch loops, unauthorized private requests, or mutation changes are introduced.
- [x] Dependencies are limited to the adopted components; the production bundle delta is recorded in [VERIFICATION.md](VERIFICATION.md).
- [x] Required checks pass and affected specs are reconciled.

## Validation and rollback

- Before each behavioral migration, add focused failing acceptance coverage where the intended new behavior is missing; use characterization coverage for preserved behavior. Avoid tests that only mirror wrapper markup.
- Reuse existing unit coverage for pagination, forms, permissions, notifications, and search races. Add meaningful table-column, confirmation-pending/error, and Command selection regressions.
- Run affected checks, then `bun run test -- --maxWorkers=2`, `bun run lint`, and `bun run build`. Run the full `bun run test:e2e` because this update spans account, catalog, cart, and checkout presentation.
- Extend browser coverage for column visibility with server-page changes, breadcrumbs and contextual Back navigation, archive/restore failure and focus recovery, modified notification clicks, and both search drawers. Validate all languages/themes and native zoom; record precise coverage rather than implying unperformed checks.
- Capture storefront/admin before/after screenshots, including sidebar states, RTL, empty states, forms, tables, and search. Keep watched source/docs frozen during browser verification.
- Deliver in reversible component slices. Revert an affected slice to restore its previous presentation; no database rollback is needed. Keep previous behavior until each replacement's acceptance checks pass.

## Risks and decisions

- **Search behavior drift:** Command defaults can alter filtering, selection, and Enter behavior. Lock existing contracts with browser and async tests before migration.
- **Table state drift:** Keep URL pagination authoritative; do not introduce a second server-state owner or page-local filtering that misrepresents totals.
- **Async confirmation dismissal:** Control Alert Dialog closure and mutation lifecycle explicitly; library defaults must not discard failure recovery.
- **Registry mismatch:** Review Radix variants, Tailwind compatibility, RTL, dependency changes, and existing customizations before accepting generated source.
- **Scope growth:** Use Blocks as composition references. Richer table actions, new password controls, and unrelated dashboard layouts require separate specifications.
- **Delivered dependencies:** `@tanstack/react-table` 8.21.3 and `cmdk` 1.1.1 are the only added runtime dependencies. No unresolved component or product blocker remains.

## Related contracts

[Search/header](../search-and-header/SPEC.md), [workspace search](../workspace-search/SPEC.md), [compact notifications](../compact-notifications/SPEC.md), [localization](../localization/SPEC.md), [appearance](../appearance/SPEC.md), [authentication](../authentication/SPEC.md), and the existing catalog, delivery, and admin specifications retain their current business/data behavior. This specification owns the delivered component presentation changes.
