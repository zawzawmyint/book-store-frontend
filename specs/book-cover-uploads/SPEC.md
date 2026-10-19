# Book cover uploads — storefront and workspace specification

> **Status: Implemented. Date: 2026-10-19.** The cover editor, image rendering, and bundled demo artwork are delivered and verified.

Coordinate with the [API specification](../../../backend/specs/book-cover-uploads/SPEC.md) and the canonical [implementation plan](../../../backend/docs/superpowers/plans/2026-10-16-book-cover-uploads.md).

## Goal and current behavior

Allow Staff/Admin to manage covers and show actual images consistently throughout the storefront. `BookCover.tsx` uses an API cover when available and generates a decorative fallback from ID/title/author otherwise. Book creation and editing live in `BookFormPage.tsx`; creation navigates to the saved edit route so a cover can be added. The API, rather than browser code, owns storage, validation, and public image URLs.

## Staff workflow

- Existing books show a separate “Book cover” panel with current preview, file picker, Upload/Replace cover and Remove cover controls. Covers save independently from textual book details; explain this in the panel.
- New-book mode says “Save the book before adding a cover.” After successful creation navigate to the new book's edit route, preserve catalog return context, and announce “Book created. You can now add a cover.” Do not attempt a second automatic request or risk reporting a failed book creation when only the cover failed.
- Accept JPEG/PNG/WebP up to 5 MiB; show supported formats and limit beside the labelled native file input. Client checks offer early feedback; server validation is authoritative. Selecting a file previews it but changes nothing until Upload/Replace is pressed. Include Cancel selection and revoke object URLs when replaced, cancelled, unmounted, or navigating to another book.
- While a cover request is pending disable competing cover actions. Keep the persisted cover until success; a failed request retains the selection for retry and leaves text fields intact. Remove requires confirmation and returns to the generated fallback after success. No removal control when no saved cover exists.
- On 409 explain that the cover changed elsewhere, refresh current metadata, and require explicit retry against the new revision. On auth/role loss reuse workspace access recovery and remove private cached data as existing policy requires. On unknown network outcome refetch current state before offering a retry. Do not silently overwrite a newer cover.
- Covers can be managed for archived books by the same catalog permission; archive/restore itself does not modify the cover.

## API integration

GraphQL adds nullable `cover { url width height }` to public/workspace books and `coverRevision` to workspace books. Update shared fragments and all affected selections in `src/operations.graphql`, then generate `src/generated/graphql.ts`. Do not send cover fields through existing text-detail mutations.

Use credentialed raw-body `PUT /api/books/:id/cover` and empty-body `DELETE` with `If-Match: "<coverRevision>"`. PUT sends the selected File with its supported image Content-Type. Response is `{ bookId, cover, coverRevision }`; errors use `{ error: { code, message } }` as defined by the API spec. Browser supplies Origin. The UI never sends storage keys or local paths.

`VITE_API_URL` defines the API origin for REST requests; absent means same origin. An explicitly configured value must be an HTTP(S) origin on the storefront hostname, because the existing authentication cookie is host-only. Use a same-origin proxy for a separate API hostname. Development proxy adds `/api/books` and `/media`; API returns absolute externally reachable image URLs derived from its public base. Test/preview deployments must route the same endpoints.

After success refetch the current workspace book and invalidate/refetch catalog, homepage, book details and any live account-cart queries through the existing catalog refresh path. Do not put image bytes into Apollo or browser storage. Update Activity's changed-field labels for the additive `COVER` enum value; display “Cover” and safe text.

## Cover presentation

Extend shared `BookCover` with optional `cover: { url: string; width: number; height: number } | null`. Maintain a stable portrait frame using the existing full-size ratio, and the existing compact thumbnail footprint. Use contained artwork with a neutral surrounding panel; show the complete artwork without cropping or stretching. Image covers contain their own lettering: do not overlay the generated title/author design on them.

Keep the existing generated design for missing or failed images. Track failures per URL so a later replacement can load normally. Provide meaningful alternative text when the image supplies unique context; use empty alt/aria-hidden in linked cards or thumbnails where nearby text already supplies the book name. Preserve existing link accessible names and keyboard focus behavior. Reserve layout space before loading; lazy-load below-the-fold images and load the primary book-detail/hero cover promptly.

Update all existing `BookCover` call sites: catalog cards, book details, recommendations, homepage hero/reading discovery, workspace list thumbnails, and bag lines. Book details and homepage share the same source image, sizing and fallback rules.

Guest bags keep their persisted envelope unchanged and resolve optional cover metadata through the bounded live `bookCovers(ids: [ID!]!): [BookCoverLookup!]!` lookup. It accepts up to 50 IDs per request, returns only existing active books, deduplicates results, and omits absent/archived IDs. Malformed/oversized input returns `BAD_USER_INPUT`. An image lookup failure falls back without blocking quantities or checkout, and no per-line requests are issued. Verified-account bag responses reuse their live nullable book cover. Historical order receipts retain existing presentation in this version.

## Seed artwork direction

The backend bundles twelve finished original demo designs for seeded books: ten ImageGen covers and two original vector covers. Artwork sources and manifest remain in the backend repository; the frontend does not bundle duplicate copies. Text readability was visually reviewed. Published-edition covers supplied by staff receive the same uncropped presentation without decorative overlays.

## Acceptance and verification

- [x] Staff/Admin can create a book, enter its saved edit page, upload, preview, replace, cancel selection, and remove covers.
- [x] Unsupported/oversized files, failures, unknown outcomes, conflicts and role loss provide actionable feedback without losing unrelated edits.
- [x] All listed cover surfaces render real images, preserve artwork and dimensions, and recover with the existing fallback.
- [x] Replacement invalidates cached views and failed-image state; reopening the page shows the persisted image.
- [x] Guest/account bags show covers when available without changing guest persistence or blocking checkout on image lookup failure.
- [x] Keyboard controls, focus after confirmation, labelled errors/status messages, narrow screens and actual 200% browser zoom pass manual checks.
- [x] Cross-origin upload/preflight and media delivery work in the configured deployment; tests use disposable media roots.

Use focused component tests for URL failure recovery and upload transitions, backend integration tests for validation/permissions, and a small coordinated Playwright staff-to-storefront journey. Run codegen, frontend tests, lint, build, and browser tests against SQLite and PostgreSQL through the existing harness. During delivery update root SPEC/README and mark Implemented only after acceptance evidence is recorded.

## Delivery reconciliation

The saved-book editor is delivered: creation navigates to the saved book’s edit route, cover saving stays independent of unsaved text fields, and the editor previews, cancels, replaces, confirms removal, reloads after conflicts or unknown outcomes, and restores dialog focus. Shared `BookCover` renders server images in an uncropped contained frame, preserves its generated fallback, and resets a failed-image state when a replacement URL arrives. Catalog cards, detail, homepage surfaces, workspace thumbnails, account carts, and guest carts receive the optional cover metadata. Guest lookup is network-only, batched, and leaves the persisted guest-cart envelope unchanged; account carts use their live book cover.

`VITE_API_URL` is optional for REST cover requests. When supplied it must be an HTTP(S) origin on the same hostname as the storefront, because authentication uses a host-only cookie; use a same-origin proxy for an API on another hostname. Development proxies `/api/books` and `/media` with GraphQL and Better Auth. The connected browser journey passed at actual 200% zoom in the installed Edge Chromium profile, including cross-port CORS, conflict recovery, focus restoration, and unsaved-text preservation. `E2E_ZOOM_BROWSER_CHANNEL` can override the zoom browser channel; Windows defaults to `msedge`, other platforms to `chromium`.
