# Book cover uploads — storefront and workspace specification

> **Status: Implemented. Date: 2026-10-19.** The cover editor, image rendering, and bundled demo artwork are delivered and verified.

Coordinate with the [API specification](../../../backend/specs/book-cover-uploads/SPEC.md) and the canonical [implementation plan](../../../backend/docs/superpowers/plans/2026-10-16-book-cover-uploads.md).

## Unified book form

The optional cover field is inside the book details form for both creation and editing. A single **Save book** action saves details, then applies a selected cover upload or staged removal through the existing REST endpoints. Selecting, cancelling, or staging removal changes only the local draft until Save. No backend, schema, or storage changes are required.

Disable competing edits throughout both requests. If details fail, do not upload the cover. If details succeed but the cover fails, retain the saved book ID, entered details and file for explicit retry without creating another book or resetting opening stock. Report partial success clearly. Conflict/unknown cover outcomes reload only cover metadata before explicit retry; failed reload blocks Save until recovery. Existing workspace authorization recovery remains in force. Successful creation/editing returns to the catalog with its return context. Cover preview URLs are released on replacement, cancel and unmount.

Creation with/without a cover, combined edit/upload, staged removal/cancel, validation, busy controls, detail failure, partial creation retry, and cover conflict/reload are covered by focused tests and the connected browser journey.

## Goal and current behavior

Allow Staff/Admin to manage covers and show actual images consistently throughout the storefront. `BookCover.tsx` uses an API cover when available and generates a decorative fallback from ID/title/author otherwise. Book creation and editing live in `BookFormPage.tsx`; creation can stage a cover before the book has an ID. The API, rather than browser code, owns storage, validation, and public image URLs.

## Staff workflow

- The book form contains an optional **Cover image** picker with a preview. It accepts JPEG/PNG/WebP up to 5 MiB; the client offers early feedback while server validation remains authoritative. **Cancel selection** and **Undo removal** return to the saved cover state, and object URLs are released on replacement, cancellation, and unmount.
- New-book mode accepts a staged cover. **Save book** creates the details and opening stock first, then uploads the staged image. Successful creation/editing returns to the catalog with its return context.
- The entire form is busy during detail and cover requests. A detail failure does not upload the cover. A subsequent cover failure preserves the saved ID, form values, and staged change for explicit retry without a second creation, repeated opening stock, or an unchanged-detail mutation. Staged removal previews the generated fallback immediately, but the persisted cover reference changes only after Save.
- On 409 or an unknown cover outcome, reload only cover metadata and require explicit retry. The picker continues to show the latest saved cover alongside a staged upload/removal preview. A failed reload blocks Save until **Reload cover** succeeds. Auth/role loss uses existing workspace access recovery. Query-refetch failure preserves a previously loaded form only when it belongs to the current route’s book ID; a different prior route stays loading/error rather than showing the wrong book.
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

- [x] Staff/Admin can create or edit a book with one Save action for details and a staged cover upload/removal, including preview, cancellation, and undo.
- [x] Unsupported/oversized files, failures, unknown outcomes, conflicts and role loss provide actionable feedback without losing unrelated edits.
- [x] All listed cover surfaces render real images, preserve artwork and dimensions, and recover with the existing fallback.
- [x] Replacement invalidates cached views and failed-image state; reopening the page shows the persisted image.
- [x] Guest/account bags show covers when available without changing guest persistence or blocking checkout on image lookup failure.
- [x] Keyboard controls, focus after staged removal/undo, labelled errors/status messages, narrow screens and actual 200% browser zoom pass manual checks.
- [x] Cross-origin upload/preflight and media delivery work in the configured deployment; tests use disposable media roots.

Use focused component tests for URL failure recovery and upload transitions, backend integration tests for validation/permissions, and a small coordinated Playwright staff-to-storefront journey. Run codegen, frontend tests, lint, build, and browser tests against SQLite and PostgreSQL through the existing harness. During delivery update root SPEC/README and mark Implemented only after acceptance evidence is recorded.

## Delivery reconciliation

The unified editor is delivered: creation can stage a cover, **Save book** saves details then applies the staged cover change, and successful save returns to the catalog with its return context. Selection/cancellation/staged removal remain local until Save. A partial cover failure preserves the saved ID, values, and staged file/removal for explicit retry without duplicate creation, opening stock, or unchanged-detail updates. Conflict/unknown outcomes reload only cover metadata, while the picker keeps the latest saved cover visible beside the staged preview; a failed reload blocks Save. A failed query refetch preserves prior form data only when its book ID matches the route. Shared `BookCover` renders server images in an uncropped contained frame, preserves its generated fallback, and resets a failed-image state when a replacement URL arrives. Catalog cards, detail, homepage surfaces, workspace thumbnails, account carts, and guest carts receive the optional cover metadata. Guest lookup is network-only, batched, and leaves the persisted guest-cart envelope unchanged; account carts use their live book cover.

`VITE_API_URL` is optional for REST cover requests. When supplied it must be an HTTP(S) origin on the same hostname as the storefront, because authentication uses a host-only cookie; use a same-origin proxy for an API on another hostname. Development proxies `/api/books` and `/media` with GraphQL and Better Auth. The connected browser journey passed at actual 200% zoom in the installed Edge Chromium profile, including cross-port CORS, conflict recovery, focus restoration, and unsaved-text preservation. `E2E_ZOOM_BROWSER_CHANNEL` can override the zoom browser channel; Windows defaults to `msedge`, other platforms to `chromium`.

The unified-form regression coverage passed **12/12**. The final frontend suite passed **285/285** across **52** files; lint and build passed with the existing chunk-size warning. The full SQLite browser suite passed **73/73** in 6.6 minutes. The focused PostgreSQL cover and Admin catalog browser journeys passed **2/2** in 35.8 seconds, including create/upload/replace/remove, mobile behavior, and actual 200% zoom. Compiled SQLite and PostgreSQL smoke checks passed.
