# The Quiet Shelf storefront — authentication specification

> **Status:** Implemented.

## Goal

Use Better Auth's React client to let customers create an account, sign in, and view their own order requests. Require sign-in before checkout while leaving browsing and the local cart public. The matching API contract is in [the backend auth spec](../../../backend/specs/authentication/SPEC.md).

## Current system

- This repository is a React, React Router, Apollo Client, Vite, shadcn/ui, React Hook Form, Zod, and Zustand storefront. Bun manages dependencies; Node.js runs tooling.
- Checkout uses the signed-in customer's account details and calls `createCheckout` with cart lines and a request key. Zustand owns the cart, persisted as a validated raw JSON array under `book-store-cart`. The API owns final prices, stock, order totals, and payment state.
- Checkout redirects to Stripe hosted Checkout for test payment; no shipping is collected and delivery is not integrated.

## Scope and routes

- Add `/sign-up` with name, email, and password; `/sign-in` with email and password; `/account/orders`; and owner-scoped `/account/orders/:id` for the signed-in customer's order requests.
- Use `createAuthClient` from `better-auth/react` for sign-up, sign-in, sign-out, and `useSession` for session restoration. Install `better-auth` in this repository for the client. Do not run a second Better Auth server in the frontend.
- Successful sign-up establishes a session immediately. Do not request email verification or show a verified-email claim. Defer verification, self-service password recovery, and other email flows, social login, and guest checkout. A signed-in person can change their own password from their profile. Admin UI, originally outside this account feature, is now delivered by [the admin feature](../admin/SPEC.md).
- Keep `/`, `/books/:id`, and `/cart` public. Guard `/checkout`, `/account/orders`, `/account/orders/:id`, and `/account/profile`; when signed out, redirect to `/sign-in` with an internal return path. After successful authentication, navigate to that path or `/`. Accept only internal `returnTo` paths.

## Customer experience

- The header shows **Sign in** when signed out and an **Account** menu with **Profile**, **Orders**, and **Sign out** when signed in. Profile opens `/account/profile`, specified in [the profile spec](../profile/SPEC.md). During session loading, do not show protected content or account-specific navigation.
- Use existing shadcn/ui primitives and React Hook Form with local Zod schemas for auth forms. Provide accessible labels, field errors, server errors, and submission state. Keep the wording clear that accounts are required for Stripe test payment and delivery is not integrated.
- The cart survives redirect to sign-in, page reload, and sign-out. Checkout shows the session name and email as read-only order contact details and sends cart lines with its generated request key.
- On confirmed payment, show the receipt and clear only the unchanged submitted cart. On authentication, validation, stock, provider, or network failure, keep the cart and show the error. If the session expires during checkout, route to sign-in and preserve the cart.
- `/account/orders` lists only the current customer's requests newest first, with ID, date, status, total, line items, and detail links. `/account/orders/:id` renders saved request details and a customer-safe timeline; missing/non-owned IDs share a not-found state. Provide loading, empty, error, retry, and pagination states.
- Signing out clears account-specific Apollo cache data and redirects to `/`; it does not erase the public cart.

## API integration and state ownership

- Use relative `/api/auth` and `/graphql` browser URLs by default. Proxy both paths through Vite in development and through the same storefront origin in deployment. Make the Vite API target configurable so normal development uses port 4000 and Playwright's isolated API uses port 4100. If a direct cross-origin API URL is configured, include credentials and use only the backend's allowed origin.
- **Breaking GraphQL change:** update `PlaceOrderInput` to `{ items: [OrderItemInput!]! }`, removing submitted name and email. Update `src/operations.graphql` and regenerate `src/generated/graphql.ts`; do not hand-edit generated types. Deploy with the matching backend change.
- Add operations for `myOrders(limit: 20, offset: 0)` with status-bearing entries and `myOrder(id)` with customer-safe history. The server, not the client, determines whose orders are returned; customer history omits workspace actor attribution.
- Better Auth's `useSession` owns frontend session state. Do not duplicate sessions in Zustand or persist credentials or session tokens in local storage.
- Zustand continues to own cart items and actions. Preserve the existing `book-store-cart` key and raw array format; derive count and estimated total from items.
- React Hook Form owns auth form state; Apollo owns catalog and account order query data. Clear account-specific cached data when the session ends so a later customer cannot see it.

## Files affected

- `src/lib/auth-client.ts`, `src/app/App.tsx`, `src/app/Layout.tsx`, new `src/features/auth/` and `src/features/account/` views, `src/features/checkout/pages/CheckoutPage.tsx`, `src/lib/graphql.ts`, `src/operations.graphql`, `src/generated/graphql.ts`, `vite.config.ts`, frontend tests, `SPEC.md`, `package.json`, and `bun.lock`.

## Acceptance criteria

- A new customer can sign up, sign in, refresh without losing the session, and sign out.
- Signed-out customers can browse and use the cart but cannot reach checkout or account orders. A sign-in redirect retains the cart and returns to the intended internal route.
- Checkout sends only book IDs and quantities. A successful request shows its receipt and appears in account history; a failed request retains the cart.
- Existing persisted carts remain readable across sign-in, reload, and sign-out. Credentials and tokens never enter the cart store or local storage.
- Account history never flashes another customer's cached data during session loading or after sign-out.
- Frontend tests, lint, and build pass. Playwright covers sign-up/sign-in, checkout redirect, authenticated order history, sign-out, cart retention, and direct unauthenticated API rejection.

## References

- [Better Auth installation](https://better-auth.com/docs/installation)
- [React client](https://better-auth.com/docs/concepts/client)
- [Cookies and same-origin deployment](https://better-auth.com/docs/concepts/cookies)
