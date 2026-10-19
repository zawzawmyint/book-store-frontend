# 🌐 Storefront and admin localization specification

> **Goal:** Provide complete English, Arabic, Thai, and Simplified Chinese interface text and consistent formatting across the storefront and Staff/Admin workspace.

**Status:** Proposed — implementation is delivered, but final acceptance verification remains pending.

**Date:** 2026-10-19

**Implementation plan:** [Localization implementation plan](../../docs/superpowers/plans/2026-10-19-localization.md)

---

## 🎯 Objective

The delivered frontend replaces embedded application copy and fixed display formatting with one shared localization system, without changing commerce or authorization behavior. The remaining acceptance work is visual/native-language review, actual 200% browser-zoom verification, and coordinated PostgreSQL browser parity.

---

## 📦 Scope

**In scope**

- All application-owned interface copy in public storefront, authentication/recovery, bag, checkout/review/return, account, and Staff/Admin routes, including not-found and access boundaries.
- Shared primitives' visible and accessible text, navigation, dialogs, tooltips, status badges, chart labels/tooltips, activity presentation, validation, loading/empty/success/error states, and development demo-login labels.
- Persistent language selection, locale-aware display formatting, Arabic RTL, script-appropriate typography, and regression coverage.

**Out of scope**

- Translation of book titles, descriptions, authors, stored genres, customer names, addresses, staff-entered notes/reasons, tracking details, or other persisted content. Brand name **The Quiet Shelf** remains unchanged.
- Backend email templates, backend error wording, Stripe-hosted Checkout language, translated catalog search/sorting, currency conversion, multi-currency payments, localized URLs/SEO, browser language detection, translation services, and account-synchronized language preferences.
- Backend/schema/database changes, generated GraphQL changes, or translation dependencies in the backend.

---

## ⚙️ Assumptions & Constraints

**Technical**

- Add only `i18next` and `react-i18next` as frontend runtime dependencies; commit the updated frontend `bun.lock` when implementation installs them. Resolve compatible stable versions at implementation time.
- Bundle repository-owned JSON resources. Do not add HTTP translation backends, language detectors, translation SaaS, or a second global language store.
- Preserve routes, query strings, safe return paths, authentication/roles, theme, cart ownership/revisions, checkout idempotency, upload behavior, and existing request contracts.
- Backend identifiers/enums, country codes, amount units, and form payloads remain canonical. Translate presentation, never API identifiers.

**Product / Business**

- English is the initial default and missing-key fallback. Supported language IDs are exactly `en`, `ar`, `th`, and `zh-Hans`.
- The language preference belongs to this browser origin, independent of the signed-in account; logout does not clear it.
- USD remains the only transaction currency. Dates use the browser's local timezone and the Gregorian calendar in every language, including Thai; a language change does not change timestamps or date-filter boundaries.
- Native numeric/date controls retain existing parsing and machine-value conventions. Do not introduce localized numeral or decimal parsing. Show translated format guidance where required, especially admin price and stock entry.

**Dependencies**

- Reuse existing React, TypeScript, Radix/shadcn controls, CSS tokens, form tooling, Vitest, and Playwright. Use the isolated API from `e2e/server.ts` for browser tests.
- Translation copy requires semantic review, especially Arabic plurals, payment/refund language, and Thai line breaks. Automated completeness checks do not establish linguistic accuracy.

---

## 🧩 Proposed behavior and architecture

### Delivered language initialization and preference

- `src/lib/i18n/index.ts` owns the single initialized i18next instance, supported-language metadata, deferred transient-message helpers, and preference helpers. `src/main.tsx` initializes it before React mounts with bundled resources and English fallback; no language-loading network request is required.
- Save the selected language as a plain supported ID under localStorage key **`book-store-language`**. Accept only the four supported values; absent, malformed, or unsupported values resolve to `en`.
- Storage reads/writes are guarded. If storage is blocked, the selected language works in memory for the current page; reload returns to English unless a prior readable preference exists. No cookie or server preference is introduced. Live cross-tab synchronization is outside this first delivery.
- Set `document.documentElement.lang` to the selected ID, and `dir` to `rtl` for `ar`, otherwise `ltr`, at initialization and on every switch. Localize the existing document-title tagline while keeping the brand name.
- Language changes update mounted content immediately without navigating or remounting the app/session boundary. Preserve location, active filters, entered form values, bag contents, and open-dialog state. Do not refetch server data solely because the language changes. Recompute visible validation and feedback text in the new language.

### Delivered language selector

- Shared `src/app/components/LanguageSwitcher.tsx` appears as an icon-only, 44px control in the storefront and workspace headers and remains reachable on narrow screens and in collapsed-sidebar mode. Shared dialog/sheet content also renders the control, so it can change language within an active focus trap.
- Options use self-identifying labels **English**, **العربية**, **ไทย**, and **简体中文**, with appropriate option `lang` attributes. The control uses the existing Select primitive with a translated accessible label and an sr-only selected native name; it does not use flags or a text label in either header.
- Keyboard access, visible focus, selected-state announcement, and focus retention follow existing controls. Storefront and workspace share the same selected language in the same browser session and after reload.

### Delivered resources and translation conventions

- `src/lib/i18n/locales/<language>/{common,storefront,admin}.json` contains three namespaces per language. `common` owns genuinely shared actions, validation, status, and feedback copy; feature-specific text stays in its corresponding namespace.
- Use stable semantic keys and TypeScript key typing through `src/lib/i18n/i18next.d.ts`. English resources are the type source. Resources do not import feature code or generated runtime modules.
- Translate complete sentences with interpolation, not concatenated fragments. Use i18next count-based plurals for quantities and result counts; supply Arabic zero/one/two/few/many/other forms where required. Thai and Chinese use their language's plural rules.
- Escape untrusted text through normal React rendering. Do not render raw translated HTML. Use structured React translation components only when inline links/emphasis require them.
- Represent navigation/status/activity display labels as translation keys or resolve them at render time. Keep canonical enum keys and IDs unchanged for filtering, authorization, GraphQL, history, and persistence. No module-level translated constants that become stale after a switch.
- All shipped keys must have nonempty translations. English fallback is a runtime recovery mechanism, not permission to ship untranslated supported-language screens.

### Delivered formatting

- Extend `src/lib/format.ts` with locale-aware money, number, date, and date-time display helpers; reuse `serverDate` for legacy UTC parsing. Derive the formatting locale from the selected language: `en-US`, `ar`, `th-TH`, `zh-CN`, respectively.
- Monetary displays always format **USD**, even when the locale changes currency-symbol position or digits. Do not assume the displayed symbol is always `$`.
- Use explicit selected locale, local timezone, and `calendar: 'gregory'` for displayed dates. Keep date input values and API timestamps unchanged. Preserve existing date-only versus date-time precision at each call site.
- Country names use `Intl.DisplayNames` with the selected formatting locale; the submitted value remains its existing country code.
- Adapt `src/features/admin/dashboard/dashboard-format.ts` without converting exact monetary strings/BigInt totals to imprecise Number values. Preserve cents, signs, and safe chart-conversion behavior; chart axes/tooltips use localized numbers and USD labels. Test values above `Number.MAX_SAFE_INTEGER`.
- Localize numbers embedded in UI sentences explicitly before interpolation; retain canonical identifiers such as order IDs. No change to business calculations or catalog sorting.

### Delivered validation and server errors

- Replace hardcoded messages in auth/profile, address, book/stock forms, activity filters, cover feedback, cart, and checkout with translation keys or locale-aware schema factories. Preserve existing validation constraints, normalization, limits, error association, and form values.
- Store translation keys and interpolation parameters rather than already-translated sentences where feedback outlives a render. Existing persisted cart envelopes and checkout-attempt records must not change shape; keep new feedback metadata transient.
- `src/lib/i18n/errors.ts` maps existing stable GraphQL/auth/upload error codes to localized, operation-appropriate messages. It does not classify errors by English message substring or translate raw server prose.
- Where an existing code is too broad or no stable code exists, use a translated operation-specific fallback. Preserve code-driven recovery behavior: verification/resend, session redirects, quote refresh/review, conflicts, stock reconciliation, payment retry, and rate-limit timing. Do not collapse these into one generic failure flow.
- Remove raw `error.message` from user-facing surfaces. Do not expose server internals or introduce backend contract changes just to achieve localized wording.

### Delivered Arabic RTL and typography

- Mirror directional placement through logical CSS properties/classes and explicitly pass direction to menus/selects/dialog primitives where needed; document `dir` alone is insufficient for every portaled control.
- Workspace sidebar and mobile sheet open on the right in Arabic, and return to the left in other languages. Preserve collapse, keyboard operation, escape, focus trap, focus restoration, and contained table overflow.
- Flip only directional affordances such as back/forward chevrons. Brand, book covers, search/cart/status icons, chart data semantics, and image content must not be blanket-mirrored.
- Isolate mixed-script content with `dir="auto"`/`bdi` as appropriate; emails, URLs, canonical IDs, tracking numbers, and numeric-entry fields remain readable in their required direction. Do not force arbitrary customer/book text to LTR.
- Add language-specific system-font fallbacks in `src/index.css` for Arabic, Thai, and Simplified Chinese rather than downloading large font families in this phase. Keep the existing Latin fonts for English and brand styling. Check shaping, glyph coverage, line height, wrapping, and avoid applying Latin-style tracking/uppercase presentation to translated script text.
- At 375px mobile, desktop, and actual 200% browser zoom, navigation, labels, forms, dialogs, charts, and tables remain usable without page-wide horizontal overflow. Tables may retain their existing contained scrolling.

### Delivered route coverage and API contracts

- Apply to every route registered by `src/app/App.tsx`: public `/`, `/books`, `/books/:id`, `/cart`, authentication/recovery routes, checkout/return, account profile/orders, and `/admin` descendants, plus wildcard and access states.
- Existing `/graphql`, `/api/auth`, upload/media endpoints, and Stripe redirects retain their contracts. No locale header, query argument, schema field, database migration, or backend implementation is required.
- Backend emails and hosted payment pages may remain English; completion claims must explicitly describe these boundaries.

---

## ✅ Acceptance Criteria

**Functional**

- [ ] Both shells offer the four named languages; changing one updates both surfaces, reload restores the choice, and logout preserves it. Automated runtime and browser coverage exists; final visual acceptance remains open.
- [x] Missing/invalid preferences start in English; blocked storage does not prevent language switching or normal app use. Covered by focused runtime and SQLite browser tests.
- [ ] Every application-owned visible/accessibility string in the scoped routes has a complete translation, including shared controls, validation, charts, feedback, and status labels. Resource parity checks pass; broad human copy review remains open.
- [ ] Switching while a form, dialog, error, or notification is visible translates that state without losing input, focus, route/query context, session, cart, or checkout identity, and without duplicate mutations. Representative automated coverage passes; final visual acceptance remains open.
- [ ] Arabic sets RTL and mirrors shell/sidebar/dialog placement correctly; switching back restores LTR without reload. Targeted browser coverage passes; broad visual review remains open.
- [x] Display formatting uses the selected locale, Gregorian dates, local timezone, and USD; exact dashboard totals retain every cent and sign. Focused formatting tests pass.
- [x] Known structured failures receive localized messages and retain existing recovery actions; unknown failures receive localized contextual fallbacks. Focused error and checkout coverage passes.
- [x] Canonical enum values, IDs, filters, catalog text, API payloads, and persisted commerce records remain unchanged. Targeted SQLite integration coverage passes; PostgreSQL parity is still pending.

**Non-functional**

- [ ] Language selection and translated controls remain keyboard/screen-reader accessible; mixed-script data remains readable. Automated accessibility interactions pass; manual assistive-technology review remains open.
- [ ] All four languages work at desktop/mobile widths and 200% browser zoom in light/dark themes; Arabic portals and mobile navigation restore focus correctly. Actual 200% zoom and broad visual checks remain open.
- [x] JSON resource checks verify key/placeholder parity, required plural coverage, and nonempty values; runtime fallback and TypeScript translation-key checks pass.
- [x] Exactly two runtime packages are added; translations require no external service/network request; no eager import of admin feature code is introduced by resources.
- [ ] Existing frontend tests, lint, build, and isolated browser journeys pass. SQLite evidence is recorded; PostgreSQL browser coordination remains blocked by the backend command's pre-browser readiness timeout.

---

## 🧪 Validation and delivery

- Add focused runtime/preference, resource-parity, formatting/BigInt, error mapping, and live validation-switch tests. Initialize/reset isolated i18next instances in relevant tests; avoid shared test-language leakage and mocks that only echo keys for localization assertions.
- Add `e2e/localization.spec.ts` using existing customer/Staff/Admin fixture helpers. Verify four-language switching and persistence, representative translated routes, permission boundaries, Arabic desktop/mobile portals, and a checkout journey with unchanged canonical values. Retain the English regression suite.
- Manually inspect script rendering, translation meaning, mixed-direction data, chart/tooltips, all scoped route groups, and actual 200% browser zoom. Record missing linguistic or visual verification rather than marking it passed.
- Completed evidence: `bun run test` passed 314 tests in 58 files; lint passed; build passed with the pre-existing Vite chunk-size warning; and all 79 SQLite Chromium journeys passed in 7.9 minutes, including the six localization journeys and icon-control assertions for both headers. The backend PostgreSQL browser command timed out in its compiled SQLite readiness smoke before browser tests began; a scratch smoke with a longer readiness window succeeded, so this is a setup limitation rather than PostgreSQL application evidence. Do not modify or seed development/production databases for validation.
- Update the root specification and README after delivered implementation. Keep this spec **Proposed** until its acceptance criteria pass; document unresolved language-review gaps.
- Roll back the frontend feature commits and dependency/lockfile changes together if needed. No database/API rollback is needed. A leftover `book-store-language` preference is inert in the previous application version.

---

## ⚠️ Risks and decisions

- **Incomplete extraction:** copy lives in constants, form schemas, stores, shared primitives, and raw errors as well as JSX. Mitigate with a route/component inventory and source audit plus representative behavior tests.
- **RTL regressions:** physical positioning and portal direction need explicit review; use focused browser interactions and visual checks rather than CSS-only assertions.
- **Translation quality:** resource parity cannot verify meaning. Record semantic review evidence and keep unresolved copy review visible.
- **Money precision:** dashboard amounts are exact strings; preserve the BigInt path and test large and negative values.
- **Scope decisions:** English remains default; Simplified Chinese only; browser-local preference; no auto-detection, account synchronization, emails, hosted-checkout localization, catalog translation, or currency changes.
- **Open blockers:** none for implementation design. Linguistic and visual review evidence is required before declaring the corresponding acceptance criteria verified.
