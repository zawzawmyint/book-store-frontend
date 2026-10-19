# 🌐 Storefront and Admin Localization Implementation Plan

> **Goal:** Implement the proposed English, Arabic, Thai, and Simplified Chinese frontend localization using i18next and react-i18next while preserving existing commerce behavior.

---

## 🎯 Objective

Replace embedded English UI copy and inconsistent formatting with one shared translation system. Implementation is now delivered; this plan remains the design and execution record while final acceptance stays open. See the [feature specification](../../../specs/localization/SPEC.md) for the delivered contract, verification evidence, and outstanding review.

---

## 📦 Scope

**In scope**

- Four languages across storefront, auth/account/checkout, and Staff/Admin, including shared controls, errors, validation, charts, display formatting, RTL, typography, and tests.

**Delivery state**

- Delivered: i18next 26.5.2 and react-i18next 17.1.0; bundled `common`, `storefront`, and `admin` JSON resources for `en`, `ar`, `th`, and `zh-Hans`; browser-local preference; locale formatting; translated validation/error feedback; RTL; and a compact 44px icon-only language control in storefront/workspace headers and shared dialog/sheet content.
- Pending acceptance: actual 200% zoom, comprehensive visual/native-language review, and PostgreSQL browser parity. The PostgreSQL command currently times out before browser tests in its compiled SQLite readiness smoke.

**Out of scope**

- Backend changes, emails, hosted Stripe UI, catalog-content translation, localized URLs/search/sorting, currency changes, account language preferences, and automatic browser-language detection.

---

## ⚙️ Assumptions & Constraints

**Technical**

- Add only `i18next` and `react-i18next`; bundle JSON resources; use `Intl` formatting. Keep frontend Bun 1.3.14 and existing Node/toolchain requirements.
- IDs: `en`, `ar`, `th`, `zh-Hans`; initial and fallback language: `en`; localStorage key: `book-store-language`.
- Formatting locales: `en-US`, `ar`, `th-TH`, `zh-CN`; currency: `USD`; calendar: `gregory`; timezone: browser local.
- Preserve canonical IDs/enums, routes/query strings, form payloads, validation limits, auth/roles, cart persistence and revisions, and checkout idempotency. No generated GraphQL edits.
- Follow failing behavior test → observed intended failure → minimal implementation → passing tests for each delivery slice. Keep tests proportional to observable risk, not one test per string.

**Product / Business**

- Keep brand and persisted content as entered. Use reviewed translation copy; record linguistic-review limitations separately from technical verification.
- Language switching must preserve values, dialogs, focus, and transaction state. Existing numeric input syntax remains unchanged with translated guidance.

**Dependencies**

- Existing frontend controls, forms, tests, and isolated backend browser fixture. Consult current Context7 docs for package APIs during implementation.
- Proposed files named below are new deliverables, not existing modules. Current repository is split into separate frontend/backend Git repositories; work belongs to the frontend.

---

## 🧩 Proposed Approach

- [i18n/index.ts](../../../src/lib/i18n/index.ts) owns initialization, metadata, supported-language validation, storage, transient message descriptors, and document language/direction. It exports `type Language = 'en' | 'ar' | 'th' | 'zh-Hans'`, `initializeLocalization(): void`, `setLanguage(language: Language): Promise<void>`, the initialized instance, and supported-language metadata. It does not add a parallel Zustand language store.
- [locales/](../../../src/lib/i18n/locales/) contains `<language>/common.json`, `storefront.json`, and `admin.json`; [i18next.d.ts](../../../src/lib/i18n/i18next.d.ts) provides semantic key typing from English resources.
- [LanguageSwitcher.tsx](../../../src/app/components/LanguageSwitcher.tsx) consumes the single runtime. It is a 44px icon-only trigger with a translated accessible label and sr-only current native-language name; its dropdown retains full self-identifying options. It is mounted in [Layout.tsx](../../../src/app/Layout.tsx), [AdminLayout.tsx](../../../src/features/admin/AdminLayout.tsx), and shared dialog/sheet content; [main.tsx](../../../src/main.tsx) initializes the runtime.
- Extend [format.ts](../../../src/lib/format.ts) with `money(cents: number, language?: Language): string`, `formatNumber(value: number | bigint, options?: Intl.NumberFormatOptions, language?: Language): string`, `formatDate(value: string | Date, language?: Language): string`, and `formatDateTime(value: string | Date, language?: Language): string`. Preserve `serverDate`; default helpers to the active language and render consumers through translation subscriptions so they refresh on switching.
- Proposed [errors.ts](../../../src/lib/i18n/errors.ts) resolves known code/context pairs to translation keys and operation-specific fallback keys. Keep classification independent of translated messages; pass verified structured codes and explicit operation context from each caller.
- Adjust existing navigation/status/activity maps and validation schemas to hold keys or accept the current translation function. Localize transient feedback at render time. Keep persisted commerce shapes unchanged.
- Arabic uses document RTL, explicit portal direction, logical styles, right-side sidebar/sheet, selective arrow mirroring, bidirectional text isolation, and script-aware system fonts in [index.css](../../../src/index.css).
- **API/data contracts:** unchanged. Language preference is the only new browser-persisted value. No locale is sent to the backend.

---

## 🚀 Execution Plan

The checklist below is the original execution record and intentionally remains unchecked; it is not a claim that each historical substep was independently witnessed. The delivered behavior and evidence are recorded in the feature specification. Remaining acceptance work is limited to the pending checks listed in Scope and Validation Plan.

1. **Establish runtime and preference behavior** — _(role: frontend)_ — a typed four-language runtime and resilient startup.

   - [ ] Confirm a clean/understood frontend working tree and run the existing relevant baseline. Inventory app text, raw errors, static maps, physical CSS, and browser fixtures before extraction.
   - [ ] Add proposed `src/lib/i18n/i18n.test.ts` behavior cases: missing/invalid preference selects `en`; each supported preference restores; blocked reads/writes allow in-memory switching; `ar` sets `lang/dir`, and `zh-Hans` restores LTR; a missing translated key falls back to English. Run `bun run test -- i18n` and observe the intended missing-runtime failure.
   - [ ] Install the two packages with `bun add i18next react-i18next`, add initial resources/types/runtime, and initialize before React mount. Keep test initialization independent of the production singleton where appropriate; reset language/storage/document attributes after relevant tests. Update existing render helpers only where needed; do not globally mock away translations.
   - [ ] Rerun the focused tests and TypeScript build; inspect `package.json` and `bun.lock` for the two intended direct dependency additions. Commit the passing slice with the proposed spec kept Proposed.

2. **Deliver shared selection and shell translation** — _(role: frontend)_ — an accessible selector in both shells with shared, persistent state.

   - [ ] Add proposed `src/app/components/LanguageSwitcher.test.tsx` with a real isolated translation runtime. Assert the four native language names, selected option, keyboard selection, immediate language update, and storage-failure behavior. Run `bun run test -- LanguageSwitcher` and confirm the intended failure.
   - [ ] Implement the shared Select control; mount in both headers, including mobile/collapsed-sidebar layouts. Translate shell menus, search UI, footer, theme/access controls, route fallback, shared primitive labels, and document-title tagline. Review `src/app/components/ui/{select,dropdown-menu,dialog,sheet,sidebar,tooltip}.tsx` for application-owned copy and direction propagation.
   - [ ] Replace static English navigation display values in `src/features/admin/admin-navigation.ts` with render-time translation keys while retaining route matching and role filtering. Update associated tests to assert the same permissions and destinations.
   - [ ] Add an initial `e2e/localization.spec.ts` case using existing isolated login helpers: switch in storefront, open the authorized workspace, reload, return to store, and log out; assert the same preference and unchanged URLs. Run `bun run test:e2e -- localization.spec.ts` plus focused navigation tests, then commit the passing slice.

3. **Centralize display formatting without losing precision** — _(role: frontend)_ — locale-consistent dates, numbers, country labels, and USD totals.

   - [ ] Add proposed `src/lib/format.test.ts` cases for all four locales, local-zone Gregorian Thai dates, legacy SQLite UTC strings, USD currency, and decimal/sign behavior. Extend `dashboard-format.test.ts` for zero, negative cents, and `9007199254740993123` cents without Number rounding. Assert expected locale parts rather than fragile whitespace glyphs. Run `bun run test -- format` and confirm failures for missing behavior.
   - [ ] Implement the specified formatting interfaces; adapt `src/features/checkout/delivery-address.ts` country labels and `src/features/admin/dashboard/dashboard-format.ts` exact-money formatting. Keep chart safe-number guards and preserve sub-dollar signs/cents.
   - [ ] Replace display-only date/number calls in orders/account/admin, dashboard charts/shared/finance, and `src/app/components/ui/chart.tsx`. Ensure each mounted consumer subscribes to language changes. Preserve native date fields, date-filter bounds, canonical IDs, and price/stock parsing.
   - [ ] Run formatting, delivery-address, activity-data, dashboard, and affected order tests. Verify the exact-money path with large values and language switching; commit the passing slice.

4. **Translate storefront, account, and commerce feedback** — _(role: frontend)_ — complete customer interface coverage without changing transactions.

   - [ ] Add focused behavior assertions to existing auth/profile/address/checkout tests: invalid form messages use the chosen language, changing language updates a visible error while preserving entered values, and unknown failures use a translated contextual fallback. Assert one known structured verification/checkout recovery retains its existing action. Run affected test files and observe the intended missing-translation failures.
   - [ ] Extract text from `src/features/books/`, `cart/`, `checkout/`, `auth/`, `account/`, and `orders/` into resources, including plural counts, accessible labels, cover placeholders, payment/delivery badges, timelines, recovery states, and demo controls. Keep book data and backend enum values untouched.
   - [ ] Add the error-code/context resolver using verified existing contracts; migrate raw user-visible errors and long-lived transient feedback to key/parameter representations. Pay particular attention to `cart-store.ts`, `CartFeedback.tsx`, `AccountProfile.tsx`, `CheckoutPage.tsx`, and `AuthEmailPages.tsx`; do not alter persisted cart/checkout shapes or their control flow.
   - [ ] Use locale-aware schema factories or key-based messages for validation. Translate schema-generated size/type errors as well as explicit messages; re-render or revalidate only currently displayed errors after switching, without submitting or clearing inputs. Retain all normalization/limits.
   - [ ] Run affected customer tests plus existing checkout/auth/cart browser journeys. Extend localization E2E to submit one non-English checkout against isolated fixtures and inspect canonical country/currency/quantity values and unchanged payment behavior. Commit the passing slice.

5. **Translate the full Staff/Admin workspace** — _(role: frontend)_ — localized operational screens, dialogs, search, and analytics.

   - [ ] Extend existing tests for `BookFormPage`, `StockDialog`, `ActivityPage`, `WorkspaceSearchDialog` behavior where covered by existing suites, and `DashboardPage`: translated field errors/status/count/tooltip content refresh after switching; canonical enums/filters and exact money remain unchanged. Add only missing meaningful coverage. Observe the intended failures before implementation.
   - [ ] Extract all text in `src/features/admin/pages/`, `components/`, `search/`, and `dashboard/`. Translate roles, verification badges, search groups, status labels, chart legends/tooltips/axes, period labels, activity actions/fields, empty/loading states, upload guidance, confirmations, refunds, and retries.
   - [ ] Update `admin-navigation.ts`, `activity-data.ts`, `book-form.ts`, and shared order/payment status maps to resolve keys at render time. Localize `AdminFeedback` and access-boundary raw errors using verified codes. Preserve audit values, role checks, numeric parser syntax, and operational confirmation semantics.
   - [ ] Run affected admin tests and browser journeys; add localization E2E assertions for Staff versus Admin permissions and non-English book/stock validation. Commit the passing slice.

6. **Complete Arabic interaction and script typography** — _(role: frontend)_ — usable RTL navigation and mixed-script content.

   - [ ] Add Arabic browser assertions for right-side desktop sidebar/mobile sheet, correctly positioned select/dialog portals, back navigation, Escape/focus restoration, language return to LTR, and no page-wide overflow at 375px. Test switching with a dirty form and an open dialog without losing state or issuing a mutation. Observe failures before layout changes.
   - [ ] Replace directional spacing/alignment/positioning where semantics require it. Explicitly configure portal/primitives direction using supported existing package APIs; review `AdminLayout.tsx`, storefront menus/search, `sidebar.tsx`, `sheet.tsx`, dialogs, tables, and pagination. Do not blanket-reverse charts or icons.
   - [ ] Apply bidi isolation to identifiers/contact/tracking data and `dir="auto"` to arbitrary content as appropriate. Add script-aware system-font fallbacks, line heights, and tracking overrides in `src/index.css`; preserve English brand typography.
   - [ ] Run localization/sidebar/search/dialog browser coverage. Manually inspect Arabic, Thai, and Chinese at 375px and desktop in both themes, including actual 200% browser zoom, long text, mixed-script values, charts, tables, and controls. Record evidence and unresolved gaps. Commit the passing slice.

7. **Close translation coverage and reconcile documentation** — _(role: frontend)_ — a verified, reviewable delivery with explicit limitations.

   - [ ] Add proposed `src/lib/i18n/resources.test.ts`: nonempty values, namespace/key parity across all four languages, matching interpolation parameters, and language-appropriate plural families. For plurals, compare logical key families and `Intl.PluralRules` categories rather than requiring identical English/Arabic suffix sets. Assert required Arabic plural variants and English runtime fallback.
   - [ ] Audit remaining literal copy and raw `.message` rendering across all route groups, primitives, static maps, validators, stores, and chart formatters. Review translation meaning and placeholder placement. Test resource integrity, current-language re-rendering, unknown-error fallbacks, blocked storage, exact totals, and direction round trips.
   - [ ] Run `bun run test`, `bun run lint`, `bun run build`, and `bun run test:e2e` in the frontend. Coordinate `bun run test:postgres:browser` in the sibling backend under existing disposable-fixture guidance. Investigate failures before declaring success; record actual outputs and bundle changes.
   - [ ] Reconcile root `SPEC.md`, `README.md`, this feature spec, and affected feature documentation with delivered behavior. For implementation, delegate final reconciliation to the global spec-updater with ownership of documentation only, wait for its result, and review the diff; perform reconciliation inline if delegation is unavailable. Do not mark unverified acceptance criteria implemented.
   - [ ] Review the final diff for scope, dependency, API, generated-file, and storage-contract changes. Commit only reviewed task files. Report validation evidence and any outstanding linguistic/visual review separately.

---

## ✅ Acceptance Criteria

**Functional**

- [ ] All four languages work across both shells and scoped routes, including accessibility copy, forms, validation, feedback, status, activity, and charts.
- [ ] Preference restores safely; missing/invalid/blocked storage recovers; switching preserves input, focus, route/query, auth/cart, dialogs, and transaction identity.
- [ ] Arabic RTL and its mobile/portaled interactions work and restore LTR on switching.
- [ ] Selected-locale USD, country names, Gregorian dates, local timezone, and exact dashboard cents are correct.
- [ ] Canonical content, enums, IDs, API payloads, permissions, and checkout/cart behavior remain unchanged.

**Non-functional** (performance, security, accessibility, reliability)

- [ ] Complete nonempty resource coverage with typed keys, correct interpolation/plurals, and working fallback; no raw server messages or unsafe HTML rendering.
- [ ] Keyboard/focus, mobile, light/dark, mixed-script, typography, and actual 200% zoom checks pass or remain explicitly open.
- [ ] Only two direct runtime dependencies added; bundled resources require no external service and import no admin feature runtime.
- [ ] Required frontend checks and coordinated commerce browser verification pass with evidence.

---

## 🧪 Validation Plan

**Manual tests**

- Outstanding: inspect all route groups in all languages, including actual 200% browser zoom, desktop/mobile light/dark layouts, Thai/Chinese wrapping, mixed-script data, charts, and Arabic portals. Perform a native semantic review of shipped Arabic, Thai, and Simplified Chinese copy.

- Inspect all route groups in all languages; review translations semantically. Exercise Arabic desktop/mobile sidebar, selectors, dialogs, tables, search, mixed-script inputs, and LTR restoration.
- Check 375px/desktop, light/dark, actual 200% zoom, Thai/Chinese wrapping, chart tooltips, and language switching while a dirty form/dialog/error is active.

**Automated tests**

- Recorded: `bun run test` passed 314 tests in 58 files; lint passed; build passed with the existing Vite chunk-size warning; and all 79 SQLite Chromium journeys passed in 7.9 minutes, including the localization and compact icon-control coverage.
- Outstanding: the backend PostgreSQL browser command timed out in its pre-browser compiled SQLite readiness smoke. A scratch smoke succeeded when given a longer readiness window, but that does not establish PostgreSQL parity.

- Focused runtime/storage/fallback, resource integrity, exact/locale formatting, validation switching, known/unknown error handling, and existing feature regression tests.
- `e2e/localization.spec.ts` plus the full existing English browser suite; use existing isolated SQLite and PostgreSQL fixtures and no production/development writes.
- Run the exact repository commands in Step 7. Keep localization tests isolated and avoid multiplying the entire suite by four when representative journeys and resource checks cover the distinct risks.

**Rollback / mitigation**

- Revert frontend implementation and package/lockfile commits together. Backend contracts/data need no rollback; leftover language preference is harmless. Use English fallback for missing keys, but resolve missing shipped translations before completion.

---

## ⚠️ Risks & Open Questions

**Risks**

- **Risk:** Stale translated validation/feedback or module constants — _Mitigation:_ keep keys/parameters transient and resolve at render time; test switching with active state.
- **Risk:** RTL portal geometry or focus regressions — _Mitigation:_ explicit direction and existing browser interaction tests at desktop/mobile widths.
- **Risk:** Large monetary values rounded during localization — _Mitigation:_ preserve BigInt amounts and verify exact large/negative cents before replacing formatters.
- **Risk:** Apparent completeness despite incorrect translation — _Mitigation:_ separate resource checks from semantic language review and record review gaps.
- **Risk:** Generic error translation loses actionable recovery — _Mitigation:_ map verified codes with operation context and retain existing code-driven workflows.

**Open questions** _(blockers for implementation)_

- None. Proposed decisions are recorded in the linked spec. Linguistic/visual verification availability may block acceptance sign-off, not implementation work.
