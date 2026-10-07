# Local demo login

> **Status:** Implemented.

## Goal

Expose optional local demo-account controls on the sign-in page while preserving
the normal Better Auth flow and role checks. Seed the corresponding accounts using
[the backend demo-login specification](../../../backend/specs/demo-login/SPEC.md);
normal sign-in behavior remains defined by [the authentication specification](../authentication/SPEC.md).

## Availability and behavior

On `/sign-in`, Demo Customer, Demo Staff, and Demo Admin controls appear only when
all of the following are true: Vite is in development, `VITE_DEMO_LOGIN=true`, and
the browser host is `localhost`, `127.0.0.1`, or `[::1]`. The controls never appear
on `/sign-up` or after a user is signed in.

Each control submits the matching seeded email and shared local password through
the ordinary Better Auth email/password client. Customer navigates to `/`; Staff
and Admin navigate to `/admin/books`. This demo destination overrides `returnTo`;
ordinary sign-in retains its existing `returnTo` behavior. Roles and access are
still decided by the backend.

## Feedback and safety

While a demo submission is pending, all sign-in and demo submissions are disabled.
The page exposes loading status, shows a retryable error for failed or unavailable
API requests, and directs the user to run `bun run demo:seed` in the backend. The
feature adds no dependency and does not persist credentials or sessions in local
storage.

## Acceptance criteria

- Each control signs in with the corresponding account and reaches its intended
  destination with the backend-assigned role.
- Disabled mode, non-loopback hosts, production builds, sign-up, and signed-in
  state expose no demo controls.
- A failed request restores controls so the user can retry.

## Verification

Component tests cover role credentials, destinations, availability gates, pending
state, and retry behavior. Browser tests seed the isolated API, use every control,
and verify session restoration and the resulting permissions.
