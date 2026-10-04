# The Quiet Shelf storefront

A React + TypeScript + Tailwind bookstore storefront using shadcn/ui primitives, Zustand, React Hook Form, and Zod. This folder is its own Git repository. The backend lives in the sibling `backend` repository and should be started first.

See [SPEC.md](SPEC.md) for the storefront behavior, [specs/authentication/SPEC.md](specs/authentication/SPEC.md) for sign-in, and [specs/profile/SPEC.md](specs/profile/SPEC.md) for the account profile.

## Development workflow

Future behavior changes follow spec-driven development (SDD) and test-driven development (TDD). Write or revise the relevant spec before implementation, with a proposed contract and testable acceptance criteria. For each criterion, write a focused failing test, confirm the failure is caused by the missing behavior, make it pass, and refactor. Finish with the checks below and any affected browser tests; then update the spec to reflect the delivered behavior and mark a feature spec `Implemented`. See [AGENTS.md](AGENTS.md) for the full workflow and cross-repository rules.

## Start

Requires Bun 1.3.14 for package management and Node.js 24 or later for runtime and tooling. Each repository commits its own `bun.lock`; use `bun install` when changing dependencies. In one terminal, start the backend; in another:

```powershell
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:5173`. Vite uses port 5173 strictly and stops if it is occupied, keeping the storefront URL aligned with the backend's trusted origin. Vite forwards `/graphql` and `/api/auth` to the local backend. Set `VITE_API_TARGET` if the local API uses another port. Deploy both paths through the same storefront origin so session cookies work reliably.

## How it connects

```text
React page → Apollo Client → POST /graphql → Express resolver → SQLite
React page ← Apollo Client ← GraphQL response ← Express resolver
```

The catalog and detail screens run GraphQL queries. Zustand manages the cart and persists its items in browser storage. Better Auth's React client manages account forms and session state. Checkout requires sign-in and sends cart lines in a `placeOrder` mutation; the backend derives the customer from the session, checks the items, and calculates the final total. The request takes no payment.

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

Zustand owns the shared cart items and add, update, and clear actions. Components subscribe through selectors; cart count and estimated total are derived from items. Persistence keeps the existing `book-store-cart` key and raw JSON array format so previously saved carts remain readable. Invalid saved items are filtered out; unavailable browser storage leaves the cart usable in memory.

Apollo Client owns catalog and order history queries and mutation state. React Hook Form owns account form values and validation; Better Auth owns the session. A session boundary hides routed content while the session changes and clears Apollo data before a different account is shown. The backend keeps books, stock, and orders in SQLite through Drizzle, with transactions enforcing consistency.

## Admin panel

Store administrators use `/admin` with the same login as customers. Access is granted through the sibling backend's `admin:access` operator command or from the Customers page; no account can promote itself at sign-up. The storefront Account menu shows Admin after server authorization resolves, and Profile before Orders.

Admin screens have a dedicated workspace outside the storefront header/footer: a full-height dark forest-green sidebar, sticky account header, neutral content styling, and compact tables/forms. The sidebar uses brighter branding, muted group labels, and a distinct active link. Below 1024px, Admin menu opens the same navigation in a Sheet. Back to store is in the sidebar footer. The admin Account menu opens `/admin/profile` and signs out; that menu remains available after access revocation.

- `/admin/books` manages search, archive state, low-stock filtering (five or fewer), pagination, stock adjustments, and archive/restore. Its rows use compact book thumbnails, direct Edit/Adjust stock actions, and a More actions menu for Archive/Restore.
- Books, Orders, and Customers show up to five items per page using the shared `AdminPageTable`. Books and Customers use `AdminFilterToolbar` for trimmed search submission and page-specific filters, while retaining URL-filter and pagination ownership. List and book-form headings use `AdminPageHeader`; these components live in `src/features/admin/components/`.
- `/admin/books/new` creates books with initial stock; `/admin/books/:id/edit` edits metadata without replacing inventory.
- `/admin/orders` and `/admin/orders/:id` display saved order requests, including legacy guest requests, using captured contact and price snapshots. Payment, shipping, and processing status are not recorded.
- `/admin/customers` lists registered accounts with search, an All/Customers/Admins filter, copyable user IDs, and confirmed grant or revoke. `/admin/customers/:id` shows one account. An admin can set another person's password there; their own row links to `/admin/profile`.
- `/account/profile` lets the signed-in customer update their own name and password. `/admin/profile` does the same for the signed-in admin and stays inside the admin workspace. Email stays read-only. See [the profile spec](specs/profile/SPEC.md).

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

Playwright runs Chromium and starts a real API with a freshly seeded in-memory SQLite database from `e2e/server.ts` on port 4100, plus Vite on 4173. Keep both ports free. These tests cover account creation, cart → sign-in → checkout, order history, direct guest API rejection, and stock errors with cart retention. They do not write a development or production database. Browser installation is needed once per machine; repeat when Playwright requires a new browser version.

The design uses locally rendered book covers, so browsing does not depend on a remote image service.
