# The Quiet Shelf storefront — staff process specification

> **Status:** Implemented. **Date:** 2026-10-05.

## Goal and agreed scope

Allow STAFF to use the existing store workspace for books, prices, stock, order viewing, and the allowed order transitions while ADMIN alone manages users and archive/restore. Preserve the implemented [Users directory](../users/SPEC.md) and follow [the backend staff contract](../../../backend/specs/staff/SPEC.md). [Activity history](../activity/SPEC.md) is delivered separately: Staff changes are recorded, but Staff receives no Activity-history screens, filters, or controls. The detailed processing UX is in [the order workflow specification](../order-workflow/SPEC.md).

## Registration and role assignment flow

1. A person registers through the existing public signup and starts as CUSTOMER.
2. An ADMIN opens `/admin/users`, searches for that user, and selects **Change role**.
3. A confirmation dialog shows the current role, target role, and affected access. Options are Customer, Staff, Admin. Changing to the current role performs no unnecessary mutation.
4. Submit `setUserRole(userId, role)` and use its returned user plus a list refresh. No automatic retry after an uncertain network result: require a role/list refresh before another deliberate confirmation, preserving the existing uncertain-result pattern.
5. That same account gains or loses permissions on subsequent server requests and role refresh. No second login, account, invitation, or password creation flow is added.

For self-demotion show an explicit warning: becoming STAFF removes user management and archive/restore, while becoming CUSTOMER removes all workspace access. The backend permits demoting the final admin and offers operator recovery; do not claim the UI guarantees an admin remains.

## Workspace and navigation

- Keep `/admin` routes and existing shared layout/components; do not create a separate staff app.
- The storefront Account menu exposes **Admin** for ADMIN and **Staff workspace** for STAFF, each linking to `/admin`. Both continue to browse and buy as before.
- `/admin` opens the implemented [Dashboard](../dashboard/SPEC.md) for both privileged roles. Guests still use the existing internal sign-in return flow; CUSTOMER sees access denied.
- STAFF sees Dashboard, Books, Order requests, Profile/account actions, and Back to store. Hide the Users link and archive/restore actions. Staff-only branding should say **Staff workspace** rather than imply ADMIN privileges.
- STAFF may open `/admin`, `/admin/books`, `/admin/books/new`, `/admin/books/:id/edit`, `/admin/orders`, `/admin/orders/:id`, and `/admin/profile`.
- Staff can search/filter/paginate books, see archived items, add active books, edit metadata including price, and adjust stock. Keep current forms, bounds, confirmations, and mutation-error behavior. They cannot archive/restore, including on archived rows.
- ADMIN retains all current workspace routes plus role assignment. Users role labels and filters add Staff; replace Grant/Revoke controls with Change role. The frontend no longer calls Boolean access mutations.
- `/admin/users`, `/admin/users/:id`, and their legacy customer-route equivalents remain ADMIN-only. A STAFF direct URL shows access denied without mounting directory/detail queries or password-reset controls. It must not remove their access to Books and Orders.
- Profile actions remain own-account Better Auth operations; password resets for another user remain ADMIN-only.

## Client authorization and refresh behavior

Use the resolved role to derive the same fixed permission map as the backend. A workspace entry guard accepts STAFF/ADMIN; user routes use an additional MANAGE_USERS guard; both privileged roles receive PROCESS_ORDERS. Hide buttons using permission checks, while relying on server checks for real authorization.

Update `AdminAccessProvider`, `admin-access.ts`, and `RequireWorkspaceAccess` so FORBIDDEN from an admin-only operation does not automatically set a staff user's role to CUSTOMER. Revalidate viewer and show the permission denial. Confirmed CUSTOMER or a lost session hides workspace content; confirmed STAFF retains permitted workspace content. Clear private Apollo data on ADMIN-to-STAFF transitions as well as transitions to CUSTOMER, preventing stale user-management data from remaining visible. Preserve session-expiry handling, route/focus revalidation, and same-account form preservation where access remains allowed. After a self-role mutation, confirm the returned authoritative role in the provider, clear private Apollo data before navigation, and navigate to Books for STAFF or the storefront for CUSTOMER without refetching the old directory. If the subsequent viewer refresh fails, retain that confirmed role and expose retry rather than restoring stale private data.

## API integration and files

- `src/operations.graphql`: add typed SetUserRole operation with AdminUserFields; extend generated role/filter types by running bun run codegen against the updated backend. Remove the frontend SetUserAdminAccess operation and imports; backend compatibility fields remain available.
- `src/features/admin/pages/UsersPage.tsx`: Staff filters/labels and role-selection dialog with self-demotion and uncertain-result handling.
- `src/features/admin/AdminLayout.tsx`, access provider/guards, book pages, account menus, and storefront account navigation: permitted routes/actions and role-aware wording.
- `src/app/App.tsx`: nested user-management guard while retaining canonical and legacy routes. Keep LegacyUsersRedirect compatibility within that protected section.
- User detail/profile pages remain scoped to existing permissions. Cart persistence and saved contact/price snapshots remain unchanged; order status and history follow the delivered workflow specification.
- Extend component and browser tests; add STAFF fixtures only to the existing isolated e2e database. No production promotion endpoint is introduced by test helpers.

## Release and documentation

Coordinate backend migration/deployment and frontend deployment before assigning any STAFF users. The old client cannot safely represent all new roles. The backend spec defines backup and rollback constraints. No deployed endpoint or environment-variable change is otherwise required.

After verification update root SPEC, README, admin/users/profile/authentication docs as affected and mark this spec Implemented only when acceptance criteria pass. Existing Staff-free specs remain authoritative until delivery.

## Acceptance criteria

- [x] Signup still creates CUSTOMER; an ADMIN assigns STAFF through Users with clear confirmation and the same account can access permitted workspace pages.
- [x] Directory labels/filters support Customer, Staff, Admin; role controls use SetUserRole exclusively and refresh after success.
- [x] STAFF can create/edit books and prices, adjust stock, view orders, and use only their allowed order-processing controls.
- [x] STAFF sees no Users or archive/restore actions; direct canonical/legacy user URLs show denied access and issue no private user query.
- [x] A denied staff action leaves permitted workspace access usable; ADMIN-to-STAFF transitions hide and clear private user-management data.
- [x] Live-session demotion, self-demotion, sign-out, expired sessions, and uncertain mutation responses behave as specified.
- [x] Customer, Staff, and Admin retain shopping and own-profile capabilities; prior orders retain their saved prices and contacts.
- [x] Desktop/mobile navigation, keyboard/focus behavior, and role-dialog accessibility work for STAFF and ADMIN.
- [x] Staff receives no activity-history access or invitations. Activity recording is delivered separately without a Staff history UI.
- [x] Codegen, bun run test, bun run lint, bun run build, and bun run test:e2e pass.

## Validation and open decisions

The route, access-provider, Users page, and Playwright tests cover role selection, Staff navigation and permitted work, role-aware denial, live demotion, self-demotion, session expiry, uncertain mutations, mobile navigation, and existing customer journeys. The self-demotion regression confirms that the mutation result remains authoritative when the following viewer refresh fails and that private cache data is cleared before navigation. Frontend code generation, 45 unit/component tests using `bun run test -- --pool=threads --maxWorkers=2`, lint, and production build passed. The full 19-journey Chromium suite passed immediately before the final stale-viewer generation guard, and the four targeted role/session browser regressions passed after that guard. The production build retains its existing over-500 kB chunk advisory.

No production migration or deployment was performed. The separate Activity feature is implemented but its coordinated backend migration/frontend deployment remains operational follow-up; any expanded staff privileges require a separate specification.
