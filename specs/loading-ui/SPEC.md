# Shared book loading indicator

**Status: Implemented**

## Contract

- Storefront and workspace initial loading states use a shared decorative Lucide book
  icon with a 1.8-second opacity fade and a contextual status label. The implementation
  adds no image request, artificial delay, blocking overlay, or dependency.
- The shared indicator covers session/bag initialization; homepage, catalog, book, and
  order loading; workspace access/data loading; and every lazy admin page route inside
  the already-authorized workspace shell. The route fallback is localized, respects
  RTL direction, and remounts by pathname so a route transition receives its own state.
  Compact versions cover workspace search and delivery/payment waiting.
- Existing skeletons, static navigation, access guards, request/error handling, retry
  behavior, checkout/cart privacy boundaries, action labels, and disabled safeguards
  remain in place. Dashboard refresh retains current data and its existing refresh
  announcements while showing the compact book beside the update timestamp.
- Each indicator has one announced status region; its icon is decorative and theme
  colors follow surrounding storefront/workspace tokens. Reduced motion disables both
  book fading and shared skeleton animation. Indicators end with their existing loading
  conditions and do not change request lifetimes.

## Acceptance and validation

- Existing controlled-data coverage verifies loading-to-result/empty transitions. The
  frontend suite passed **285/285** tests across 52 files; lint and build passed with
  the existing over-500 kB bundle warning.
- Real paused requests were inspected in storefront and workspace Light/Dark views and
  at 375px. Reduced-motion inspection confirmed computed book and skeleton animations
  were `none`; pending requests then restored normally. Evidence is retained outside
  this repository in `../../.delivery-work/`.
- The full 73-journey browser suite passed in 7.2 minutes. No backend/API contract
  changes.
