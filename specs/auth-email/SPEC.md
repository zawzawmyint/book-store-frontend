# 🧭 Auth email verification and recovery — storefront

> **Goal:** Give customers a clear verification and password-recovery journey while preserving their cart and intended destination.

**Status:** Implemented

**Date:** 2026-10-12

---

## 🎯 Objective

Signup now routes to verification without a usable session, and check-email, verification-result, forgot-password, and reset-password experiences use Better Auth's existing client and the matching [backend contract](../../../backend/specs/auth-email/SPEC.md).

---

## 📦 Scope

**In scope**

- Update signup/sign-in for required email verification; add resend and password-recovery pages.
- Preserve the cart and safe internal return paths across email links, reloads, and authentication.
- Handle existing unverified sessions, existing customers, and verified local demo accounts.
- Accessible loading, errors, expiry, resend cooldowns, and isolated browser tests.

**Out of scope**

- SMTP credentials/sending in the browser, Redis, new auth libraries, OTP input, social login, MFA, email-address changes, or order-notification UI.
- Checkout redesign, changes to payment retries, cart storage, order ownership, or workspace permissions.

---

## ⚙️ Assumptions & Constraints

**Technical**

- Reuse [auth-client.ts](../../src/lib/auth-client.ts), React Hook Form/Zod, existing controls, and [safe return-path helpers](../../src/features/auth/return-to.ts).
- Backend requires verification before sign-in, creates no automatic signup/verification session, and revokes sessions after password reset. Fresh sign-in follows successful verification or reset.
- Verification/reset links expire after **3600 seconds**. Backend owns expiry and reset-token consumption; UI never verifies a token locally.
- No GraphQL operation/schema change is expected. Auth calls stay under the existing same-origin `/api/auth` proxy.
- Keep public browsing/cart available. Preserve guest-cart compatibility and existing checkout-attempt safety; the coordinated [account-carts specification](../account-carts/SPEC.md) keeps verified account bags server-owned and hides them when the active session becomes unusable.

**Product / Business**

- Resend and recovery use neutral messages; do not confirm whether an email is registered or promise inbox delivery merely because a request was accepted.
- Existing real accounts follow the same verification requirement, including Staff/Admin. Demo accounts are verified fixtures only in development/test.
- Development mail is viewed in Ethereal; automated tests use a captured inbox. Production uses the backend's configured SMTP provider.

**Dependencies**

- The [backend spec](../../../backend/specs/auth-email/SPEC.md) supplies all auth/token, rate-limit, mail-delivery, and rollout rules. No frontend provider SDK is needed.

---

## 🧩 Delivered behavior

- **Existing signup/sign-in:** update [AuthPage](../../src/features/auth/pages/AuthPage.tsx). Signup success opens a check-email screen rather than checkout. Unverified sign-in offers verification/resend guidance; ordinary wrong credentials stay generic. Both handle rejected network requests and restore pending controls on failure.
- **Routes:** `/check-email`, `/verification-result`, `/forgot-password`, and `/reset-password` are feature-local pages registered in [App.tsx](../../src/app/App.tsx) and synchronized with backend callbacks.
- **Check-email:** show instructions, a labeled email input for resend, sign-in link, and a **60-second** resend cooldown after an accepted resend. Server 429 responses enforce the actual limit; respect retry timing when supplied. Do not put the email address in the URL, durable local storage, or analytics. Reload must still offer an editable email field rather than depending on navigation state.
- **Verification-result:** backend verifies the token and redirects to this fixed route. Without an error, render neutral continuation copy and direct the customer to sign in, where the backend checks verification; do not infer success locally or mount protected content. An invalid/error result offers resend. Replayed links have a safe outcome without revoking a later verified session.
- **Forgot-password:** accessible email form calls `requestPasswordReset`. Show the same accepted-request copy for registered and unknown addresses; handle transport/rate-limit failures without exposing existence. Offer return to sign-in.
- **Reset-password:** backend callback supplies the token to this route. Collect new password plus confirmation, matching existing **8–128 character** limits. Use `resetPassword`; success removes token from the current URL and offers fresh sign-in. Invalid, expired, or already-used links offer a new request. Never log tokens, retain them in local storage, or send them to third-party analytics.
- **Return navigation:** carry only sanitized internal `returnTo` values through the fixed callbacks. Preserve checkout destination where known; direct links without a valid destination fall back to `/`. Reset does not auto-login. A link opened on another device does not transfer cart contents; the existing device-local cart is preserved.
- **Protected access:** [RequireSession](../../src/features/auth/RequireSession.tsx), [RequireWorkspaceAccess](../../src/features/admin/RequireWorkspaceAccess.tsx), and associated access/cache handling must block unverified/stale sessions without flashing private content. Backend enforcement remains authoritative. Do not redirect an unverified session straight back to a protected destination through AuthPage's current session shortcut.
- **Existing users/demo:** expose resend for old unverified accounts and retain account/order IDs and roles. Keep local demo entry points working with backend-verified fixtures; do not add a role/email-domain verification bypass. Existing signed-in users may be redirected to sign-in/check-email during rollout.
- **Shared UI:** use current PageContainer, FormField, alerts, buttons, and feature-local auth helpers. Extract repeated form feedback only if there is a concrete need; no broad page framework.

Flow: **signup → check email → backend verification → sign in → safe destination**. Recovery: **forgot password → email link → set password → sign in**.

---

## 🚀 Delivered implementation

1. **Verification UI and guards** — _(role: frontend)_ — write failing tests for signup navigation, unverified sessions, callback results, and safe cart-preserving returns; implement pages and resend.
2. **Recovery UI** — _(role: frontend)_ — test neutral requests, password confirmation, expiry/reuse and network failures; implement forgot/reset pages without storing tokens.
3. **Connected journeys** — _(role: fullstack)_ — adapt existing synthetic-account fixtures, cover complete verification/recovery through captured mail, and retain checkout/workspace/demo behavior.
4. **Verification and reconciliation** — _(role: frontend)_ — complete required checks, both-provider connected coverage, and documentation updates before marking Implemented.

---

## ✅ Acceptance Criteria

**Functional**

- [x] Signup routes to check-email without authenticated checkout/account access.
- [x] Verification success leads to fresh sign-in; expired/invalid links offer resend and never authorize access locally.
- [x] Resend is editable after direct navigation/reload, shows a cooldown, respects server limits, and uses neutral accepted-request copy.
- [x] Forgot/reset pages handle unknown addresses, matching password validation, expired/invalid/reused tokens, and successful fresh sign-in.
- [x] Cart and valid return destinations survive the flow; unsafe return paths are rejected and account-specific cache remains isolated.
- [x] Existing unverified users have a recovery path; real Staff/Admin remain subject to verification and role checks; local demos remain usable.
- [x] Pending/network-error paths restore usable controls and prevent duplicate submissions.

**Non-functional** (performance, security, accessibility, reliability)

- [x] Keyboard, labels, field-error associations, focus, mobile layout, and both themes remain usable on all new pages.
- [x] SMTP secrets and email delivery stay backend-only; token URLs and email addresses are not logged or durably stored in the frontend.
- [x] No payment, ownership, cart-format, GraphQL, or permission regression is introduced.
- [x] Required checks pass and the documented flow matches delivered routes/backend behavior.

---

## 🧪 Validation Plan

**Manual tests**

- With Ethereal configured separately, follow verification/reset links, resend after expiry, refresh check-email, test safe return paths, and compare desktop/mobile keyboard behavior. Confirm no cart loss or private-content flash.

**Automated tests**

- Follow **failing behavior test → implementation → green refactor**. Extend [AuthPage tests](../../src/features/auth/pages/AuthPage.test.tsx), route/access tests, and return-path coverage; add focused tests for new form/result behavior without mocking token validity as a substitute for backend coverage.
- [e2e/auth-email.spec.ts](../../e2e/auth-email.spec.ts) uses the [isolated server](../../e2e/server.ts) and test-only captured mail to cover signup→verification→sign-in→checkout, existing-user resend, unknown recovery request, reset→old-password rejection→new-password sign-in, expired/reused links, session revocation, and cart retention.
- Update existing [checkout](../../e2e/checkout.spec.ts), [demo-login](../../e2e/demo-login.spec.ts), and account/workspace fixtures for verified synthetic users. No automated test sends real emails. Captured-inbox endpoints are test-only.
- Run `bun run test`, `bun run lint`, `bun run build`, full `bun run test:e2e`, and coordinate backend PostgreSQL parity/browser runs. Regenerate GraphQL only if an explicitly reviewed contract change becomes necessary.

**Rollback / mitigation**

- Coordinate with backend enforcement: never release a UI that assumes unverified signup creates a session while verification is required. Preserve carts/account data during rollback; already-revoked sessions need fresh sign-in.

## Verification evidence

On 2026-10-12, 176 frontend tests across 37 files, lint, build, and code generation passed (the existing bundle-size advisory remains). The latest full SQLite run passed all 47 Playwright journeys. The earlier full PostgreSQL auth-email run passed 46 journeys; the new focused real-verification-status browser journey also passed against PostgreSQL. Its responsive check covers all four new routes at 390×844 in Light and Dark modes with visible headings/labels and no horizontal overflow, plus keyboard Tab/Enter resend/recovery and reset-field focus. The isolated fixture captures only the latest message for an address at `GET /__test/mail` and is never mounted in production.

---

## ⚠️ Operational limits and follow-up

**Risks**

- **Risk:** Current session shortcuts create redirect loops — _Mitigation:_ explicitly handle unverified sessions and test direct navigation/back history.
- **Risk:** Callback URLs leak tokens or allow external redirects — _Mitigation:_ fixed same-origin callbacks, safe return helpers, token removal after reset success, and no analytics on token pages.
- **Risk:** SMTP failure leaves users stuck — _Mitigation:_ accurate check-email copy, resend/new-reset request, recoverable network states, and backend failure observation.
- **Risk:** Existing/demo fixtures assume auto-signup sessions — _Mitigation:_ coordinate verified fixture setup and retain full checkout/workspace coverage.

**Remaining follow-up**

- Captured-mail implementation is complete. Actual Ethereal/Brevo inbox delivery requires backend SMTP configuration, an authorized sender/domain, and final production origins; it was not tested in this change.

## Admin verification visibility

**Status:** Implemented

- The existing `AdminUserFields` fragment requests `emailVerified` from the read-only backend field and supplies it to Users list/detail views, including returned rows after role/password actions.
- One feature-local badge appears beside each email: a green decorative check with **Verified**, or an amber decorative clock with **Unverified**. Text conveys the state without color, and both themes retain contrast.
- The display is read-only; it adds no verification controls, filters, or role-based bypasses.
- [x] List and details show both states, including after existing role/password actions.
- [x] Component tests, the focused PostgreSQL browser journey, generated operations, lint, and build pass.
