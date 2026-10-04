# The Quiet Shelf storefront — admin customer directory specification

> **Status:** Implemented. **Date:** 2026-10-03.

## Goal and agreed scope

Give store administrators a `/admin/customers` page in the existing admin workspace for viewing registered accounts and granting or revoking admin access. The page shows name, email, Customer or Admin role, join date, and user ID. The authoritative API contract is in [the backend spec](../../../backend/specs/customers/SPEC.md).

The page does not create accounts, edit names or emails, or reset passwords. Account name and password changes for the signed-in person live on the storefront profile. A detail page for reading one account and resetting another person's password is specified in [the customer details spec](../customer-details/SPEC.md). Those menus stay as they are for this feature.

## Current system and design choice

- Admin routes already use `AdminLayout`, `RequireAdmin`, `AdminPageHeader`, `AdminPageTable`, and `AdminFilterToolbar`. Books and order requests request five rows per page and keep filters in the URL.
- Access still comes from `viewer.role`. Customers never mount admin data queries. The operator command in [the admin spec](../../../backend/specs/admin/SPEC.md) remains available, and this page performs the same grant and revoke for a signed-in admin.
- Add the directory inside this application. Registered accounts are the only people listed; order-request contact snapshots stay on `/admin/orders`. Archive confirmation is the pattern for the membership dialog: explain the effect, require confirmation, and restore focus to the row action on cancel.

## Route and navigation

- Add `/admin/customers` under the existing admin route guard. This feature does not add a profile route. The account detail route is specified in [the customer details spec](../customer-details/SPEC.md).
- Add a **People** sidebar group with one link, **Customers**, pointing at `/admin/customers`. Keep Catalog → Books and Sales → Order requests. Highlight Customers for that path only.
- Show the new group in desktop navigation and in the mobile navigation Sheet. Closing, Escape, and focus restoration stay as they are. Back to store stays in the sidebar footer.
- Do not add the link on the storefront. Do not show Customers while access is unresolved, denied, or revoked.

## Listing

- Title the page **Customers**. Describe it as registered accounts. The page itself is where an admin grants and revokes access.
- Request `adminCustomers` with `limit` 5 and an offset derived from the `page` URL parameter, using `ADMIN_PAGE_SIZE` and `readPage`. Show the shared item range, total, and page controls.
- Columns are Name, Email, Role, Joined, and User ID. Role text is **Customer** or **Admin**, not color alone. Format `createdAt` in the store's existing date style. Render name, email, and user ID as text.
- Each row provides a keyboard-accessible **Copy user ID** control. On success, announce that the ID was copied. On failure, announce that the copy failed and leave the ID visible in the row. Copy does not call the API.
- Each row also provides one membership action: **Grant admin** when the role is Customer, or **Revoke admin** when the role is Admin. Do not offer create, edit, or delete actions. **View customer** is specified in [the customer details spec](../customer-details/SPEC.md).
- Provide loading, empty, error/retry, and pagination states consistent with Books and Order requests. An empty directory says no accounts match. A failed query offers retry and shows no previous account rows after an identity change or `FORBIDDEN`.
- If the current page is beyond the filtered total after a refetch, move to the last valid page the same way the catalog listing does.

## Search and role filter

- Reuse `AdminFilterToolbar`. Search label **Search customers**, placeholder covering name or email, 100-character limit, trim on submit, and Enter to submit. The backend performs the match; do not filter only the current page locally.
- Add a role selector with **All**, **Customers**, and **Admins**, defaulting to All. Map them to the API values `ALL`, `CUSTOMER`, and `ADMIN`.
- Store applied `search`, `role`, and `page` in the URL. Validate a missing or unknown role as All and a malformed page as page 1. Reset to page 1 when search or role changes. Preserve the URL when returning to the page.

## Grant and revoke

- Require confirmation before either action. Grant explains that the account can open the admin workspace and still shop as a customer. Revoke explains that admin access ends on the next request and that the customer account and existing order requests remain.
- When the target user ID is the signed-in admin, the revoke dialog says this will remove the current admin's own access. Confirming is allowed. After the mutation succeeds, the existing revocation handling hides the directory and shows access denied. Do not offer a way to undo that from the storefront.
- Disable the confirming action while the mutation is pending. Keep the dialog values if validation fails. On success, close the dialog, announce the new role, and refetch the directory so the row and filters update. If that refetch leaves the current page empty, move to the last valid page.
- On an ambiguous network failure, say the result is unknown and require a refresh before another confirmation. Do not retry the mutation automatically. Grant and revoke are idempotent on the server, but the page must not guess which one completed.
- An unknown-user error refreshes the list and shows the server message. A `FORBIDDEN` or `UNAUTHENTICATED` response follows the existing admin access handling and discards the open dialog.

## API integration and privacy

- Add typed `adminCustomers` and `setCustomerAdminAccess` operations to `src/operations.graphql` and regenerate `src/generated/graphql.ts` against the matching backend. Do not hand-edit generated code.
- Query the directory only inside the authorized admin route, with the same no-cache and access-revocation behavior as other admin queries. On `FORBIDDEN`, hide the table and show access denied. On `UNAUTHENTICATED`, clear private data and redirect to sign-in.
- Never persist customer names, emails, or user IDs in local storage or the cart store. Apollo cache clearing on session change applies to this query too.

## Implementation locations

- `src/features/admin/`: customers page, route registration in `src/app/App.tsx`, and the People group in `AdminLayout`.
- Shared admin table, header, toolbar, pagination, and access guard stay shared. Do not fork them for this page.
- Component tests for URL filters, empty and error states, copy behavior, and grant/revoke confirmation. A Playwright journey for an authorized admin listing, granting, revoking, and for customer access denial. The e2e fixture may seed accounts only in its isolated test database.

## Acceptance criteria and validation

- [x] Authorized admins open `/admin/customers` from the People group on desktop and from the mobile Sheet. The link highlights on that route and the Sheet still closes and restores focus.
- [x] The table shows name, email, Customer or Admin, join date, and user ID for the current page of five, including the signed-in admin when that account is in the result.
- [x] Search and role filters submit to the API, reset pagination, survive refresh through the URL, and reject over-long search input locally at 100 characters.
- [x] Copy user ID announces success or failure and does not change membership. Grant and revoke require confirmation, update the row role after success, and offer no create, edit, delete, or profile action.
- [x] Revoking the signed-in admin shows the self-revoke warning and then the existing access-denied screen. Cancelling either dialog leaves membership unchanged and restores focus to the row action.
- [x] Guests redirect to sign-in and return to `/admin/customers`. Customers see access denied and mount no customer-directory query or mutation. Sign-out and account switching hide cached rows.
- [x] Loading, empty, error/retry, partial last pages, and narrow-width contained table scrolling match the other admin lists. Keyboard users can reach search, the role selector, pagination, copy, and the membership dialog.
- [x] Before implementation, add focused failing component tests for filters, access denial, copy, and grant/revoke confirmation. Extend Playwright so an admin can view, grant, and revoke, and a customer cannot.
- [x] Run frontend `bun run test`, `bun run lint`, `bun run build`, and `bun run test:e2e` against the updated backend. Verify the page in the browser at desktop width and at 390px, including search, role filter, pagination, copy, grant, and revoke.

## Decisions

The screen is a customer directory of registered accounts, placed under People, with search plus an All/Customers/Admins filter. Signed-in admins grant and revoke membership from each row after confirmation. This page does not edit account details.

## Verification evidence

Component tests cover URL filters, the empty directory, copy success and failure, grant confirmation, a rejected change, self-revoke warning, and an uncertain result that is not retried until the list is refreshed. A customer route test confirms the directory does not mount. Playwright covers listing, five-item pagination, search, the admin role filter, copy, grant, revoke, guest redirect, customer denial, mobile navigation, and self-revoke. Frontend `bun run test` passes 22 tests. Lint, production build, and the browser suite pass. The existing large-chunk build advisory remains.
