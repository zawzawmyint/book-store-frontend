# Repository guidance

This repository owns the React, TypeScript, Tailwind, and Apollo Client storefront. Read `README.md` for setup and `SPEC.md` when changing user-facing behavior. For sign-in, checkout access, or account pages, also read `specs/authentication/SPEC.md`; for payment behavior, read `specs/stripe-checkout/SPEC.md`.

## Spec-driven and test-driven workflow

Use this order for future implementation work. Existing specs describe the current system; do not treat their `Implemented` status as evidence that earlier work followed this process.

1. Before changing behavior, create or update `specs/<feature>/SPEC.md` with **Status: Proposed**. For a small change documented only in `SPEC.md`, add a clearly labeled proposed section; preserve its description of current behavior until delivery. State the user-visible behavior, affected routes and API contracts, edge cases, and testable acceptance criteria. For a bug, specify the correct behavior and regression case. Coordinate any GraphQL contract change with the backend spec before editing either implementation.
2. Select one acceptance criterion and add the smallest relevant automated test first. Use a focused unit or component test for local behavior and a Playwright test for a browser journey. Run it and confirm it fails for the intended missing behavior, rather than a setup error.
3. Implement only enough to pass that test, then refactor with tests green. Repeat the failing-test → passing-test → refactor cycle for each remaining criterion. Generated files are updated through codegen after the source contract changes, not edited by hand.
4. Run the affected tests, then `bun run test`, `bun run lint`, and `bun run build`. Run `bun run test:e2e` when routes, authentication, cart, checkout, account flows, or their API integration change. Check acceptance criteria manually where automation cannot verify them.
5. Update `SPEC.md` to match the delivered behavior, resolve any proposed section, and mark the feature spec **Status: Implemented** only after its acceptance criteria pass. Include the spec, tests, and implementation in the change for review.

## Commands

- Install reproducibly with Bun 1.3.14: `bun install --frozen-lockfile`. Use `bun install` when changing dependencies and commit `bun.lock`. Node.js 24 or later runs development and build tooling.
- Run locally: `bun run dev`
- Check changes: `bun run test`, `bun run lint`, and `bun run build`
- Browser checks: `bun run test:e2e:install` once, then `bun run test:e2e`. Install sibling backend dependencies first; keep API port 4100 and frontend port 4173 free.
- Regenerate GraphQL documents: `bun run codegen` while the backend schema endpoint is running

## Code boundaries

- Keep routes and shared layout in `src/app/`, feature code in `src/features/`, and shared client utilities in `src/lib/`.
- Keep copied shadcn/ui primitives in `src/app/components/ui/`, configured by `components.json`, and tailor them to storefront styling.
- Put UI components used across features in `src/app/components/`; keep components used by one feature in that feature's `components/` folder. Keep shared visual classes in `src/index.css`.
- Write GraphQL operations in `src/operations.graphql`. Do not hand-edit `src/generated/graphql.ts`; regenerate it and commit the result after operation or schema changes.
- Use React Hook Form with Zod through `@hookform/resolvers` for account forms. Keep schemas local, match backend normalization and limits, and preserve accessible labels, field errors, server errors, submission states, and cart retention on checkout failure.
- Playwright uses the in-memory API in `e2e/server.ts`; preserve isolation from development and production data.
- Use Zustand for shared cart state, with selectors for items and actions. Derive count and estimated total from items. Preserve the `book-store-cart` storage key and raw JSON array compatibility, validate saved items, and keep cart actions usable when storage is unavailable.
- Use Apollo Client for server data and Better Auth's React client for session state. The backend owns final prices, stock checks, and order totals.
- Keep checkout wording accurate: it collects a delivery address, obtains a server quote, and opens Stripe hosted Checkout for test payment. Delivery tracking is optional staff-entered information; do not imply a carrier guarantee.

## Cross-repository workflow

The backend is a separate repository. When its GraphQL schema changes, update the operations here as needed, run codegen against the running backend, and check that tests, lint, and build pass.
