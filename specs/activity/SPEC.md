# The Quiet Shelf storefront — activity history specification

> **Status:** Implemented. **Date:** 2026-10-05. It becomes available only after the coordinated backend migration and frontend deployment.

## Goal and agreed scope

Let Admin inspect Staff/Admin store changes and the history of an individual book.

Show who changed what and when, using the [backend activity contract](../../../backend/specs/activity/SPEC.md). Extend the existing [workspace roles](../staff/SPEC.md) without changing shopping or Staff permissions. Earlier changes remain unavailable because the backend does not backfill activity.

## Scope and exclusions

**In scope**

- Admin-only `/admin/activity`, with paginated events and actor/action/date filters, including order status changes.
- Admin-only `/admin/books/:id/history`, reached from a book's **History** link and using the same event display components.
- Expandable before/after details, price-change filtering, operator attribution, and clear empty/loading/error states.

**Out of scope**

- Staff/customer history access, activity write/delete controls, undo, export, notifications, user-history pages, and customer shopping analytics.
- A separate book-detail or staff app. Use a History link beside existing book actions; do not introduce a tab system solely for this feature.

## Current system and design constraints

- Reuse Apollo typed operations, shared admin tables/pagination/filters, shadcn/ui primitives, and existing access-provider error handling.
- Backend owns attribution, timestamps, differences, and logging. No frontend logging mutation or optimistic activity entry.
- Current permissions remain authoritative: only Admin can mount activity queries, including through direct URLs.

- Admin sees Staff, Admin, and operator events. Staff sees no Activity/History navigation or controls.
- Records are read-only and start at feature deployment. An empty history says **No activity recorded yet**, with explanatory text that earlier changes were not captured.

- The backend activity query/schema/migration and coordinated frontend code generation are delivered; existing Staff and Users features remain unchanged.

## Workspace routes and permissions

- [AdminLayout.tsx](../../src/features/admin/AdminLayout.tsx) places Activity under Store navigation, visible only to ADMIN.
- In [App.tsx](../../src/app/App.tsx), protect both new routes using the existing Admin-only nested guard. STAFF retains Books/Orders/Profile; denied activity URLs must not mount queries.
- [BooksPage.tsx](../../src/features/admin/pages/BooksPage.tsx) adds an Admin-only History link for each row while preserving existing Edit, Adjust stock, and archive actions. It works for active and archived books.
- `ActivityPage.tsx` and `BookHistoryPage.tsx` live in `src/features/admin/pages/`; shared event presentation lives in that feature's `components/`. They reuse [AdminPageTable](../../src/features/admin/components/AdminPageTable.tsx) and existing filter/header patterns.

## Activity page and filtering

- Each row shows time, actor name and recorded role (or **Operator command**), readable action, target snapshot name, and a details control. Display the recorded role, not the actor's current role. Order-status targets link to their workspace request detail; cancellation reasons and customer contact data are not displayed in Activity.
- Filter by user ID (labeled Actor user ID), action, and date range. A **Price changes only** control supplies `changedField: PRICE_CENTS`, including combined metadata/price edits. Avoid a new user-search API or actor picker in the first version.
- Store submitted filters and page in URL parameters: `actorUserId`, `action`, `changedField`, `from`, `to`, `page`. Submit filters deliberately, reset page when filters change, and preserve them while paging. Use existing five-item admin pagination.
- UI dates represent inclusive local calendar days. Convert the start day to its local midnight UTC instant and the end day to the next local midnight UTC instant; backend receives inclusive `from` and exclusive `to`. Reject reversed dates visibly. Display timestamps in the browser's local timezone and make the timezone clear.
- Use no-cache queries and existing feedback/retry behavior. If deletion/count changes invalidate the current page, follow existing last-page correction. Unknown enum/filter URL values fall back safely; malformed user-supplied date/ID values show validation feedback without sending a malformed request.

## Book history and event details

- Book history fixes `targetType: BOOK` and `targetId` from the route. Show newest events first, reuse pagination, and offer Back to books with a validated internal return location preserving list filters.
- The backend query can return history without a surviving target. Label it from recorded snapshots; an authorized unknown ID shows an empty history. Do not require a current-book lookup that could hide retained history.
- Expand changes as labeled previous/new values. Render descriptions as escaped text with wrapping and optional disclosure. Never render stored values as HTML.
- Format PRICE_CENTS with the existing money utility after validating its integer representation; render stock delta with its sign. Show role names, archive state, and order status as readable labels. Creation uses **Not previously set** for null before values.
- Password-reset events show only actor, target, action, and time; no password fields. Operator events do not imply that a specific named human ran the command.
- A combined metadata/price edit appears once with all changed fields. Links to targets are offered only for supported valid IDs; historical names stay visible even if the target no longer exists.

## API integration and access refresh

- [operations.graphql](../../src/operations.graphql) defines the typed `AdminActivity` operation and event fragment; [graphql.ts](../../src/generated/graphql.ts) was regenerated against the updated backend. Both pages use the same query contract.
- On Admin-to-Staff/Customer demotion, hide history and clear private data through existing access handling. Preserve guest sign-in returns, focus/route revalidation, sign-out, and retry behavior. A lost session or FORBIDDEN must not leave event details displayed.
- Refreshing history is read-only and safe to retry. Do not replay the originating business mutation after a logging/write error.

## Acceptance criteria

- [x] Admin sees both history routes; Staff/Customer cannot mount their queries and see no Activity/History controls.
- [x] Events show actor/source, role at action time, target, timestamp, and correct before/after values.
- [x] Filters, price-change selection, URL reloads, pagination, and book return navigation work without duplicating events.
- [x] Book history includes active/archived books and preserved snapshots; pre-feature/unknown history has an accurate empty state.
- [x] Self-demotion, remote demotion, session expiry, and sign-out remove private history.

- [x] Mobile navigation, keyboard controls, labels, disclosure state, focus, and long text remain usable without document overflow.
- [x] Stored text is escaped; sensitive credentials never appear. Failed business writes never produce invented success entries.
- [x] Codegen, unit/component tests, lint, build, and browser suite pass.

## Validation and release

**Browser and visual checks**

- The isolated browser journey assigns Staff, records a combined description/price edit plus stock adjustment, and verifies safe details, the price filter, reload, book history, and book-list return state.
- A 390px viewport check verifies the responsive menu and contained horizontal table scrolling without document overflow. Seeded pre-feature books show the accurate empty state.

**Automated tests**

- Unit/component tests cover labels, formatting, local-date conversion, filtering/pagination, return-location validation, and escaped content.
- Playwright covers Admin/Customer/Staff route privacy, a Staff edit visible once globally and in book history, an Admin order-status record with its request link, price filtering, mobile navigation, and active-session revocation. The full 32-journey Chromium suite passed against the isolated in-memory API.
- Backend tests cover CLI events, transaction rollback, and role/reset events; the frontend does not fabricate production history.

**Rollback / mitigation**

- Frontend rollback may hide history while the compatible backend continues recording. Preserve the backend table. Do not announce availability until the new backend and frontend are deployed together.

## Risks and open decisions

**Risks**

- **Risk:** Large descriptions make event rows unreadable — _Mitigation:_ compact summaries and expandable escaped values.
- **Risk:** Users mistake stored snapshots for current account data or complete past history — _Mitigation:_ label recorded roles/time and explain deployment-start coverage.

**Open decisions**

- None. Staff access to their own history and a dedicated book-detail tab system remain separate future decisions.
