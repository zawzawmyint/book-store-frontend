# The Quiet Shelf storefront — administrative user directory naming specification

> **Status:** Implemented. **Date:** 2026-10-05.

## Goal and scope

Rename the administrative registered-account directory consistently to **Users**, across routes, components, GraphQL operations, variables, tests, and documentation. The implemented [Staff specification](../staff/SPEC.md) extends its roles to Customer, Staff, and Admin. Use [the backend specification](../../../backend/specs/users/SPEC.md) for naming and compatibility details.

Preserve directory functionality: list/search/filter/paginate users, view details, copy IDs, role changes, and another user's password reset. Staff permissions and role storage are delivered by [the Staff specification](../staff/SPEC.md).

## Canonical routes and components

- `/admin/users` is the directory; `/admin/users/:id` is its detail page.
- Rename `src/features/admin/pages/CustomersPage.tsx` to `UsersPage.tsx` and `CustomerPage.tsx` to `UserPage.tsx`, including exports, imports, and matching test filenames.
- Update `src/app/App.tsx` and `src/features/admin/AdminLayout.tsx`. Keep Users under People, with correct active navigation for list and detail on desktop and mobile.
- Use **Users**, **Search users**, **View user**, and user-specific password/access wording. Role labels and filters are **Customer**, **Staff**, **Admin**, and **All**. Retain personal **Account** menu labels and `/account/*` routes.
- Preserve the directory's page size of five, table columns, sorting, search submission, pagination correction, loading/error/empty states, copy feedback, confirmation behavior, self-demotion warning, and uncertain-mutation refresh flow.
- Preserve detail/profile behavior, password validation, own-account link to `/admin/profile`, and existing access guards. User routes are Admin-only; Customer, Staff, and Admin retain storefront access and shopping capability.

## URL compatibility

Retain `/admin/customers` and `/admin/customers/:id` as redirects to their user-named equivalents using history replacement. Preserve the ID and URL query string, including search, role, and page. Generated links and newly stored navigation state use canonical routes only.

Normalize recognized old customer-directory `returnTo` locations carried in navigation state to the equivalent user URL, retaining filters. Preserve the current internal-path validation; do not broaden accepted external destinations. Keep guest sign-in return flows and admin access checks working for old bookmarks as well as canonical routes.

## GraphQL and naming changes

In `src/operations.graphql` use:

- `AdminUserFields` on `AdminUser` instead of `AdminCustomerFields`.
- `AdminUsers` / `adminUsers` and the Staff-aware `AdminUserRoleFilter` instead of the customer-named directory contract.
- `AdminUser` / `adminUser` for detail lookup.
- `SetUserRole` / `setUserRole` and `ResetUserPassword` / `resetUserPassword` for management.

Rename related variables and component props from `customer(s)` to `user(s)` where they represent registered identities. Prefer `isSelf` for the own-account comparison to avoid ambiguity with session user data. Preserve genuinely customer-related order fields and storefront wording.

Regenerate `src/generated/graphql.ts` using `bun run codegen` against the matching backend. Do not hand-edit generated files or retain legacy operations in the canonical frontend. The frontend does not own the role-storage migration; it derives route/action visibility from the server-resolved role.

## Delivery and documentation

Deploy the additive backend first, then this frontend. Backend compatibility lets the previous frontend continue working and supports frontend rollback. Existing customer URLs remain usable after the rename; do not remove redirects as part of this delivery.

After verification, synchronize `SPEC.md`, `README.md`, and affected admin/profile/customer feature specs and links. Older customer-directory/detail specs remain historical terminology records. The Staff specification is authoritative for permissions and deployment.

## Acceptance criteria

- [x] Sidebar, list, detail, dialogs, accessibility labels, component names, operations, and tests consistently use User terminology for registered identities.
- [x] Both canonical routes work; legacy list/detail bookmarks redirect with history replacement and preserved IDs/filters.
- [x] Detail-to-list navigation retains search, role, and pagination, including recognized legacy return state.
- [x] Customer, Staff, and Admin rows remain visible according to filters, including the signed-in admin; permissions and shopping behavior are unchanged.
- [x] Guests return through sign-in; customers are denied private views; revocation and session changes hide private data as before.
- [x] Role changes and password reset preserve confirmations, validation, self-protection, and network-error behavior.
- [x] Generated types match the canonical backend; storefront account routes and order customer fields are unchanged.
- [x] Codegen, `bun run test`, `bun run lint`, `bun run build`, and `bun run test:e2e` pass.

## Validation and risks

The Users and User Page component tests, `LegacyUsersRedirect.test.tsx`, route tests, and `e2e/admin.spec.ts` cover canonical navigation, legacy list/detail redirects, filter and return-path preservation, role assignment, password reset/sign-in, authorization, and mobile navigation. Staff-specific validation is recorded in [the Staff specification](../staff/SPEC.md).

The key release risk remains deploying the frontend before the Staff-aware backend; deploy and migrate the backend first. Review remaining customer-named identifiers as intentional order terminology or compatibility URLs.
