# Graphics studio — pre-release bug & UX review (2026-10-05)

**Status (2026-10-05, same day): everything below is addressed** except the
items listed under "Left open" at the end. The fixes are described in
`docs/graphics-studio.md` §11. Sources: hands-on scenarios in
Chrome against the dev build (desktop 1500 px and phone 390 px, signed out),
a static review of `src/graphics/**` and the gallery/share-link code, and a
static review of the backend `designs` module. Severity: **P0** = fix before
release (data loss, broken public content, security), **P1** = fix before or
right after release (clearly wrong behaviour users will hit), **P2** = polish.

## 1. Bugs

### P0

1. **Drafts can become unreadable and silently vanish from "My designs".**
   Any save of a design that fails the zod schema is written as-is and then
   skipped by `listDesigns()` with only a console warning. Confirmed ways to
   get there: (a) switching the Data panel to "Saved contest" without picking
   a contest writes `{ source: 'contest', contestId: '' }` (`contestId` must
   be ≥ 1 char) — autosave or save-on-close persists it; (b) clearing the
   design name in the top bar and saving (`name` must be ≥ 1 char) — reproduced,
   the record disappears on the next gallery load; (c) a non-integer value in
   a manual row's Points field (`points` is `int()`). Fix: validate before
   persisting (keep the previous binding until a contest is chosen; fall back
   to "Untitled design"; coerce points), and never hide records — show an
   "unreadable" card with delete/export instead of dropping it.
2. **Canvas resizing is lossy and compounds.** `resizeCanvas` scales fonts and
   flag/image sizes by `min(kx, ky)` and clamps at 8/12 px, so every size
   change that is not a pure scale shrinks them for good; going
   1200×630 → 1080×1350 → 1200×630 collapses fonts, and typing a width digit
   by digit (the number field commits every keystroke: 1 → 200 → 1600) does
   the same in one go. Reproduced in the template sheet (36 → 58 → 33 px
   round trip) and found an old draft with an 8 px title. Fix: commit canvas
   size on blur/Enter, and scale from a stored base layout (or from the
   template's original design in the sheet) instead of the previous size.
3. **Deleting a published template deletes images other remixes point at.**
   A remix copies the cloud document with the already-rewritten R2 URLs and
   uploads nothing, so B's public design references A's objects; A deleting
   (or re-publishing, see 5) breaks B's images. Themes already solve this with
   `deleteR2ObjectIfUnreferenced`. Fix: reference-count by URL before deleting,
   or re-host remote images on remix publish.
4. **Publish can leave a public design with `asset:` references or orphan
   records.** If an asset is missing from IndexedDB the loop `continue`s and
   still flips the record to public with `asset:<id>` srcs nobody can load;
   if an upload throws, `setCloudId` is never reached, so the next attempt
   creates a second (unlisted) record. The backend accepts both. Fix: set
   `cloudId` right after create, abort (stay unlisted) when any asset can't be
   resolved, and reject `isPublic: true` server-side when the document still
   contains `asset:` srcs.
5. **Uploads are buffered before the size check** (`FileInterceptor` without
   `limits`; the 8 MB / 2 MB checks run in the service). Trivial memory DoS.
   Fix: `limits: { fileSize, files: 1 }` on both interceptors.

### P1

6. **Clicking a thin element resizes it to 24 px, not undoable.** `finish()`
   applies the minimum size on every gesture, including a plain click; the
   poster's 2 px "Rule" becomes a 24 px bar and the history push is discarded.
   Fix: apply the minimum only to resize gestures.
7. **Opening a template says "Unsaved" and asks to save on close** although
   nothing was touched: the flatten `set` flips `dirty` through the history
   subscription before `clear()` runs (`load()` already works around the same
   race). Reproduced: fresh template → close → "Keep this design?" dialog.
8. **Phone: deleting or undoing the selected element leaves neither the bar
   nor the sheet** (`sheet === 'inspector'` with an empty selection renders
   nothing) until the user taps the canvas.
9. **Escape closes the whole editor one keypress too early.** The chain is
   popover → panel → sheet → selection → *editor*; with nothing selected a
   stray Escape (or Escape inside a canvas-inspector `<select>`, which is not
   treated as typing) closes the editor or raises the unsaved dialog. Suggest
   never closing on Escape (or only after a second press with a hint).
10. **Field labels are `<label>`s wrapping buttons**, so clicking "Rotation",
    "X", "Width", "Font"… activates the first button: decrements the number,
    flips the first segment, or shrinks the canvas by 10 px.
11. **Editor shortcuts stay live while the font picker (and the contest-access
    dialog) is open**: Backspace/Delete on a focused font row deletes the
    element being edited, arrows nudge it, Escape clears the selection.
12. **Stale `cloudId` after unpublishing** from the gallery: the draft keeps
    `cloudId`, publish PATCHes a deleted record → 404 "Publish failed", and the
    button keeps saying "Update template". Fix: on 404 clear `cloudId` and
    create.
13. **Template sheet shows the wrong theme name** — `useThemeName()` reads the
    editor store's last design, not the sheet's design.
14. **Like/save counters can go negative under concurrent toggles**, and
    `assetKeys` grows forever (every "Update template" re-uploads every image,
    old objects are deleted only on design delete). Same pattern as themes.
15. **Duplicate country codes in manual rows** (Add row always inserts the
    first alphabetical country) → duplicate React keys, wrong ranks; points
    accept negatives.

### P2

16. `templateFields` are lost on Undo (set with history paused); image type is
    trusted from the client (no magic bytes); malformed ids return 500;
    `uploadAsset` is last-writer-wins; orphaned R2 object when the DB write
    after an upload fails; `search` has no max length; `duplicatesCount` is
    trivially inflatable; public sort by likes/saves has no index.
17. "Manual" disappears from the sheet's data switcher once you switch to Live;
    `DesignThumb` crops content-sized (stats) designs; hidden stack children
    flatten to (0,0) with no size; height-locked resize of a rotated
    scoreboard drifts; the zundo history can stay paused if the editor unmounts
    mid-drag; save-on-close swallows a failed save; publish mutates
    `templateFields` before the request succeeds; middle-click starts a move;
    d-pad hold timer not cleared on pointer-leave; hard-coded English
    `aria-label="Resize …"`/`"Rotate"`; `role="option"` rows contain buttons;
    uploaded assets in IndexedDB are never garbage-collected; `useElementBoxes`
    re-creates its ResizeObserver on every design change; the editor store is
    never reset on close.
18. Mongoose `minimize` strips empty nested objects on create (harmless today,
    guard with `minimize: false`).

## 2. UX

Ordered by how often a user will hit them.

1. **Rename uses `window.prompt`.** The only native prompt in the app; use the
   Dialog pattern the editor already has.
2. **Fresh template → close → "Keep this design?"** (bug 7) reads as a scare
   dialog. Even after the fix, a fresh design that *was* edited gets the
   three-button dialog on Escape; consider auto-saving every design on first
   edit (drafts are free) and dropping the dialog.
3. **No visible provenance in the editor** for a remixed design: the sheet
   shows "Remixed from …", the editor top bar nothing; the Publish dialog
   should state that the remix source will be credited.
4. **Template "Size" field in the sheet** has no warning that the layout is
   re-fitted (and today degrades, bug 2). After the fix, label it "Fit to".
5. **Data panel → "Saved contest" with nothing picked** shows an empty chip
   ("Saved contest · …"). Keep the previous source until one is chosen.
6. **Export estimate** ("about 11.6 MB" for 3× PNG) is good; the result
   dialog's Copy shows no confirmation toast when the clipboard write fails
   silently (automation blocked it; verify on Safari/Firefox where
   `ClipboardItem` support differs).
7. **Added elements all land on the canvas centre**, stacking a new scoreboard
   on top of the existing one. Offset repeats by 24 px (duplicate already does
   this) or drop at the last pointer position.
8. **Hint copy gaps**: the theme-bg hint under Background still says what the
   theme is but not that the Theme section changes it; the "Sized to content"
   note for stats says "change the table type to change the size" but the
   vote type and data source also change it; the Row style note promises
   per-design overrides "later" — now point only at Theme.
9. **Gallery card thumbnails are unlabeled buttons** (screen readers read
   "button"); the "0" like/save buttons rely on `title`.
10. **Phone**: a landscape design fits the 390 px width and leaves ~70 % of the
    stage empty, with no pinch-zoom or "zoom to selection", so rows are a few
    px tall and hard to tap precisely; the inspector sheet then covers half
    of that. Consider pinch/double-tap zoom and a taller sheet only when the
    canvas is landscape.
11. **Phone top bar has no theme/size chips** and no Redo; the data label is
    folded into the subtitle. Fine for v1, but the theme can only be changed
    through Canvas → Theme, which nothing points at.
12. **Dev-only**: the Next dev-tools badge overlaps the editor's Close
    (desktop) and Export (phone) buttons.

## 3. Still missing before release (from the plan, not Phase 4)

- A **Report** action on community templates (none for themes either, so a
  shared "report content" endpoint would serve both).
- **Designs in the profile feed / summary counts** (user-content module and
  profile summary only know themes and contests), and a "Published" tab in the
  profile for the creator.
- **Per-user quota** on designs/assets (fonts have one; designs have none).
- **Cloud copies of drafts** stay out of scope, but the gallery should say so
  more loudly than the empty-state line: a "Designs are kept in this browser"
  hint on the My designs tab header, plus "Export design (.json)" / "Import"
  on the card menu as a cheap backup path.
- **Stats on manual/contest sources** show a placeholder; at minimum the
  placeholder should link to the Data panel.
- **Image template fields** (uploads as a form field) — the poster's logo is
  the obvious case.
- **R2 CORS** for `cdn.douzepoints.app` (fonts and custom-entry flags render
  blank in exports until it is applied).

## 4. Suggested order

1. P0 1 (validation + visible unreadable cards), P0 2 (size commit on blur +
   base-layout scaling), P0 4 (publish pipeline), P0 3 + bug 14 (asset
   reference counting), P0 5 (multer limits).
2. Bugs 6–11 (gesture min size, dirty-on-open, phone empty sheet, Escape,
   label activation, shortcuts while modals are open) — all small.
3. UX 1–5, then the release checklist in §3.

## 5. Left open after the fix round

- **R2 CORS** for `cdn.douzepoints.app` still has to be applied in the
  bucket (`npm run r2:cors -- --apply` in the backend, see
  `custom-fonts-and-font-library.md` §8). Until then uploaded fonts,
  custom-entry flags and design images render blank in exports.
- **Mongo indexes**: the schema no longer declares the single-field
  `isPublic_1`, `hasScoreboard_1`, `hasStats_1` indexes on `designs`;
  Mongoose only creates indexes, so drop those three by hand.
- **Dev-only** overlap of the Next dev-tools badge with the editor buttons.
- Pinch zoom on phones is implemented but was verified with synthetic
  pointer events only; try it on a real device.
