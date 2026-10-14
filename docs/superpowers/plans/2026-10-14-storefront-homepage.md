# Storefront Homepage Implementation Plan

> **Goal:** Deliver the approved curated home and `/books` catalog while preserving shopping behavior.

**Spec:** [Feature contract](../../../specs/storefront-homepage/SPEC.md).

**Architecture:** Keep the existing storefront shell and catalog hook. Fetch four explicit selections and genres in one generated GraphQL operation. Handle legacy catalog URLs before mounting the homepage data view. Reuse existing cards, covers, cart behavior, and styling.

**Execution:** Inline, with failing-test-first checks, one final code review and documentation reconciliation. Existing feature branch supplies isolation; no new checkout or deployment is required.

## Global constraints

- Frontend only; no backend schema, persistence, authorization, or payment changes.
- Keep truthful test-payment wording and current generated covers; no invented catalog metadata.
- Use existing primitives; no new dependencies. Generate GraphQL documents instead of editing generated output.

## Tasks

1. **Homepage data and compatibility:** Add component tests proving missing/error/empty data states, selected order, and legacy URL replacement. Verify failures, add `StorefrontHome` query and codegen, implement editorial configuration and home sections.
2. **Catalog and navigation:** Add `/books`, retain existing search/pagination, update catalog-return links, header search/active navigation, and footer. Verify routes/search/legacy URLs and add-to-bag through browser tests.
3. **Regression and visual verification:** Update tests that assumed the catalog lived at `/`. Run focused and full frontend suites, codegen, lint, build and isolated browser journeys. Inspect desktop/mobile light/dark screenshots including 320px overflow.
4. **Review and reconcile:** Request a fresh read-only review; fix material findings with regression checks. Delegate final spec/README reconciliation after validation; review documentation diff before delivery.

## Review focus

- Empty/missing/archived or sold-out selections: no invented replacements or enabled unavailable purchases.
- Root search/page/anchor bookmarks: history replacement preserves other query/hash data.
- Header search on catalog: separate accessible names avoid ambiguous duplicate search controls.
- GraphQL request failure or partial error: navigation and cart survive, with no stale editorial metadata.
- Mobile 320px and both themes: usable header/search and book layout without overflow.

## Execution record

- Spec reviewed; frontend branch `feat/storefront-homepage`, initially clean apart from proposed spec.
- Ruling: use four lookup aliases, filling unconfigured slots with an invalid empty ID (public lookup returns null), to keep the single bounded operation compatible with fewer than four entries. No backend change.
- Ruling: existing catalog search keeps its accessible name; shared header search uses `Search the store` so both forms remain individually accessible on `/books`.
- Homepage component red run: seven expected failures for missing sections/redirects; generated the bounded query from the isolated API. Focused homepage/catalog tests now pass 13/13.
- Browser regression reproduced stale catalog draft after a second header search (Jane remained after Gatsby); header navigation now marks its source so the hook synchronizes that search while retaining existing catalog-owned draft/history behavior.
- Desktop light and mobile dark screenshots inspected; mobile width checks passed at 320px. Increased recommendation link hit area after inspection.
- Final validation: 203/203 frontend tests across 40 files; clean lint; successful build (existing large-bundle warning); generated GraphQL documents from isolated API; full 61/61 SQLite Chromium journeys in 5.3 minutes.
- Final desktop/mobile light/dark homepage and mobile dark catalog screenshots inspected. Added partial GraphQL error-data and failed retry coverage. A fresh code review, including the final lint-compliant catalog draft adjustment, found no material issues.
- Final documentation reconciliation delegated after validation; reviewed the feature, root, README, icon-navigation, and historical catalog documentation against delivered behavior and verification evidence.

## Approved redesign follow-up — 2026-10-14

- Updated the proposed feature contract before code; captured expected failing tests for initially hidden search and missing mood discovery before implementation.
- Replaced the persistent header form with a dialog search; compact header uses the logo as Home and a mobile menu for navigation/appearance. Replaced the three-cover hero with one editorial book feature and added genre tiles, available reading moods, and API-backed author discovery.
- Fresh final checks: 205/205 tests across 40 files, lint and build passed; existing large-bundle warning remains (975.73 kB main, 281.67 kB gzip). No GraphQL source changes or new dependencies in this redesign.
- Affected 11/11 Chromium journeys passed. Full regression: 61/62 passed in 5.6 minutes; one checkout helper payment POST failed with ECONNRESET. Rerunning all checkout and homepage journeys passed 8/8 in 1.5 minutes, including the failed checkout. No payment-helper or production checkout change was needed.
- Seven final screenshots inspected: homepage at 1440px/320px in both themes, search dialog, mobile navigation and mobile dark catalog. Final readonly review found no material issues; documentation reconciliation completed and reviewed, including the mobile appearance contract.
