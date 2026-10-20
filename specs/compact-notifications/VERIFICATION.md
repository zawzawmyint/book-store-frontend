# Compact notification UI verification

Recorded 2026-10-20 on `feat/shadcn-storefront-admin`.

- Before implementation, the new interaction tests failed on the existing modal overlay and missing message-row links. After implementation, the focused notification suite passed **7 tests**.
- `bun run test -- --maxWorkers=2`: **331 tests in 64 files passed**.
- `bun run test:e2e`: **82 passed, 1 intentional native-zoom skip**, in **7.7 minutes**. This run preceded the final RTL alignment correction and the added desktop language matrix.
- The added desktop matrix caught an Arabic anchoring error: manually reversing alignment duplicated Radix's RTL handling. After switching to logical `align="end"`, the focused **7 tests**, `bun run lint`, and `bun run build` passed again.
- Final `bun run test:e2e -- --config playwright.notifications.config.ts`: **3 passed in 1.1 minutes**. It covers 375px mobile and 1280px desktop across four languages, two themes, and both scopes (32 route visits), plus 16 visits at verified native Chromium **200% zoom**. Assertions cover logical bell alignment, viewport bounds, compact desktop width, no desktop overlay, 44px actions, Escape, and focus return. The final full regression suite was not repeated after the one-line RTL correction; the affected matrix and interaction checks were repeated.
- Desktop browser checks also cover outside dismissal and correctly scoped history links. The connected notification journey verifies recipient isolation, durable history, mark-read/count refresh, mobile opening, and inventory-row navigation.
- Screenshots inspected: storefront desktop dark; admin desktop light/dark; mobile admin Arabic dark; corrected desktop admin Arabic light. Icons, compact spacing, readable qualifiers, and scrolling feed limits were reviewed alongside source. Shared history filter/pagination controls were retained without changes.
- Independent code review found no actionable issues, including after the RTL correction. Documentation was reconciled against the delivered code and verification evidence.
- The later component-adoption regression passed 349 unit tests in 71 files, lint, build, and 91 browser tests with one intentional native-zoom skip. Its native four-locale, two-theme zoom matrix rechecked quick-inbox Item/Empty states in both shells. The broader production acceptance gates below remain unchanged.

Build succeeds with the existing bundle chunk-size warning. The isolated browser fixture intentionally disables live transport and logs 503 responses for the SSE endpoint; these runs verify saved-notification UI and do not validate production Redis or streaming infrastructure. Screenshot checks do not constitute full assistive-technology or WCAG certification. Broader production acceptance remains tracked in the [notification verification record](../in-app-notifications/VERIFICATION.md).
