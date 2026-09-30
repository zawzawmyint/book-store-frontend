# Repository guidance

This repository owns the React, TypeScript, Tailwind, and Apollo Client storefront. Read `README.md` for setup and `SPEC.md` when changing user-facing behavior.

## Commands

- Install dependencies: `npm ci`
- Run locally: `npm run dev`
- Check changes: `npm test`, `npm run lint`, and `npm run build`
- Regenerate GraphQL documents: `npm run codegen` while the backend schema endpoint is running

## Code boundaries

- Keep routes and shared layout in `src/app/`, feature code in `src/features/`, and shared client utilities in `src/lib/`.
- Write GraphQL operations in `src/operations.graphql`. Do not hand-edit `src/generated/graphql.ts`; regenerate it and commit the result after operation or schema changes.
- Use Apollo Client for server data. The cart is local browser state; the backend owns final prices, stock checks, and order totals.
- Keep the checkout wording accurate: it submits an order request and does not collect payment or shipping details.

## Cross-repository changes

The backend is a separate repository. When its GraphQL schema changes, update the operations here as needed, run codegen against the running backend, and check that tests, lint, and build pass.
