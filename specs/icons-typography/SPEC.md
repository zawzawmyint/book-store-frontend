# The Quiet Shelf storefront — icons and typography specification

> **Status:** Implemented. **Date:** 2026-10-06.

## Goal and scope

Make common actions more compact through recognizable icons, and give the bookstore a more distinctive appearance with **Lora** and **Source Sans 3**.

Cover storefront and workspace headers, repeated table actions, and typography across both areas. Use the existing **Lucide** icon family. Keep visible labels when an action needs explanation or when users need to read information and make a decision.

Routes, permissions, confirmations, shopping, authentication, and the Light/Dark preference remain unchanged. This feature does not add a new icon library, redesign navigation, or replace content with icons.

## Header controls

- Storefront Browse uses a book/library icon; signed-out Sign in uses a login icon; signed-in Account uses a user icon; Bag uses the existing shopping-bag icon with its visible item count.
- Replace these controls' visible action words with icons. Retain their existing destinations, account menu items, authorization-aware workspace link, and cart-count behavior.
- Workspace Account uses a user icon. Keep the workspace title, section context, and menu-item labels visible.
- The Light/Dark switch uses its existing sun/moon icon without visible Light/Dark text. Sun represents current Light mode; moon represents current Dark mode. Keep the accessible name **Dark mode**, switch semantics, and checked state. Its tooltip describes the next action: **Switch to Light mode** or **Switch to Dark mode**.
- The brand name stays visible. Header controls remain usable for guests, Customers, Staff, and Admin, including workspace access-denied and retry screens.
- This theme-switch presentation is part of [the appearance specification](../appearance/SPEC.md). Dark remains the default, with the same persistence and device-setting independence.

## Repeated actions

- Book-row **Edit** uses a pencil icon; **History** uses a history icon. History remains Admin-only and preserves book-list return filters.
- User/detail and order/detail actions use an eye icon where an existing action opens that record. Their accessible names identify the action and target.
- **Copy user ID** uses a copy icon and retains success/failure feedback. Copying must still copy the exact ID.
- Search submit controls use a search icon while retaining an accessible action name and Enter-to-submit behavior. Search fields and filters retain visible labels.
- Keep **Adjust stock** as an icon plus a short visible label because the action is less obvious. Keep **Change role** visibly labeled.
- Preserve existing More actions menus. Archive/Restore and other menu items keep visible labels and existing confirmations; they do not become immediate destructive icon actions.
- Existing quantity, remove, password-visibility, close, and mobile-menu icons retain their meanings and accessible labels. Do not replace a working icon merely to change its style.

## Text that remains visible

- Book titles, authors, genres, descriptions, prices, stock, user/account information, role names, table headings, and activity details.
- Form labels, field errors, loading/empty/error messages, success feedback, and confirmation explanations.
- Important primary actions such as **Add book**, **Save book**, **Add to bag**, and **Submit order request**. Icons may accompany these labels.
- Expanded workspace/sidebar links and mobile navigation labels. An icon-only navigation rail or new collapse behavior is outside this feature.

## Icon interaction and accessibility

- Every icon-only control has a meaningful accessible name; decorative icons are hidden from assistive technology. Repeated row controls identify their target through the name or associated row context.
- Tooltips appear on pointer hover and keyboard focus, and match the action. A tooltip supplements an accessible name rather than replacing it.
- Header and row icon actions provide a touch target of at least 44 by 44 CSS pixels, with enough spacing to avoid accidental activation. Mobile users can perform the action without first revealing a tooltip.
- Preserve keyboard activation, visible focus, disabled states, active navigation, switch state, menu behavior, and link semantics.
- Icons and tooltips remain readable in Light and Dark. Controls must not depend on color alone to communicate state or purpose.
- Using an icon does not change whether a control navigates, opens a dialog, submits a form, or mutates data. Preserve all permission restrictions and uncertain-mutation safeguards.

## Font usage

- **Lora:** storefront brand wordmark, hero/display headings, page and section headings, and book titles. Existing decorative serif/italic storefront text uses Lora where appropriate.
- **Source Sans 3:** body text, descriptions, navigation, buttons, forms, prices, feedback, and all workspace text, including headings, tables, menus, and dialogs.
- Preserve existing font sizes and hierarchy unless a small spacing adjustment is needed to avoid clipping or overflow with the new fonts. Keep prices and numeric table columns aligned and readable.
- Cover both Light and Dark, including content displayed in menus, dialogs, mobile navigation, and other overlays. Preserve book imagery and existing cover designs.
- Load the actual font families, rather than only declaring their names. Serve Lora and Source Sans 3 assets from the application's origin and retain `Lora-OFL.txt` and `SourceSans3-OFL.txt` alongside them. Lora supplies normal 400–700 and italic 400; Source Sans 3 supplies normal 400–700.
- Content stays visible while fonts load. If loading fails, use a readable serif fallback for Lora and a sans-serif fallback for Source Sans 3. Account names, punctuation, and unsupported characters remain readable through fallback fonts.
- Font loading must not prevent interactions or introduce clipped controls or document overflow. Avoid downloading unused font families, styles, or weights.

## Acceptance criteria

- [x] Storefront/workspace header actions use the specified icons, with the brand, cart count, and menu labels retained.
- [x] Edit, History, record details, Copy user ID, and search submits use icons with correct accessible names and tooltips.
- [x] Stock/role actions, primary form/shopping actions, navigation labels, and meaningful content retain the specified visible text.
- [x] The icon-only theme switch preserves its checked state, default Dark, persistence, keyboard use, and cross-tab behavior.
- [x] All icon actions preserve routes, filters, permissions, confirmations, copy feedback, and mutation behavior.
- [x] Controls have usable touch targets and visible focus, and fit desktop/mobile layouts without overflow.
- [x] Lora and Source Sans 3 load and appear in their assigned areas, including workspace overlays; font failure leaves content readable and usable.
- [x] Both themes preserve readable text/icon contrast, original imagery, and table/form alignment.
- [x] Relevant frontend tests, lint, build, and browser checks pass before marking this feature Implemented.

## Validation

Earlier icon and typography validation on 2026-10-06 covered theme-switch semantics, icon actions, row actions, copy feedback, tooltips, and search submission. The historic runs recorded 68 unit tests, lint, and build passing; browser journeys were verified across runs, including the full run (24 of 27), an affected rerun (11 of 12), and the remaining Admin icon journey after its filtered row became visible.

For the delivered Source Sans 3 replacement, the updated local-font loading check failed before the replacement and then all three `e2e/icons-typography.spec.ts` browser tests passed in a fresh run. They cover local loading on mobile in both themes without overflow, workspace heading/menu/dialog typography and navigation/copy feedback, and blocked-font fallback usability. Lint and the production build passed; the build retained its existing large-chunk advisory. No unit suite or full browser suite was rerun because this change only replaces self-hosted font assets and CSS declarations, without JavaScript behavior, routes, API contracts, dependencies, account settings, database migrations, or generated GraphQL changes.
