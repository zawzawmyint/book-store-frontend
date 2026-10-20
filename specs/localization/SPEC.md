# 🌐 Storefront and admin localization specification

> **Goal:** Provide complete English, Arabic, Thai, and Simplified Chinese interface text and consistent formatting across the storefront and Staff/Admin workspace.

**Status:** Implemented

**Date:** 2026-10-20

**Implementation plan:** [Localization implementation plan](../../docs/superpowers/plans/2026-10-19-localization.md)

**Verification:** [Localization verification record](VERIFICATION.md)

---

## 🎯 Objective

The frontend replaces application-owned copy and fixed display formatting with one shared localization system while preserving commerce, authorization, routes, and server contracts.

---

## 📦 Scope

**In scope**

- Public storefront, authentication/recovery, bag, checkout/return, account, and Staff/Admin UI copy, including accessibility labels, validation, feedback, statuses, charts, and route/access states.
- Browser-local language selection, locale-aware display formatting, Arabic RTL, script-appropriate typography, and bidirectional treatment of mixed-content values.

**Out of scope**

- Persisted catalog/customer content, backend emails/errors, Stripe-hosted Checkout, currency conversion, localized URLs/SEO, browser-language detection, translation services, and account-synchronized preference.
- Backend/schema/database changes, locale headers or GraphQL arguments, and generated GraphQL changes.

---

## ⚙️ Assumptions & Constraints

**Technical**

- Supported language IDs are exactly `en`, `ar`, `th`, and `zh-Hans`. English is the startup and missing-key fallback.
- Resources are bundled JSON. The only added runtime dependencies are `i18next` and `react-i18next`; no translation request is made at runtime.
- The `book-store-language` preference is per browser origin. Unavailable storage permits in-memory switching for the current page.
- Display formatting uses selected-locale USD, browser-local time, and the Gregorian calendar. Native numeric/date inputs, API values, IDs, enum values, and persisted records stay canonical.

**Product / Business**

- Language switching preserves route/query state, session, bag, values, focus, dialogs, and transaction identity.
- Arabic has RTL document direction and logical shell/portal layout; email, IDs, URLs, tracking values, and numeric-entry fields remain legible in their required direction.

**Dependencies**

- The feature uses existing React, TypeScript, Radix/shadcn controls, Vitest, Playwright, and isolated browser fixtures.

---

## 🧩 Delivered behavior and architecture

- `src/lib/i18n/index.ts` owns the initialized i18next instance, preference validation/storage, `lang`/`dir` document updates, supported language metadata, and deferred feedback descriptors. It loads `common`, `storefront`, and `admin` resources from `src/lib/i18n/locales/<language>/`.
- Language is available as an inline, expandable Account-menu radio group in storefront and workspace headers. It remains available to storefront guests and uses the native self-identifying names. Shared dialogs and sheets retain `LanguageSwitcher` by default; focused search drawers and compact notification overlays explicitly omit the duplicated selector and inherit the application language.
- `src/lib/format.ts` renders display-only money, number, date, and date-time values with the active locale while preserving the dashboard BigInt exact-money path.
- Translation keys and parameters are resolved at render time for live validation, feedback, navigation, activity, and status content. Structured error codes select localized, operation-specific messages; raw server prose is not surfaced.
- Arabic uses logical layout, direction-aware portal primitives, selective directional-icon handling, language-appropriate system-font fallbacks, and `bdi`/`dir` isolation for mixed-script values. Header/footer wordmarks remain LTR-isolated, and the book-page byline separates its translated prefix from the bidi-isolated author link.
- API/data contracts are unchanged: no locale reaches `/graphql`, `/api/auth`, upload/media endpoints, or Stripe redirects.

---

## ✅ Acceptance Criteria

**Functional**

- [x] Both shells offer all four languages through Account menus; selection persists across reload and logout, and blocked/invalid storage safely falls back to English or current-page memory.
- [x] Scoped routes provide application-owned visible and accessible text, validation, feedback, status, activity, and chart copy from complete resources.
- [x] Switching preserves active form, dialog, focus, route/query, session, bag, and checkout state without duplicate mutations.
- [x] Arabic sets RTL, provides direction-aware shells and portaled controls, and restores LTR after switching back.
- [x] Selected-locale USD, country names, Gregorian dates, local timezone, and exact dashboard cents are correct.
- [x] Canonical content, enums, IDs, filters, API payloads, permissions, and persisted commerce records remain unchanged.

**Non-functional**

- [x] Resources have nonempty key coverage, aligned placeholders, required plural families, typed keys, and English runtime fallback.
- [x] Automated browser accessibility-tree and keyboard/focus checks cover translated controls and overlays. This is not a human screen-reader study.
- [x] The four languages pass desktop 1280px, mobile 375px, actual native 200% browser zoom, and light/dark themes without page-wide overflow.
- [x] Frontend unit, lint, build, SQLite browser, localization matrix, visual QA, and coordinated disposable PostgreSQL browser verification are recorded in [VERIFICATION.md](VERIFICATION.md).

---

## 🧪 Validation and delivery

- The isolated `bun run test:localization` matrix covers 27 routes per language/mode/theme condition. It records screenshots, geometry, and browser accessibility snapshots; it verifies native zoom through a temporary Chromium profile, DPR 2, `visualViewport.scale === 1`, and CDP CSS visual-viewport zoom 2.
- The consolidated audit records 24 theme conditions and 648 route visits with no page overflow, raw resource key, or unnamed interactive-role finding. A separate chart-tooltip audit records 32 passing checks across languages, themes, mobile/native zoom, and two chart types.
- Independent AI reviewers examined every Arabic (891 strings), Thai (861), and Simplified Chinese (861) resource string against English, including placeholders and plurals. They corrected 22 keys. Rendered visual QA then reviewed the 648 route audits and 32 chart checks with no material clipping, overlap, RTL, wrapping, readability, focus, or accessible-name defect.
- The frontend final evidence is 315 passing tests in 58 files, passing lint, and a passing production build with the pre-existing Vite chunk-size warning. The backend evidence is 322 passing tests, 2 skipped, a passing build/lint/script type check, and 79/79 disposable PostgreSQL browser journeys. No API change was introduced by the readiness-test fix.
- Human native-speaker sign-off was explicitly designated optional by the user and was not performed.

---

## ⚠️ Risks and decisions

- **Translation quality:** automated parity, independent AI review, and visual QA do not establish human native-speaker approval. That approval is optional, was not performed, and remains a possible editorial follow-up.
- **External surfaces:** catalog data, backend email/error prose, and hosted Checkout are intentionally outside localization scope and can remain in their source language.
- **Accessibility method:** browser rendering, screenshots, geometry, accessibility snapshots, and keyboard/focus checks support technical acceptance; they do not substitute for a human assistive-technology study.
