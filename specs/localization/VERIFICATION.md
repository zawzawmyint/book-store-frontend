# Localization verification record

**Date:** 2026-10-20  
**Feature:** [Storefront and admin localization](SPEC.md)  
**Status:** Technical acceptance verified

## Scope and method

`bun run test:localization` uses `e2e/localization-acceptance.spec.ts` and `playwright.localization.config.ts`. It exercises English, Arabic, Thai, and Simplified Chinese across desktop 1280px, mobile 375px, and native 200% browser zoom in light and dark themes. The route groups include public/authentication/recovery, catalog/detail/bag, checkout/review/receipt, account, and workspace forms, tables, charts, and focus-trapped overlays.

Native zoom uses an isolated Chromium profile preference, not CSS zoom or pinch emulation. The test verifies DPR 2, `visualViewport.scale === 1`, and CDP `cssVisualViewport.zoom === 2`; CDP capture avoids Playwright CSS clipping at native zoom.

## Results

- **Frontend:** `bun run test -- --maxWorkers=2` passed 315 tests in 58 files. `bun run lint` passed. `bun run build` passed with the existing Vite chunk-size warning.
- **Localization routes:** separate runs produced eight desktop/mobile passes, four native-zoom passes after removing inherited desktop device emulation, and three fresh Arabic desktop/mobile/zoom passes after the wordmark/byline correction. Their aggregate contains 24 language/mode/theme conditions and 648 route audits (27 routes each) with no page-wide overflow, raw translation keys, or unnamed interactive roles. Evidence is rooted at the workspace's `../../.delivery-work/localization/acceptance-summary.json`, `acceptance-full.log`, `acceptance-zoom.log`, and `acceptance-ar-final.log`.
- **Charts:** 32 tooltip checks passed across four languages, two themes, mobile/native zoom, and fulfillment/payment charts; each tooltip remained within horizontal and vertical bounds. Evidence: workspace `../../.delivery-work/localization/tooltip-checks/audit.json` and `chart-tooltips.log`.
- **Visual QA:** the rendered review found no remaining material clipping, overlap, RTL, wrapping, readability, focus, or accessible-name defect. Evidence: workspace `../../.delivery-work/localization/visual-qa/visual-review.md`.
- **Backend parity:** 322 backend tests passed with 2 skipped, build/lint/script type checks passed, and 79/79 disposable PostgreSQL browser journeys passed. The readiness regression fix was committed as `dd05b9a`; it changes test readiness timing only and adds no API behavior.

## Linguistic and accessibility review

Independent AI reviewers examined every target resource against English: Arabic 891 strings (including Arabic plural variants), Thai 861, and Simplified Chinese 861. They verified placeholder/plural preservation and corrected 22 linguistic keys. Evidence: workspace `../../.delivery-work/localization/{arabic,thai,chinese}-review.md`.

Browser accessibility snapshots plus keyboard and focus checks cover translated controls and overlays. This is browser accessibility-tree evidence, not a human screen-reader study.

Human native-speaker sign-off was explicitly designated optional by the user and was not performed.

## Remaining limitations

- The Vite build retains its pre-existing chunk-size warning.
- Persisted catalog/customer content, backend email/error prose, and Stripe-hosted Checkout are outside this feature's translation boundary.
