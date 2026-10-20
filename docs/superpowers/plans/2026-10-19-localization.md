# 🌐 Storefront and Admin Localization Implementation Plan

> **Goal:** Implement the proposed English, Arabic, Thai, and Simplified Chinese frontend localization using i18next and react-i18next while preserving existing commerce behavior.

---

## 🎯 Objective

This completed plan replaced embedded UI copy and fixed display formatting with one shared localization system. The delivered contract and verification evidence live in the [feature specification](../../../specs/localization/SPEC.md) and [verification record](../../../specs/localization/VERIFICATION.md).

---

## 📦 Scope

**In scope**

- Four bundled UI languages across storefront and workspace routes, locale-aware display formatting, Arabic RTL, and isolated browser verification.

**Out of scope**

- Backend localization, persisted catalog/customer content, hosted payment pages, localized URLs, currency conversion, and account-synchronized preference.

---

## ⚙️ Assumptions & Constraints

**Technical**

- `en`, `ar`, `th`, and `zh-Hans` are the only language IDs; English remains the initial and missing-key fallback.
- Preference stays browser-local under `book-store-language`; no locale is sent to the backend.

**Product / Business**

- Language changes preserve existing commerce and authorization behavior.

**Dependencies**

- The feature adds only `i18next` and `react-i18next` at runtime.

---

## 🧩 Proposed Approach

- A single `src/lib/i18n` runtime serves bundled `common`, `storefront`, and `admin` JSON namespaces and updates document language/direction.
- Render-time translation keeps validation, feedback, status, and format output current after a switch. Arabic uses logical layout and bidi isolation where content direction differs.
- The `LanguageSwitcher` appears in shells and shared focus-trapped overlays. Playwright records route geometry, screenshots, browser accessibility snapshots, and keyboard/focus behavior.

---

## 🚀 Execution Plan

1. **Runtime and resources** — _(role: frontend)_ — completed typed four-language runtime, resource namespaces, persistence, fallback, and locale-aware formatting.
2. **Localized UI and RTL** — _(role: frontend)_ — completed storefront/workspace copy extraction, translated feedback/validation, portal direction, wordmark isolation, and mixed-script handling.
3. **Verification and reconciliation** — _(role: frontend)_ — completed frontend, SQLite/PostgreSQL browser, native-zoom, visual, and independent AI linguistic evidence; reconciled canonical documentation.

---

## ✅ Acceptance Criteria

**Functional**

- [x] Four-language storefront and workspace behavior, persistence, RTL, localized formatting, and unchanged API/data contracts are delivered.
- [x] Translation resources, placeholders, plural forms, and structured-error paths are verified.

**Non-functional** (performance, security, accessibility, reliability)

- [x] Desktop, mobile, actual native 200% zoom, themes, keyboard/focus behavior, visual QA, and browser accessibility snapshots passed recorded checks.
- [x] Frontend and disposable PostgreSQL browser validation passed; the existing Vite chunk-size warning remains.

---

## 🧪 Validation Plan

**Manual tests**

- Independent AI semantic reviews and rendered visual QA completed. Human native-speaker sign-off is optional and was not performed.

**Automated tests**

- 315 frontend tests in 58 files, lint, build, 79 SQLite browser journeys, 648 localization route audits, 32 chart-tooltip checks, and 79 PostgreSQL browser journeys passed. See [VERIFICATION.md](../../../specs/localization/VERIFICATION.md).

**Rollback / mitigation**

- Revert the feature's frontend implementation and dependency/lockfile changes together. The browser preference is inert in a prior version.

---

## ⚠️ Risks & Open Questions

**Risks**

- **Risk:** Independent AI review and visual QA do not replace human native-speaker approval. — _Mitigation:_ keep the review method and optional follow-up explicit.

**Open questions** _(blockers for implementation)_

- None. Human native-speaker review is an optional editorial follow-up.
