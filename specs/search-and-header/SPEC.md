# Search finder and header preferences

**Status: Implemented**  
**Date:** 2026-10-20  
**Branch:** `feat/shadcn-storefront-admin`

## Scope

Give storefront and admin search a focused finder presentation and reduce persistent header controls. Preserve the existing notification update, routes, access checks, catalog search behavior, workspace debounce/grouping/keyboard behavior, and stored language/theme preferences. No backend, schema, or dependency changes.

## Behavior

- Both searches open a top drawer directly beneath the measured header, with a centered content column up to 48rem, a prominent input, subtle search icon, accessible hidden title, and an Escape close control. The storefront drawer and backdrop begin beneath its header. The workspace drawer matches its header horizontally, while its backdrop begins at the viewport top. Omit generic descriptive headings and the duplicated language switcher. Height follows content up to 70dvh or the remaining viewport height, with internal result scrolling and reduced-motion support.
- Storefront: retain Enter submission to `/books?search=...` and existing catalog query prefill. Preview at most five public books after a 250ms debounce and at least two trimmed characters. Use the existing Books query with a five-item limit. Rows show existing book cover/fallback, title, author and locale-formatted price; clicking or keyboard selection opens the book. A secondary link opens all catalog matches. Loading/error/empty states remain recoverable; clear old-term results immediately and discard closed-overlay results. No recent-search persistence.
- Admin: retain the existing scoped Books/Orders searches, per-group error/retry states, safe detail/list destinations, keyboard combobox behavior and shortcut/access guards. Restyle input, compact grouped rows, secondary links and keyboard footer without adding queries.
- The workspace drawer matches the workspace header's horizontal bounds instead of covering the desktop sidebar. It follows expanded/collapsed sidebar widths, RTL placement, and viewport resizing; mobile remains full-width. Its backdrop starts at the viewport top so the entire workspace, including the sidebar, is dimmed. Storefront positioning remains unchanged.
- Remove standalone Language and Theme controls from both headers. Add shared expandable Language and Appearance groups inside storefront/admin Account menus, using keyboard-accessible Radix radio items. Keep choices within the same menu on mobile and desktop. Show native language names and current selection; Appearance offers Light/Dark. Use existing persistence and cross-tab behavior. Keep menu available to guests and pending/unverified storefront sessions, with Sign in rather than private account links. Preserve profile, orders, workspace access and sign-out behavior.
- Remove the redundant appearance section from mobile store navigation. Other dialogs/sheets retain their language controls by default; search opts out explicitly. Keep existing account trigger labels, focus return, touch targets, four languages, RTL, and light/dark styling.

## Acceptance criteria

- [x] Both headers omit standalone Language/Theme controls; guests and authorized accounts can change both through Account.
- [x] Preference changes preserve route, bag, unsaved forms, session, persistence and cross-tab behavior.
- [x] Both search overlays present the focused finder layout without a visible generic heading or language selector.
- [x] Storefront preview rows and Enter/all-results navigation work; short/empty input sends no preview query and stale results cannot remain selectable.
- [x] Admin selection, shortcut guards, independent errors and permission isolation remain intact.
- [x] Workspace drawer alignment follows the header in LTR/RTL, expanded/collapsed desktop sidebar states, and after resizing; its backdrop dims the sidebar.
- [x] Browser-regression and native 200% zoom acceptance cover the delivered search/header behavior.

## Validation and rollback

On 2026-10-20, 331 unit tests across 64 files, lint, and build passed (the build retained its existing chunk-size warning). The focused browser suite first passed 20 of 21 checks; its cross-tab appearance case exposed a closed-menu subscription gap, which is addressed by the root `App` theme subscription. Six follow-up browser checks passed, including guest preferences/store preview navigation, stale-term/reopen handling, admin search, theme persistence/cross-tab/cart/dirty-form retention, and the 32-visit desktop/mobile × language × theme × shell layout matrix. Storefront/admin dark desktop and Arabic mobile screenshots were inspected. All four dedicated search/header browser checks passed in the full run, including the 32-visit matrix. The full default suite reported 86 passed, one intentional native-zoom skip, and one failure in the four-language/two-theme mobile notification case; the trace shows a same-URL document navigation at the instant a watched specification file changed. With files frozen, that case passed in a fresh `--last-failed` rerun (one test, 1.2 minutes). Native `LOCALIZATION_BROWSER_CHANNEL=msedge bun run test:localization -- --grep 'en zoom200'` passed one case in 1.6 minutes, covering actual CDP zoom 2 in both themes, route groups, Account-language keyboard interaction, and workspace-search drawer bounds/focus. The sidebar-alignment correction had an initial failing layout-matrix assertion against the old drawer geometry; after the implementation, all 10 focused search-header/sidebar/workspace browser tests passed in 2.2 minutes, and expanded-English and collapsed-Arabic screenshots were inspected. The full 331-test/64-file unit suite then passed in 143 seconds; final lint and build passed with the existing chunk-size warning. The later component-adoption regression passed 349 unit tests in 71 files, lint, build, and 91 browser tests with one intentional native-zoom skip; its four-locale native-zoom matrix also rechecked both Command drawers and workspace bounds. Revert this frontend update to restore the prior entry points; no data migration is needed.
