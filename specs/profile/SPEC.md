# The Quiet Shelf storefront — account profile specification

> **Status:** Implemented. **Date:** 2026-10-04.

## Goal

Add `/account/profile` so a signed-in customer can see their account and update their own name and password. The API contract is in [the backend spec](../../../backend/specs/profile/SPEC.md).

The Staff or Admin Account menu opens `/admin/profile` inside the workspace. That page uses the same account actions for the signed-in privileged user. Only an admin resets another user's password through the detail page specified in [the staff roles spec](../staff/SPEC.md).

## Page

- Guard `/account/profile` like `/account/orders`. Guests go to sign-in with an internal return path. An expired session returns to sign-in and keeps the cart.
- Title the page **Your profile**. Show the session email and the account creation date as read-only text. Format the date with the storefront's existing date style.
- A name form starts with the current session name. Trim it and require 1–120 characters, matching sign-up. Save through Better Auth `update-user`, then refresh the session so the account menus and later checkout use the new name. Explain that earlier order requests keep the name they were placed with.
- A separate password form asks for the current password, a new password, and a confirmation. Require 8–128 characters, matching sign-up, and require the confirmation to match. Save through Better Auth `change-password` with other sessions revoked. Clear the password fields after success. Keep them when validation or the current password fails.
- Disable the submitting form while its request is pending. Show field errors and server errors. Announce success. Do not put the password in the page URL, local storage, or the cart.

## Navigation

- Add **Profile** to the storefront Account menu, before Orders.
- Add **Profile** to the admin Account menu, before Sign out. It opens `/admin/profile` inside the admin shell. The page shows the same email, join date, name form, and current-password form. The admin header continues to show the session name and email, and Back to store stays in the sidebar.
- Both links are available only after the session resolves. A customer who opens `/admin/profile` sees access denied.

## Acceptance criteria

- [x] A signed-in customer can open Profile from the storefront Account menu, change their name, and see that name in the menu and on the profile page.
- [x] A signed-in customer can change their password with the current password and cannot submit a mismatched or too-short new password.
- [x] Email stays read-only. Guests are sent to sign-in and returned to `/account/profile`.
- [x] A Staff or Admin user can open `/admin/profile` from the workspace Account menu and stay in the workspace. The Users page still has no edit-profile action.
- [x] Add component tests for validation, success, and the wrong current password. Extend Playwright for the storefront menu, a name change, and the admin menu link.
- [x] Run frontend `bun run test`, `bun run lint`, `bun run build`, and `bun run test:e2e`. Verify the page in the browser, including both menus, name save, and password validation.

## Verification evidence

Component tests cover empty and over-long name validation, a trimmed name save that refreshes the session, a too-short password, a mismatched confirmation, and a wrong current password that keeps the entered fields. The admin profile test covers the workspace page and a saved name. Playwright covers the guest redirect, a name change visible in the Account menu, password validation, the admin Account menu link to `/admin/profile`, and the absence of an edit-profile action on Customers. Frontend `bun run test` passes. Lint, production build, and the browser suite pass. The existing large-chunk build advisory remains.
