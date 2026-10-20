# Compact notification inbox

**Status: Implemented** (local UI acceptance)  
**Date:** 2026-10-20  
**Branch:** `feat/shadcn-storefront-admin`

## Purpose

Make storefront and admin notifications quick to scan without taking over the page. This updates presentation and navigation of the existing scoped inboxes; API contracts, permissions, retention, transport, and feature gates remain unchanged.

## Behavior

- Desktop bells (above 1023px) open a non-modal, bell-anchored popover, 384px wide within viewport bounds. Radix `align="end"` follows document direction. No backdrop. Escape closes and restores bell focus; outside interaction dismisses it.
- At widths up to 1023px, retain the bottom sheet with content-driven height, maximum 85dvh, and a bounded scrolling feed. Both surfaces omit the language switcher and retention notice in the quick inbox; language stays controlled by the surrounding application and retention stays on the history page.
- A compact header contains the title and a quiet CheckCheck bulk-read action. The feed fetches the existing ten recent items; its maximum height is `min(60dvh, 24rem)` in the storefront and `min(65dvh, 32rem)` in the workspace. Visible row count depends on content and viewport. Short feeds shrink to content.
- Each notification has a muted 18px event icon, localized message, small locale-formatted timestamp, and an unread dot with text equivalent. Payment/delivery uses CircleCheck, orders Package, shipping Truck, problems CircleAlert, completed refunds RotateCcw, and unknown events Bell. Preserve test-payment and cancellation/refund qualifiers.
- The message area is a full-row link to its existing validated destination. Normal activation attempts mark-read before navigating; a failure still permits navigation. Modified clicks keep native link behavior and do not mark read. Unread rows have a separate, accessible Check icon action to mark read without navigating. Events without a safe destination remain readable and can still be marked read.
- A secondary footer link with ArrowRight opens the correctly scoped full inbox. Full inbox pages reuse the same icon rows and retain filters, pagination, retention text, and bulk-read behavior.
- Preserve loading, empty, retry, pending, exact accessible unread counts, 99+ visual badge cap, scoped theme, four supported languages, RTL, focus visibility and minimum 44px action targets. No new dependency is required; use installed Radix Popover and Lucide.

## Acceptance criteria

- [x] Both scopes use a desktop popover without a modal backdrop or duplicated language control.
- [x] Bell opening never marks notifications read; bulk-read remains scoped and disabled when unavailable/pending.
- [x] Clickable rows navigate to safe scoped destinations and attempt read only for ordinary activation.
- [x] Read failure, modified clicks, no-destination rows, and unmount during read preserve correct behavior.
- [x] Icons supplement localized text; unread text equivalents, test-payment and refund details are preserved.
- [x] Escape/focus return, outside dismissal, mobile/RTL/zoom bounds and bounded feeds work.
- [x] Full inbox retains its existing filters and pagination; history navigation and recipient isolation journeys pass.

## Validation and rollback

See [verification evidence](VERIFICATION.md) for executed checks and limits. Revert the frontend change to restore the previous dialog; no database migration or backend deployment is involved. The [broader notification rollout](../in-app-notifications/SPEC.md) retains its separate production acceptance gates.
