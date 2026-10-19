# The Quiet Shelf storefront — appearance specification

> **Status:** Implemented. **Date:** 2026-10-06.

## Goal and scope

Provide a **Light/Dark switch** across the storefront and Staff/Admin workspace. **Dark is the default**. Every visitor can change the appearance without signing in, and the same choice applies when moving between the store and workspace.

This feature changes appearance only. Routes, permissions, authentication, shopping, and account behavior remain unchanged. System preference, separate themes per workspace, custom palettes, and account-based synchronization are outside this feature.

## Theme behavior

- Support exactly **Light** and **Dark**. A first visit starts in Dark, regardless of the device's appearance setting.
- Switching applies the new theme immediately across the current page. It does not navigate, reload, or discard entered form values, filters, cart contents, or session state.
- Apply the selected theme from the first visible render. A saved Dark choice or default Dark must not briefly display a light page; a saved Light choice must not briefly display a dark page.
- Device appearance changes do not change the app theme.

## Preference persistence

- Remember the choice in this browser using `book-store-theme`, accepting only `light` or `dark`. Preserve the existing `book-store-cart` data.
- Missing or invalid saved values use Dark. Removing the saved preference also returns to Dark.
- Reloading, signing in, signing out, switching accounts, and changing roles preserve a valid saved choice. The preference belongs to the browser profile, not an account.
- If browser storage is unavailable, start in Dark and allow switching for the current page. Remembering that choice after reload is not guaranteed.
- A preference changed in another tab updates this tab. An invalid or removed preference in another tab returns this tab to Dark.

## Navigation and switch

The [icons and typography specification](../icons-typography/SPEC.md) defines the shared icon treatment while this specification remains the source of truth for the preference behavior.

- Show the switch in the desktop storefront header and in the mobile storefront navigation dialog, as defined by [the homepage specification](../storefront-homepage/SPEC.md). Keep it in the workspace header, including workspace access-denied and retry screens. Guests do not need an Account menu to use it.
- Toggle directly between Light and Dark, without a dropdown or System option.
- Show a sun icon for the current Light mode and a moon icon for the current Dark mode, without a visible mode label. Give it the accessible name **Dark mode**, expose whether Dark is enabled, and show a tooltip for the next action: **Switch to Dark mode** or **Switch to Light mode**.
- Support keyboard activation, a visible focus indicator, and focus remaining on the control after switching.
- Keep the switch usable on desktop and mobile without obscuring navigation, account, or cart controls or causing page overflow.

## Visual coverage

### Softer storefront surfaces — Status: Implemented

- Light and Dark use softer decorative border and cover-panel tokens across the
  storefront. The workspace retains its distinct palette with softer workspace borders,
  unoutlined cards, and transparent table/toolbar outer frames.
- Homepage genre and reading-mood cards are unoutlined rounded surfaces with their
  existing hover feedback. Secondary carousel controls and the recommendation action
  are filled and unoutlined. The desktop header and mobile-menu theme switches have
  transparent borders; their focus treatment remains unchanged.
- Form and other control boundaries, focus indicators, status colors, text, images,
  routes, data, and shopping behavior are unchanged. No new gradients were added
  outside the homepage hero.
- `bun run test` passed **285/285** tests across 52 files; `bun run lint` and
  `bun run build` passed. The build retained its existing over-500 kB bundle warning.
- Browser inspection covered desktop Light home, catalog, book detail, bag, checkout
  delivery, and profile; desktop Dark home, reading moods, catalog, book detail, bag,
  checkout delivery, and profile; and 375px Light/Dark representative views. At 375px,
  the Fantasy genre-card focus indicator remained fully visible and home/catalog had no
  horizontal overflow; at 320px Dark, the homepage had `scrollWidth = innerWidth = 320`.
  The inspected browser console had no errors. Evidence is retained outside this
  repository in `../../.delivery-work/border-audit/`.

- Light retains the cream/forest-green storefront and uses a muted sage-gray workspace,
  including the dark green workspace sidebar.
- Dark uses dark neutral/forest backgrounds, light text, and readable green accents. Distinguish page backgrounds, panels, fields, borders, table rows, and interactive states.
- Cover catalog, book details, cart, authentication, checkout, account pages, not-found screens, and all workspace pages, including Activity and expanded history details.
- Menus, dialogs, selects, tooltips, mobile navigation, and native form controls use the selected theme even when displayed outside the main page container. Workspace overlays retain the workspace palette.
- Loading, empty, error, success, destructive, disabled, hover, selected, and focus states remain readable. Status meaning must not depend on color alone.
- Preserve original book-cover and image colors. Theme changes must not invert imagery.
- Target contrast of at least 4.5:1 for normal text and 3:1 for large text and required control/focus indicators. Any appearance animation respects reduced-motion preferences.

## Acceptance criteria

- [x] Guests, Customers, Staff, and Admin can switch between Light and Dark from applicable desktop/workspace headers or the mobile storefront navigation dialog.
- [x] First visits and missing, invalid, or unavailable saved preferences start in Dark.
- [x] A saved Light or Dark choice survives reload and sign-out and applies across storefront/workspace navigation.
- [x] Device appearance has no effect; changes or removal in another tab follow the persistence contract.
- [x] Initial rendering shows the correct theme without an opposite-theme flash.
- [x] All pages, feedback states, overlays, and native controls support both themes with readable contrast.
- [x] The switch exposes its state and works with keyboard and mobile layouts.
- [x] Switching preserves unsaved forms, filters, cart data, sessions, and existing access safeguards.
- [x] Frontend tests, lint, build, and browser checks pass before marking the feature Implemented.

## Validation

Unit coverage verifies the storage contract, keyboard control, blocked storage, cross-tab updates, and the head bootstrap. The focused Playwright checks verify pre-React Dark, saved Light, device-preference independence, reload, cart and form retention, sign-out, dialog and mobile-overlay coverage. Four representative screenshots were inspected: dark workspace dialog, dark mobile workspace navigation, dark mobile cart, and light mobile cart.

On 2026-10-06, 66 unit tests, lint, and build passed; the existing bundle-size advisory remains. All 24 browser journeys were verified across the full run and a targeted rerun after correcting shared Admin-role test state. Both focused appearance journeys passed. No backend contract, database migration, or account setting is required.
