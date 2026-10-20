# 🔔 Storefront and Workspace Notification Specification

> **Goal:** Give verified customers and authorized staff a persistent, accessible notification bell and inbox refreshed through SSE.

**Status: Proposed — implementation is delivered and local verification is recorded, but acceptance remains incomplete.**
**Date:** 2026-10-20. **Branch:** `feat/in-app-notifications`.
Authoritative backend contract: [backend specification](../../../backend/specs/in-app-notifications/SPEC.md).
Coordinated tasks: [implementation plan](../../../backend/docs/superpowers/plans/2026-10-20-in-app-notifications.md).
Verification: [recorded evidence](VERIFICATION.md). Production staging evidence remains required before this feature can be marked Implemented.

---

## 🎯 Objective

Customers can follow order progress without relying on email. Staff can discover paid orders and inventory problems; Admin can investigate failed refunds. The bell is a durable inbox, not a device push notification or an additional copy of order-processing controls.

---

## 📦 Scope

**In scope**

- Shared bell in storefront and workspace headers, scoped unread count, recent feed, full paginated inbox, per-user read actions.
- Storefront: payment confirmed, accepted/preparing, shipped, delivered, cancellation and refund completion.
- Workspace: paid order ready to prepare, low stock, out of stock; Admin-only failed refund.
- Native EventSource invalidation + Apollo refetch, outage fallback, same-origin proxy, account isolation, mobile, both themes, English/Arabic/Thai/Simplified Chinese and RTL.

**Out of scope**

- Push permission prompts, desktop alerts, service workers, sounds, presence detection, preferences, promotions, back-in-stock, historical backfill and changing existing email delivery.
- Automatically refreshing every order or inventory screen from notification signals; this feature refreshes notification data only.

---

## ⚙️ Assumptions & Constraints

**Technical**

- Reuse Apollo, Better Auth, React Router, existing Radix dialog/sheet controls, Lucide bell icon, i18n and native EventSource; no additional package expected.
- Server is authoritative for permissions, counts, sort order and read state. Reuse exact API contract from the backend spec; no hand-edited generated GraphQL types.
- `VITE_IN_APP_NOTIFICATIONS_ENABLED=false` gates mounting. Production enables it only after compatible backend deployment. Backend `NOTIFICATIONS_DISABLED` response hides notification UI and stops its transports without failing existing routes; re-enabling a mounted app requires reload. Live can be disabled independently and leaves fetching available.

**Product / Business**

- Storefront bell is available only to verified signed-in accounts, including Staff/Admin shopping personally. Workspace bell requires current Staff/Admin access. Guests/unverified users do not see a bell and issue no notification requests.
- Read state is per account and inbox, independent of email delivery and other staff. Opening the bell alone does not mark everything read.
- Retention is 90 days; show this limit on full inbox pages. Content describes an event at its timestamp, not guaranteed current order/stock state.

**Dependencies**

- Companion API/schema and streaming proxy route `/api/notifications/stream`; production storefront origin must proxy it with session cookies and without buffering.

---

## 🧩 Delivered Approach

**Surfaces and routes**

- Mount shared `NotificationBell` in [storefront layout](../../src/app/Layout.tsx) and [workspace layout](../../src/features/admin/AdminLayout.tsx), using explicit `STOREFRONT` / `WORKSPACE` scope.
- `/account/notifications` is inside existing verified-session routes and `/admin/notifications` is inside workspace access routes in [App](../../src/app/App.tsx). They retain existing access-denied/not-found behavior.
- Bell shows capped visual badge `99+`; accessible name includes the exact scoped unread count. Zero hides badge. Target size at least 44px; do not crowd existing mobile header controls.
- Open a keyboard-accessible dialog at desktop and a mobile Sheet using existing primitives. Heading, close button, loading, empty and retry states, **Mark all as read**, and **View all notifications**. Escape closes and focus returns to trigger. Recent feed requests 10 newest items of either read state.
- Full inbox requests 20 items per cursor page, with All/Unread filter and Load more. Filter change resets pagination; live refresh resets the visible feed to the first page to prevent cursor gaps, retains focus where possible, and does not force-scroll the user. Explain refresh if older loaded items are replaced.
- Each item has localized event message, absolute locale-formatted date/time, visible unread indicator with text equivalent, primary View action and separate Mark as read action. Plain text only; book titles and customer content are not translated. No mark-unread, delete, archive, or bulk select in v1.
- Clicking View attempts mark-read then opens an allowlisted local destination. A mark failure does not block navigation; show retry feedback and keep authoritative unread state. Read mutations refresh count/list; do not decrement the badge optimistically or treat network failure as success. Disable read-all while pending.
- Order links: `/account/orders/:id` in STOREFRONT, `/admin/orders/:id` in WORKSPACE. Inventory: `/admin/books/:id/edit`. Construct from validated resource type/ID, never raw server URLs. Removed/archived resources use existing authorized target error/fallback behavior; notification remains readable.

**Messages**

- Customer: “Payment confirmed for order #{id}”, “Order #{id} is being prepared”, “Order #{id} shipped”, “Order #{id} delivered”, “Order #{id} cancelled”, “Refund completed for order #{id}”. Add explicit cancellation phase: no payment collected / refund processing / contact support / refund completed according to backend `refundPhase`. Do not infer phases from local timers.
- Staff/Admin: “New paid order #{id} is ready to prepare”, “{bookTitle} is running low — {stockAtEvent} remaining”, “{bookTitle} is out of stock”. Admin-only: “Refund failed for order #{id} — action required”. Counts/title describe event-time snapshots; clicking opens current state.
- For `testPayment=true`, show an accurate translated test-payment qualifier on relevant order notifications. Never describe notification receipt as proof of email/inbox delivery.
- Unknown future notification kinds render a neutral translated “Notification” with date/read action and only a recognized safe destination; never show raw enum values or raw translation keys. Nonmatching scope/payload is rejected as a schema/transport error.

**Data and transport**

- Add operations to [src/operations.graphql](../../src/operations.graphql), generate [src/generated/graphql.ts](../../src/generated/graphql.ts), and use scope in every list/count/mutation variable. API names/types/validation match backend spec exactly.
- Create planned `src/features/notifications/{NotificationProvider.tsx,NotificationBell.tsx,NotificationList.tsx,NotificationsPage.tsx,use-notification-feed.ts,notification-links.ts}` with behavioral tests. Avoid global module singleton connections that survive an account change.
- One EventSource per visible tab for the active shell scope, not one per component. Provider lives inside the ready verified identity boundary; changing shell scope closes old stream. Hidden tabs close SSE and stop interval refresh; becoming visible reconnects and refetches. No leader-election or cross-tab infrastructure in v1.
- Listen to named `ready` and `notifications-changed` events. On each ready (including reconnect), refetch active inbox/count. Native EventSource reconnects after server/network failure. Coalesce bursts with a 250ms window and at most one in-flight refresh plus one trailing refresh. Refresh count and mounted lists only; do not repeatedly fetch unopened history.
- In addition, refetch on visible tab return and every 60 seconds while visible, with up to 5 seconds initial jitter. This covers lost Redis publications even with an SSE connection still open. If EventSource is unsupported/live is disabled, use the same fallback interval; no permission prompt.
- On SSE error, revalidate current session and workspace access before retaining/retrying connection; close if identity/permission is invalid. Native EventSource does not expose response status, so do not pretend the error callback can read 401/403/503. Live-disabled streams may keep failing; stop that stream attempt after 3 consecutive errors, use fallback, and retry once after 5 minutes while visible or on tab return. Reset on `ready`.
- Reuse [SessionBoundary](../../src/app/SessionBoundary.tsx) cache clearing. Capture account/scope generation for async work, ignore late results after identity change, abort/close listeners and timers on logout/unmount, and prevent new account display until private cache clearing completes.
- GraphQL permission failures stop workspace notifications and revalidate existing workspace access; Admin-only notifications disappear after demotion and cannot be fetched through manual routes. Failed refetch retains previously authorized same-session data with retry feedback; never labels an unknown count as zero. Account changes clear it immediately.
- [Vite proxy](../../vite.config.ts), four locale namespace sets, `.env.example`, README, and root SPEC are updated. The feature remains Proposed until acceptance passes.

---

## 🚀 Execution Plan

1. **Contract integration** — _(role: frontend)_ — generated operations, scoped provider, identity-safe fetching and recovery.
2. **Shared bell and inbox** — _(role: frontend)_ — two headers, two authorized routes, read actions and translated responsive UI.
3. **Connected validation** — _(role: fullstack)_ — payment/staff/customer flow, stock alerts, read isolation and live/outage recovery against both database providers.

---

## ✅ Acceptance Criteria

**Functional**

- [ ] Correct bell visibility, scopes and all ten messages; exact unread count with 99+ visual cap.
- [ ] View links and independent read/read-all behavior work without email changes; opening the bell does not mark all read.
- [ ] Cursor history, unread filter, expired/removed resource fallback, retention copy and unknown-kind fallback behave as specified.
- [ ] SSE invalidates GraphQL data; polling recovers missing signals; no duplicate connections or out-of-order refetch corruption.
- [ ] Logout/account switch, verification loss and role changes clear unauthorized data and stop transport work.

**Non-functional** (performance, security, accessibility, reliability)

- [ ] Keyboard, Escape/focus return, screen-reader names, mobile 375px, actual 200% browser zoom, both themes and all four languages/Arabic RTL pass.
- [ ] One connection per active tab/scope, bounded requests under event bursts, no hidden-tab polling, no token in stream URL or raw HTML.
- [ ] Redis/SSE outage retains usable GraphQL inbox with recovery; existing cart/auth/checkout/admin journeys remain unchanged.

---

## 🧪 Validation Plan

**Manual tests**

- Two accounts and Staff/Admin: payment → staff bell → prepare/ship → customer bell → order details; exercise cancellation/refund and stock transitions separately.
- Cross-tab read state, browser reload, hidden/visible tab, offline/online, Redis outage, role removal, and rapid account switch. Test through the real same-origin proxy.
- Keyboard and native 200% zoom, light/dark desktop and mobile, English/Arabic/Thai/Chinese; record actual observed evidence.

**Automated tests**

- Focused component/provider tests for unknown count versus zero, badge cap, event burst coalescing, one in-flight refresh, stale identity responses, hidden-tab lifecycle, stream retry limits, fallback intervals, read failures and safe links.
- Backend-owned tests prove direct API authorization and business event rules; browser tests prove connected customer/workspace use and session privacy rather than duplicating every domain edge case.
- `bun run codegen` against compatible running backend; `bun run test`, `bun run lint`, `bun run build`, `bun run test:e2e`, and backend `bun run test:postgres:browser`. Extend isolated browser fixture wiring/proxy for SSE and use unique loopback Redis prefix for real cross-instance tests; never production/development databases.

**Rollback / mitigation**

- Build/deploy with frontend flag off until backend schema is available; runtime disabled-feature handling hides bell/routes gracefully. Hide feature and stop EventSource on rollback; retain backend tables. Existing email continues independently.

---

## ⚠️ Risks & Open Questions

**Risks**

- **Risk:** Header crowding and HTTP/1 browser connection limits — _Mitigation:_ responsive placement, one stream per visible tab, HTTP/2 deployment and fallback fetching.
- **Risk:** Old-account async data leaks — _Mitigation:_ existing SessionBoundary plus generation guards and cleanup tests.
- **Risk:** Live storms refetch too much — _Mitigation:_ coalescing, bounded refresh, no history fetching while closed and periodic recovery.

**Open questions** _(blockers for implementation)_

- None under the coordinated proposed defaults. Owner review of the final visual placement and history-limit copy is required before marking manual UX acceptance complete.
