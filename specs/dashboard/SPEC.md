# The Quiet Shelf storefront — dashboard

> **Status:** Implemented. **Date:** 2026-10-09.

## Goal and scope

Give Staff and Admin a workspace home that answers what needs attention, with
Admin-only financial trends. [The paired API spec](../../../backend/specs/dashboard/SPEC.md)
owns the exact GraphQL contract, authorization, time boundaries and metric rules.
Use Recharts with copied shadcn/ui Chart primitives and the existing workspace theme.
Include an interactive payment area chart and a fulfillment bar chart. Radar
charts, forecasts, genre reports, exports, notifications and customer dashboard
changes are out of scope.

## Routes and access

- Render the dashboard at /admin instead of redirecting to /admin/books. Add
  Dashboard as the first workspace navigation item, active only at /admin.
  Existing book/order/user/activity/profile routes remain available.
- Keep RequireWorkspaceAccess, AdminAccessProvider, AdminLayout and SessionBoundary.
  Guests retain sign-in with the internal return path; Customers see access denied.
- Staff and Admin default workspace/demo-login destinations become /admin where
  they currently default to /admin/books. Preserve explicit authorized return paths.
- Staff see fulfillment, stock alerts, action lists and recent orders. Only Admin
  mounts the finance section and issues adminDashboardFinance. Server authorization
  is required; client hiding is not the security boundary.
- Keep existing session clearing, role revalidation and no-cache workspace policy.
  Admin-to-Staff transition immediately removes financial content; Customer role
  loss removes workspace content. Do not persist dashboard data in browser storage.

## Layout and behavior

Use `AdminPageHeader` with a compact Refresh action; Admin also sees the payment
period selector beside it. Section labels carry their update timestamp inline.
Compact, two-column-on-mobile summary cards precede the 220px fulfillment and 240px
payment graphics. At desktop widths the Admin graphics sit side by side; Staff sees
fulfillment before stock alerts. Stock/refund/action lists follow the graphics, and
Recent orders remains last. Mobile sections stack without page-level horizontal
scrolling. Exact values, ordinary status links, chart tooltips, daily table, separate
request states, and role restrictions are unchanged.

**Delivered layout refinement (2026-10-09):** The Admin 1440×900 browser check
confirmed that both chart graphics fit without scrolling (the prior layout measured
the lower graphic at 1105.3px). The four dashboard browser journeys passed after the
refinement, including existing mobile, keyboard period selection, date, theme,
role-loss, drill-down, and stock-adjustment coverage. No route, API, dependency,
or request-handling behavior changed.

**Current operational overview, Staff and Admin**

- Cards: Awaiting preparation, Preparing, Shipped, Low stock (1–5), Out of stock.
  Counts are current, not affected by the finance range. Label this clearly.
- Fulfillment bar chart: Awaiting preparation, Preparing, Shipped, Delivered;
  exact counts and metric eligibility come from workspaceDashboard. Show all four
  statuses even at zero. Bars use existing status colors/labels where suitable.
- Awaiting-preparation and ready-to-ship lists show at most five orders each, with
  ID, customer name and a View order link. Processing stays on existing detail pages.
- Stock alerts show at most five active books, stock and an Adjust stock action.
  Reuse StockDialog and its validation/error/uncertain-response behavior. Refetch
  dashboard data after a confirmed change; do not automatically retry mutations.
- Recent orders show five rows with ID, date, customer, total, fulfillment status,
  payment state and View order. Reuse status/formatting/table primitives; dashboard
  previews do not need list pagination.

**Financial overview, Admin only**

- Period selector: Last 7 days, Last 30 days (default), Last 90 days.
  Store selection in /admin?period=7|30|90. Invalid/missing values normalize to 30;
  preserve unrelated query parameters. Map to DAYS_7/30/90 API enums.
- Cards: Captured payments, Successful refunds, Net captured, Paid orders.
  Amounts include delivery fees; label these as recorded test payments, not profit.
- Interactive area chart uses the API's ascending daily points: filled captured
  payments area plus a distinct unfilled successful-refunds line. Keep both series
  visible; the date selector provides interaction without extra metric toggles.
- Tooltips show store-calendar date, captured amount, refunded amount and paid
  order count. Show currency and returned timezone alongside the chart; today is
  marked partial. No-data periods display a clear empty message and zero cards.
- Current failed-refund count/list appears in this section, with up to five View
  order links. Clearly label it Current, independent of the selected period.

## Drill-down and refresh

- Order cards and bars link to /admin/orders?status=SUBMITTED|PREPARING|SHIPPED|DELIVERED.
  Existing destination lists filter fulfillment status only and include other
  payment states: label the link All orders in this status rather than claiming
  the destination exactly matches the paid-only dashboard count. Do not silently
  add a new order-list filter in this slice.
- Both stock cards link to /admin/books?low=true, the existing active low-stock
  list (0–5). Label the link View low and out-of-stock books; exact alerts remain
  distinguishable on the dashboard. No new zero-only catalog filter is proposed.
- Order and failed-refund rows link to /admin/orders/:id; set a safe internal
  returnTo including the current dashboard period. Preserve existing detail access.
- Fetch on entry, period change (finance only), manual Refresh and window focus.
  Deduplicate in-flight requests. Period changes must not refetch current operations.
  No polling or websocket subscription in this slice. Returning from processing
  remounts/refetches the dashboard; successful stock edits refetch current operations.
- A background refresh preserves the position of existing dashboard links and
  controls. Its status is screen-reader-only, while a motion-safe spinner uses the
  reserved inline update area beside the timestamp for both operations and finance.
  Initial loading and error feedback remain visible in their existing states.
- Keep the displayed period and data paired. Ignore superseded responses after
  rapid selection changes; show loading for the new period rather than old data
  under its label. Operational content remains usable if only finance fails.

## Loading, errors and accessibility

- Initial requests show section loading placeholders. Errors show section-specific
  retry feedback; never replace an error with fabricated zero metrics. During
  refresh, existing same-period data may remain with a visible refresh indicator.
- On refresh failure, mark retained data stale with its previous generatedAt.
  Authorization/session failures use existing access handling instead of stale data.
- Provide keyboard-accessible period controls, links, Refresh and stock actions.
  Bars may support pointer clicks, but supply equivalent ordinary status links.
- Enable supported chart accessibility features and provide a visible expandable
  daily-values table for all chart data. Fulfillment counts also appear in a text
  list/table. Hover and color must not be the only way to obtain information.
- Use distinct series styling, sufficient contrast in light/dark themes, reduced
  motion, meaningful chart labels, focus states and a responsive chart height.

## Code and data boundaries

`DashboardPage` lives in `src/features/admin/pages/`; dashboard-only sections and
adapters live in `src/features/admin/dashboard/`.
Reuse AdminPageHeader, AdminFeedback, status components, money/date utilities and
StockDialog where their contracts fit. Avoid one component per trivial value and
avoid a generic analytics framework. API owns aggregates; React owns presentation,
period URL state and loading/error handling.

Operations in `src/operations.graphql` and the generated client types use the paired
`workspaceDashboard` and `adminDashboardFinance` contract. The compatible shadcn
Chart primitive is in `src/app/components/ui/chart.tsx`, and the locked Bun
dependency is Recharts 3.8.0.
Lazy-load the dashboard/chart code so public storefront routes do not eagerly load
the chart library. No cart or Better Auth state ownership changes.

Money totals arrive as integer strings. Format exactly from cents without lossy
Number conversion. Charts may convert to numeric plotting values only when safe;
if a value exceeds the supported numeric range, show an explanatory chart fallback
and retain exact cards/table values. No truncation, overflow or misleading tooltip.

## Acceptance criteria

### Delivered: summary and stock visual cues

- Summary cards are named groups with category icons, a text status, and the existing
  dark/light surfaces. A nonzero Submitted count is amber **Needs attention**;
  Preparing is blue **In progress**; Shipped is teal **On the way**; a zero
  operational count is neutral **Nothing pending**.
- Low stock above zero is amber **Needs restocking**; any out-of-stock count is red
  **Needs action**. Zero inventory counts are neutral **No issues**. Stock rows use
  the matching icon and text for **Needs restocking** or **Out of stock**.
- Finance categories use neutral identifying icons only: refunded or negative values
  do not alone imply urgency. Text carries every status meaning, preserving
  first-click navigation, compact charts, mobile wrapping, and non-color access.

The controlled `DashboardPage` integration test verifies nonzero operational and
stock cues, then confirms they return to neutral after a refresh. Five dashboard
browser journeys passed after the visual update, including first-click navigation,
desktop chart fit, mobile 390px wrapping, theme/keyboard behavior, and role gating.
Current Admin dark and light screenshots were inspected.

- [x] /admin and default Staff/Admin workspace entry open Dashboard; existing
      explicit return destinations and workspace links still work.
- [x] Staff make no finance request; guests/Customers mount no dashboard query;
      role/session changes remove unauthorized content and clear account-specific data.
- [x] Current cards, bar chart and bounded lists match API data without client-side
      aggregation or accidental finance-period filtering.
- [x] 7/30/90 selection updates URL and finance data; rapid changes cannot show
      mismatched periods, and current operations do not refetch on period changes.
- [x] Area chart, refund line, tooltips, exact amount cards and accessible daily
      table agree, including zero days, negative net and large sums.
- [x] Current refund/stock alerts, drill-down labels, safe return links and confirmed
      stock-adjustment refresh behave as specified.
- [x] Independent loading/empty/error/retry/stale states and focus/manual refresh
      work without leaking finance data or retrying uncertain mutations.
- [x] Mobile/desktop, keyboard, screen-reader alternatives, reduced motion and
      light/dark contrast checks pass; charts do not enlarge initial storefront loading.
- [x] Codegen, tests, lint, build and paired-provider browser checks pass before
      this specification is marked Implemented.

## Validation and delivery

The backend integration suite owns calculation, boundary, refund, provider-parity,
and API-permission cases. Selective component tests cover stale period responses,
role loss while finance is pending, and Staff query gating. Five dashboard
Playwright journeys cover Admin period selection and safe returns, Staff stock
adjustment without a finance request, guest/Customer denial, role loss, and single-click
status navigation while a focus refresh is pending.
They include keyboard Home/End selection, reduced motion, light/dark screenshots,
and the 390px no-horizontal-overflow check.

Initial dashboard delivery completed with 132 frontend tests across 32 files, code
generation, lint, production build, and the full 38-journey browser suite against
both the isolated SQLite API and a disposable PostgreSQL cluster; PostgreSQL cleanup
completed successfully. The later layout refinement reran the four dashboard browser
journeys plus the frontend test, lint, and build checks; it did not rerun the full
SQLite or PostgreSQL browser suites, backend checks, or code generation. The later
first-click navigation fix passed the full 39-journey isolated SQLite browser suite,
along with the same frontend test, lint, and build checks; it did not rerun
PostgreSQL, backend checks, or code generation. The later visual-cues update passed
133 frontend tests across 32 files, lint, build, and five dashboard browser journeys
against SQLite; it did not rerun the full 39-journey SQLite suite, PostgreSQL,
backend checks, or code generation. The lazy chart chunk is now 386 kB. The
pre-existing main-bundle warning at 922 kB remains. Current Admin dark and light
screenshots were inspected.
The visible daily table and ordinary status links provide non-hover alternatives;
no separate screen-reader-session audit was recorded.

The additive API deploys before the frontend. Returning `/admin` to Books and
removing Dashboard navigation remains the frontend rollback path without data
changes. Asia/Dubai is the fixed reporting timezone. No database reset is required.
