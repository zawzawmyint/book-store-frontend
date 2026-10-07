# The Quiet Shelf storefront

A React + TypeScript + Tailwind bookstore storefront using shadcn/ui primitives, Zustand, React Hook Form, and Zod. This folder is its own Git repository. The backend lives in the sibling `backend` repository and should be started first.

See [SPEC.md](SPEC.md) for the storefront behavior, [specs/order-workflow/SPEC.md](specs/order-workflow/SPEC.md) for request processing, [specs/icons-typography/SPEC.md](specs/icons-typography/SPEC.md) for icon actions and typography, [specs/appearance/SPEC.md](specs/appearance/SPEC.md) for Light/Dark appearance, [specs/authentication/SPEC.md](specs/authentication/SPEC.md) for sign-in, [specs/demo-login/SPEC.md](specs/demo-login/SPEC.md) for optional local demo controls, [specs/profile/SPEC.md](specs/profile/SPEC.md) for the account profile, [specs/staff/SPEC.md](specs/staff/SPEC.md) for workspace roles, [specs/users/SPEC.md](specs/users/SPEC.md) for user-directory compatibility, and [specs/activity/SPEC.md](specs/activity/SPEC.md) for Admin activity history.

## Development workflow

Future behavior changes follow spec-driven development (SDD) and test-driven development (TDD). Write or revise the relevant spec before implementation, with a proposed contract and testable acceptance criteria. For each criterion, write a focused failing test, confirm the failure is caused by the missing behavior, make it pass, and refactor. Finish with the checks below and any affected browser tests; then update the spec to reflect the delivered behavior and mark a feature spec `Implemented`. See [AGENTS.md](AGENTS.md) for the full workflow and cross-repository rules.

## Start

Requires Bun 1.3.14 for package management and Node.js 24 or later for runtime and tooling. Each repository commits its own `bun.lock`; use `bun install` when changing dependencies. In one terminal, start the backend; in another:

```powershell
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:5173`. Vite uses port 5173 strictly and stops if it is occupied, keeping the storefront URL aligned with the backend's trusted origin. Vite forwards `/graphql` and `/api/auth` to the local backend. Set `VITE_API_TARGET` if the local API uses another port. Deploy both paths through the same storefront origin so session cookies work reliably.

## Local demo login

For a local role demo, first run `bun run demo:seed` in the sibling backend. Set
`VITE_DEMO_LOGIN=true` in `.env.local`, then restart Vite because Vite reads this
flag at startup. Sign out if necessary and open `/sign-in` on a loopback host to
use Demo Customer, Staff, or Admin. These controls are development-only and do not
appear on non-loopback hosts, production builds, sign-up, or for a signed-in user.
The accounts share a local-only password; role enforcement stays on the backend.
See [the frontend demo-login specification](specs/demo-login/SPEC.md) and
[the backend seed specification](../backend/specs/demo-login/SPEC.md).

## How it connects

```text
React page → Apollo Client → POST /graphql → Express resolver → SQLite
React page ← Apollo Client ← GraphQL response ← Express resolver
```

The catalog and detail screens run GraphQL queries. Zustand manages the cart and persists its items in browser storage. Better Auth's React client manages account forms and session state. Checkout requires sign-in and sends cart lines in a `placeOrder` mutation; the backend derives the customer from the session, checks the items, calculates the final total, and returns a Submitted request. The request takes no payment.

## Structure

```text
src/
  main.tsx                    Application entry point and providers
  app/                        Routes and shared layout
    components/               UI composition used across features
      ui/                     Copied and tailored shadcn/ui primitives
  features/
    books/                    Catalog page sections and book components
    cart/                     Cart state, rules, row, and page
    auth/                     Sign-in, sign-up, and route guard
    account/                  Order history and profile
    checkout/                 Order request page and receipt
  lib/                        Apollo client and formatting
  generated/                  Generated GraphQL TypeScript documents
  index.css                   Shared visual classes and base styles
  operations.graphql          Queries and mutation used by the UI
```

The home page composes a hero, catalog section, and store note. Shared page, back-link, form-field, and summary components live in `src/app/components/`, with copied and storefront-themed shadcn/ui primitives in `src/app/components/ui/` configured by `components.json`. Storefront and admin screens use those primitives for actions, forms, menus, dialogs, cards, tables, and feedback; feature-only components stay beside their feature. Apollo Client sends requests to GraphQL resolvers in the backend; business rules and SQL remain on the server.

The operation definitions are in [`src/operations.graphql`](src/operations.graphql). Generated TypeScript types and documents are committed under `src/generated/`, so a normal build does not require the backend to be running. After changing the backend schema or frontend operations, start the backend and run:

```powershell
bun run codegen
```

## State ownership

Zustand owns the shared cart items and add, update, and clear actions. Components subscribe through selectors; cart count and estimated total are derived from items. Persistence keeps the existing `book-store-cart` key and raw JSON array format so previously saved carts remain readable. Invalid saved items are filtered out; unavailable browser storage leaves the cart usable in memory. Appearance uses the separate `book-store-theme` key, defaults to Dark, and retains an in-memory choice if browser storage is unavailable.

Apollo Client owns catalog and order history queries and mutation state. React Hook Form owns account form values and validation; Better Auth owns the session. A session boundary hides routed content while the session changes and clears Apollo data before a different account is shown. The backend keeps books, stock, and orders in SQLite through Drizzle, with transactions enforcing consistency.

## Admin panel

Staff and administrators use `/admin` with the same login as customers. Public signup creates a Customer. An Admin can assign Customer, Staff, or Admin from Users; the backend operator command can grant Admin or return a user to Customer. The storefront Account menu shows Staff workspace or Admin after server authorization resolves, and Profile before Orders.

Admin screens have a dedicated workspace outside the storefront header/footer: a full-height dark forest-green sidebar, sticky account header, neutral content styling, and compact tables/forms. The sidebar uses brighter branding, muted group labels, and a distinct active link. Below 1024px, the workspace menu opens the same navigation in a Sheet. Back to store is in the sidebar footer. The workspace Account menu opens `/admin/profile` and signs out; it remains available after access revocation.

- `/admin/books` lets Staff and Admin manage search, archive-state filtering, low-stock filtering (five or fewer), pagination, and stock adjustments. Both can create and edit books, including archived books; only Admin sees Archive/Restore in the More actions menu.
- Books, Orders, and Users show up to five items per page using the shared `AdminPageTable`. Books and Users use `AdminFilterToolbar` for trimmed search submission and page-specific filters, while retaining URL-filter and pagination ownership. List and book-form headings use `AdminPageHeader`; these components live in `src/features/admin/components/`.
- `/admin/books/new` creates books with initial stock; `/admin/books/:id/edit` edits metadata without replacing inventory.
- `/admin/orders` and `/admin/orders/:id` display saved order requests using captured contact and price snapshots to Staff and Admin. The list filters by status in its URL; detail shows the attributed timeline. Both roles can accept, complete, or cancel only through allowed confirmed transitions. Cancellation requires a customer-visible reason and restores saved stock once. Payment and shipping are not recorded.
- `/admin/users` is Admin-only and lists registered accounts with search, an All/Customers/Staff/Admin filter, copyable user IDs, and confirmed role changes. `/admin/users/:id` lets an admin set another person's password; their own row links to `/admin/profile`. Legacy `/admin/customers` list and detail URLs redirect with history replacement while preserving their destination, query string, and hash; recognized internal list return state is normalized to the Users route.
- `/admin/activity` is Admin-only and shows recorded store, account, and order-status changes with URL-backed actor, action, local-date, and price-only filters. Book-row History links open `/admin/books/:id/history`, including archived books and cancellation stock restoration. Staff sees neither navigation item and denied direct URLs do not load history. The server owns attribution and history begins only after the migrated backend is running.
- `/account/profile` lets the signed-in customer update their own name and password. `/admin/profile` does the same for the signed-in Staff or Admin user and stays inside the workspace. Email stays read-only. See [the profile spec](specs/profile/SPEC.md).

Admin data is never persisted in browser storage. Session changes clear Apollo data; access loss hides private views. Archived books in existing carts fail checkout with an actionable message and retain the cart. If a stock mutation loses its response, check inventory before deciding whether to submit another adjustment.

See [the admin spec](specs/admin/SPEC.md) and the backend README for provisioning and migrations. The browser fixture uses only an in-memory database and test accounts.

## Customer account flow

Sign-in and sign-up use React Hook Form with a Zod resolver from `@hookform/resolvers`. Checkout shows the signed-in account's name and email as read-only details and submits only cart lines. Server errors remain visible, failed submissions keep the cart, and a successful request clears it and shows the receipt. Signing out clears account-specific Apollo data but preserves the cart.

## Checks

```powershell
bun run test
bun run lint
bun run build
```

## Browser tests

Install dependencies in both repositories, then run these commands from the frontend:

```powershell
bun run test:e2e:install
bun run test:e2e
```

Playwright runs Chromium and starts a real API with a freshly seeded in-memory SQLite database from `e2e/server.ts` on port 4100, plus Vite on 4173. Keep both ports free. These tests cover account creation, cart → sign-in → checkout, owner-safe order detail, all workflow roles and transitions, cancellation restoration, direct guest API rejection, session/role loss, responsive keyboard behavior, appearance, and Admin/Staff activity history. They do not write a development or production database. Browser installation is needed once per machine; repeat when Playwright requires a new browser version.

The design uses locally rendered book covers, so browsing does not depend on a remote image service.

The interface uses self-hosted Lora and Source Sans 3 web fonts from `public/fonts/`, with their OFL license files retained alongside the font assets.
