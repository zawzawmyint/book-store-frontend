# The Quiet Shelf storefront — admin customer details specification

> **Status:** Implemented. **Date:** 2026-10-04.

## Goal and agreed scope

Add `/admin/customers/:id` so a signed-in admin can read one registered account and set a new password for someone else. The API contract is in [the backend spec](../../../backend/specs/customer-details/SPEC.md).

`/account/profile` stays the storefront page where a customer changes their own name and password. An admin changes their own name and password on `/admin/profile`. This screen does not edit another customer's name or email, and it does not grant or revoke admin access. Those actions stay on the Customers list.

## Route and navigation

- Add `/admin/customers/:id` under the existing admin route guard. Guests go to sign-in with an internal return path. Customers see access denied and mount neither the detail query nor the password mutation.
- From each Customers row, add **View customer**. It opens that account and remembers the list URL, including search, role, and page, the same way order details remember their list. A back control returns there.
- Keep **Customers** active in the People group for both `/admin/customers` and `/admin/customers/:id`, in the desktop sidebar and the mobile navigation Sheet.
- Leave the storefront Account menu pointed at `/account/profile`. The admin Account menu opens `/admin/profile`.

## Details

- Load `adminCustomer` for the route id with a no-cache request. Title the page with the account name. Show email, role, join date, and user ID as read-only text. Role text is **Customer** or **Admin**. Format the join date with the store's existing date style.
- Provide the same **Copy user ID** behavior as the directory: announce success or failure, and leave the ID visible.
- Show loading, error/retry, and an unknown-account state consistent with the other admin pages. An unknown account shows the server message and no password form. A failed query shows no previous account after an identity change or `FORBIDDEN`.
- When the route id is the signed-in admin, show the details and no password form. Link to `/admin/profile` and say to change their own password there.

## Password reset

- For every other account, show a password form with **New password**, **Confirm new password**, and **Set password**. Explain that the new password replaces the current one and signs that person out of every session.
- Require 8–128 characters and a matching confirmation before calling the API. Use the same client rules and messages as the profile password form. Do not ask for the current password.
- Submit `resetCustomerPassword` with the new password only. Disable the form while the request is pending. On success, announce that the password was set, clear both fields, and stay on the page.
- On a validation or server error, keep the entered fields and show the error. Do not retry automatically. A later submit of the same password is allowed.
- Do not put the password in the page URL, local storage, the cart, or a success message.

## Acceptance criteria

- [x] An admin can open **View customer** from the directory, see that account's details, copy the user ID, and return to the same list filters.
- [x] An admin can set another account's password when the confirmation matches. A short password or a mismatched confirmation does not call the API.
- [x] Opening the signed-in admin shows details without a password form and links to `/admin/profile`.
- [x] Guests redirect to sign-in and return to the detail URL. Customers see access denied and mount no customer query or password mutation.
- [x] Add component tests for the other-account form, validation, a saved reset, a rejected reset, and the signed-in admin's own page. Extend Playwright so an admin opens a customer, sets a password, and that customer can sign in with the new password.
- [x] Run frontend `bun run test`, `bun run lint`, `bun run build`, and `bun run test:e2e`. Verify the detail page in the browser, including the directory link, own-account state, password validation, and a completed reset.

## Verification evidence

Component tests cover the detail fields, the remembered list URL, short and mismatched passwords, a saved reset that clears the fields, a rejected reset that keeps them, the signed-in admin's own page, and an unknown account. A customer route test confirms the detail page does not mount. Playwright covers the directory link, copy, the own-account profile link, password validation, a completed reset, sign-in with the new password, and guest and customer denial. Frontend `bun run test` passes 31 tests. Lint, production build, and the browser suite pass. The existing large-chunk build advisory remains.
