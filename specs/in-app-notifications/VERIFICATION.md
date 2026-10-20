# 🔔 In-app Notifications Verification Record

**Status: Local implementation verified; production acceptance pending.**
**Date:** 2026-10-20. **Branches:** backend and frontend `feat/in-app-notifications`.

This record distinguishes delivered local behavior from production acceptance. The feature specification remains **Proposed** until staging verifies the deployment controls listed below.

## Recorded local evidence

- Backend: `bun run test -- --maxWorkers=2` passed **336** tests with **2** skips. PostgreSQL parity coverage passed **43** tests, including real payment and multiple-refund-operation regressions. The isolated two-process Redis/SSE runner passed creation, read, revoke, malformed-message, outage, and reconnect cases. Captured-email acceptance passed with **8** messages, confirming that email behavior remains independent.
- Frontend: `bun run test` passed **326** tests in **63** files; lint and build passed. The build reported its existing chunk-size warning.
- Browser: the SQLite full browser suite passed **80** journeys. The separate notification mobile/language/theme test passed. `bun run test:e2e -- --config playwright.notifications.config.ts` passed **2** tests in **50.7 seconds**, exercising mobile 375px and actual native Chromium 200% zoom across four languages, two themes, and both inbox scopes (32 route visits). It checked dialog bounds, focus, no overflow, and 44px mobile actions. The dedicated configuration uses an isolated temporary browser profile and verifies the native zoom with CDP `cssVisualViewport.zoom === 2`; the default browser project intentionally skips that native case. `bun run test:postgres:browser` then passed **81** journeys with **1** intentional native-zoom skip in **8.6 minutes**; the dedicated project supplies that skipped native-zoom evidence.
- Review: the initial independent review found two issues. Both were fixed with regressions, and the follow-up review was clear.

## Compact UI follow-up

The subsequent [compact notification UI](../compact-notifications/SPEC.md) replaces the desktop modal with a bell-anchored popover and shares icon rows with full history. Its [verification record](../compact-notifications/VERIFICATION.md) contains the newer frontend, browser, desktop RTL, and native-zoom evidence. The original results above remain historical rollout evidence; this presentation change does not satisfy the production gates below.

## Production acceptance still required

- Apply and verify the additive migrations on the staging database, then keep backend and frontend flags off until compatible deployment is confirmed.
- Verify authenticated `rediss:` TLS and Redis ACL/channel isolation using the production `NOTIFICATION_CHANNEL_PREFIX`.
- Verify the same-origin `/api/notifications/stream` proxy preserves cookies, disables buffering/compression, forwards heartbeats, reconnects, and sustains the expected connection capacity.
- Schedule and observe daily `bun run notifications:cleanup` execution, including its deleted-row metric/output and 90-day cutoff behavior.

Do not infer any of these deployment results from local tests.
