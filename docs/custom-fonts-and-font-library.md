# Custom fonts & the font library

Users can upload their own fonts, keep them in a per-user **font library**, reuse
them across themes, publish them for other users, and give a theme two font
slots: the **interface font** (whole app) and the **scoreboard font** (the
country rows only). This doc covers the data model, the
ownership rules, the weight-fallback algorithm, the runtime pipeline (including
the FOUC script), and the ops prerequisites.

Backend: `douze-points-backend/src/fonts/`. Frontend: `src/theme/fontResolution.ts`,
`src/theme/customFonts.ts`, `src/api/fonts.ts`, and
`src/components/setup/widgets-section/custom-themes/fonts/`.

---

### 1. Data model

**`Font` document** (`fonts` collection, `schemas/font.schema.ts`):

- `name`, `familyName?` (as detected from the file), `userId`, `isPublic`
  (listed in the public library — files are always publicly readable on the CDN),
  `isVariable`, `forksCount`, `forkedFrom?` /
  `forkedFromName?` / `forkedFromUserId?` (provenance, mirrors theme
  `remixedFrom*`).
- `files[]`: one entry per uploaded face — `weight` (400/500/600/700 slot),
  `sha256`, `key`, `url`, `format` (`woff2` | `woff`), `bytes`, `isVariable`,
  `wghtMin?`/`wghtMax?`, `sourceFilename?`, `originalFormat?`, `glyphCount?`.

**Theme fields** (`Theme` schema + `CustomTheme` type):

- `fontAlias?` — built-in interface font (unchanged).
- `fontId?` — custom interface font; wins over `fontAlias` when its snapshot resolves.
- `scoreboardFontAlias?` — built-in scoreboard font.
- `scoreboardFontId?` — custom scoreboard font.
- Both scoreboard fields absent ⇒ the scoreboard inherits the interface font.
- `hasCustomFonts` — denormalized (`fontId || scoreboardFontId`), indexed, used
  by the "With custom fonts" filter in Public Themes.
- `customFonts?: { ui?, scoreboard? }` — **attached on read** (`FontsService.attachThemeFonts`,
  called from `ThemesService.hydrateThemes` on every read and mutation response).
  Each entry is a `ThemeFontSnapshot`: `{ _id, name, isVariable, faces: [{ url, format, weight, weightRange }] }`.
  Because the applied theme is persisted to `localStorage`, the snapshot is what
  the FOUC script renders from.

`ThemeSpecifics` (`src/theme/types.ts`) gained `scoreboardFontAlias?` so a
built-in year theme can also define a scoreboard-only font (none do today).

### 2. Content-addressed storage

- Stored bytes are hashed (sha256) and written to R2 at
  `fonts/blobs/<sha256>.<woff2|woff>` with `Cache-Control: public, max-age=31536000, immutable`.
- Before uploading, the service checks `fontModel.exists({ 'files.sha256': sha })`;
  identical bytes are stored once regardless of who uploads them.
- GC: `releaseBlobIfUnreferenced(sha, key)` deletes the object only when no font
  references the hash any more (same idea as `deleteR2ObjectIfUnreferenced`
  for theme backgrounds/sounds). The exists→save window is a known, accepted race.
- Formats: `.woff2` and `.woff` are stored as-is; `.ttf`/`.otf` are converted to
  WOFF2 with `wawoff2` (wasm). WOFF1→WOFF2 is not possible with that library.
- Validation (`font-file-parser.ts`): magic bytes (`wOF2`, `wOFF`, `OTTO`,
  `00 01 00 00`, `true`), then a `fontkit` parse. Collections (`.ttc`),
  italic faces (the app never renders italics) and unparsable files are rejected
  with a message naming the file. A batch is all-or-nothing.

### 3. Ownership: "Add to my library"

A theme may only reference fonts its owner owns.

- Using another user's public font = `POST /fonts/:id/fork`, which creates a new
  `Font` for the caller pointing at the same blobs (no R2 traffic), records
  provenance and increments `forksCount` on the source. Idempotent per
  `(userId, forkedFrom)`.
- `ThemesService.create/update` run `FontsService.resolveFontRefsForOwner`: an id
  that belongs to someone else is forked automatically (allowed when the font is
  public **or** is carried by a public theme — fonts travel with the themes that
  use them). This is what makes remixing a public theme with custom fonts work.
- Deleting a font therefore never affects other users. Deleting one used by the
  owner's own themes returns `409 { usedByThemesCount }`; with `?force=true`
  the refs are unset (those themes fall back to their built-in alias) and
  `hasCustomFonts` is recomputed.
- Uploads are **public by default** (the upload tab states the licence
  responsibility and sends `licenseAccepted: true`); flipping a private font to
  public later requires the same acknowledgement, collected via a confirmation
  dialog. Forks ("Add to my library") are private copies.

Limits (`fonts.constants.ts`, mirrored in `src/api/fonts.ts`): 4 MB per raw
file, 4 files per request (one per weight), 50 fonts per user (the first
count-based quota in the codebase).

### 4. Weight slots & fallback (`font-weight-slots.ts`)

The app renders 400/500/600/700 only. Uploads are assigned to slots by the
detected `OS/2.usWeightClass` (or the `wght` axis default for variable fonts):

- `assignWeightSlots` — nearest slot; `< 400` clamps to 400 and `> 700` to 700
  (with a warning); two faces landing on the same slot move the later one to
  the nearest free slot (with a warning) so the user can reassign it in the UI.
- `computeFaceWeightRanges` — partitions 400..700 among the faces that exist,
  following the CSS Fonts 4 matching algorithm for a missing weight
  (desired ≤ 500: ≥ desired ascending up to 500, then lighter descending, then
  heavier; desired > 500: ≥ desired ascending, then lighter descending):

  | uploaded faces | resulting ranges |
  |---|---|
  | 400, 700 | 400→[400,500], 700→[600,700] |
  | 600 | 600→[400,700] |
  | 500, 600 | 500→[400,500], 600→[600,700] |
  | 400, 500, 700 | 400→[400,400], 500→[500,500], 700→[600,700] |
  | variable | one face →[400,700] |

The ranges are exposed as `faces[].weightRange` and emitted verbatim as
`font-weight: lo hi` in each `@font-face`, so the browser treats missing weights
as covered and never synthesises a faux bold. Custom-font scopes additionally set
`font-synthesis: none`. Both functions are pure and unit-tested (Jest).

### 5. Runtime pipeline (frontend)

1. **Resolution** — `resolveActiveFonts()` (`src/theme/fontResolution.ts`) turns
   general-store state into `{ ui, scoreboard, scoreboardInherits }` where each
   slot is `{ kind: 'builtin', alias }` or `{ kind: 'custom', snapshot, fallbackAlias }`.
   The account override (`overrideThemeFont`) forces one built-in font into both
   slots. A stale `fontId` without a matching snapshot degrades to the alias.
   `resolveThemeFonts(theme)` is the override-free variant for cards and previews.
2. **Application** — `applyDocumentFonts()` (`src/theme/customFonts.ts`) is the
   *single writer* of the document's font state, inline on `<html>`:
   `data-font` (fallback alias), `--dp-font-family`, `--dp-font-synthesis`,
   `--dp-scoreboard-font-family`, `--dp-scoreboard-font-synthesis`. It injects
   `<style id="dp-font-faces-<id>">` with the `@font-face` rules
   (`ensureFontFacesInjected`, idempotent) and warms the faces with
   `document.fonts.load()` so GSAP never measures text mid-swap.
   `generalStore.syncDocumentFont()` calls it.
3. **CSS** — `styles.css` defines `.dp-scoreboard-font { font-family: var(--dp-scoreboard-font-family, var(--dp-font-family)) }`.
   It is applied on the root of `CountryItemBase`, so every country-row variant
   built on it (`CountryItem` on the board, `ShareCountryItem` in share images,
   `CountryQualificationItem`, `ThemePreviewCountryItemUI` in cards and the
   editor) renders in the scoreboard font. Everything around the rows — board
   headers, the voting controls, reveal and winner modals, settings — keeps the
   interface font.
4. **Scoped previews** — `applyCustomTheme(theme, preview=true)` writes all four
   font variables into the `[data-theme="custom-preview"]` block (never relying
   on inheritance from `<html>`, which would show the *active* theme's font), and
   theme cards spread `getFontCssVarsForCustomTheme(theme)` into their inline vars.
   `useCustomFontFaces()` injects faces for anything that previews a font.
5. **FOUC** — the inline script in `src/app/layout.tsx` reads
   `general-storage.customTheme.customFonts`, injects the same `<style>` blocks
   and sets the same inline variables before first paint. Its face-CSS builder
   must stay byte-identical to `buildFontFaceCss()` so hydration finds the
   pre-injected style and leaves it alone.
6. **Family names** — custom fonts are registered as `'dp-font-<fontId>'` followed
   by the built-in fallback stack, so they can never collide with bundled or
   system families.

### 6. UI

- Theme editor → Look tab: **Interface font** (`FontPickerField`) and a
  "Use the interface font on the scoreboard too" checkbox that reveals a
  **Scoreboard font** picker when unchecked.
- `FontPickerModal` tabs: **Built-in** (13 aliases rendered in themselves),
  **My fonts** (search, select, Manage → `FontEditorCard`, delete with the
  409 → force flow), **Public fonts** (search/sort/date, creator, "Add to my
  library & use"), **Upload** (multi-file dropzone → immediate upload (public by
  default) with an XHR progress bar → `FontEditorCard`).
- `FontEditorCard`: rename, publish toggle (consent via the
  confirmation dialog), four weight slots showing *Uploaded* / *Uses N* /
  variable coverage, per-file slot reassignment, add/remove weight, preview at
  all four weights, "Use this font".
- Theme cards show a **Font** badge (`hasCustomFonts`) and render their preview
  in the theme's scoreboard font; Public Themes has a "With custom fonts" filter.

Editor payload rules: `fontAlias` is always sent (the built-in fallback);
`fontId`, `scoreboardFontAlias`, `scoreboardFontId` are sent when set on
create, and `null` on update when the theme previously had them. See
`theme-animations-and-specifics.md` §8.3.

### 7. API

| method | route | notes |
|---|---|---|
| GET | `/fonts/me` | paginated, `search`, `sortBy=createdAt\|name`; adds `usedByThemesCount` |
| GET | `/fonts/public` | paginated, `search`, dates, `sortBy=createdAt\|forksCount`; adds `creator`, `forkedByMe` |
| GET | `/fonts/:id` | owner, public, or carried by a public theme |
| POST | `/fonts` | multipart `files[]` (≤4), `name?`, `isPublic?`, `licenseAccepted?` → `{ font, warnings[] }` |
| PATCH | `/fonts/:id` | `name`, `isPublic` (+`licenseAccepted`), `weights: [{ sha256, weight }]` |
| DELETE | `/fonts/:id?force=` | 409 `{ usedByThemesCount }` without `force` when used by own themes |
| POST | `/fonts/:id/fork` | "Add to my library" (idempotent) |
| POST | `/fonts/:id/files` | add one face (`file`) |
| DELETE | `/fonts/:id/files/:weight` | remove a face (keeps ≥ 1) |

Theme routes accept `fontId`, `scoreboardFontAlias`, `scoreboardFontId` and the
`hasCustomFonts` list filter.

### 8. Ops

- **R2 CORS is required.** `@font-face` loads are CORS-restricted even for
  plain GETs. Run `npm run r2:cors` (dry run) then `npm run r2:cors -- --apply`
  in the backend once per environment, or set the rule in the Cloudflare
  dashboard (`GET, HEAD` from `*`). Verify:
  `curl -sI -H "Origin: https://douzepoints.app" https://cdn.douzepoints.app/fonts/blobs/<sha>.woff2`
  → `access-control-allow-origin: *`, `cache-control: public, max-age=31536000, immutable`, `content-type: font/woff2`.
- Bundled fonts under `/fonts/*` are now cached immutably (`public/_headers`);
  rename a file if its bytes ever change.

### 9. Extending (e.g. an audio library)

Reuse by shape, not by abstraction: content-addressed blobs +
`releaseBlobIfUnreferenced`, the per-user quota check, `listMine/listPublic`
query DTOs, fork-with-provenance, `attach<Asset>` batch lookups on themes, the
picker modal layout (built-in / mine / public / upload), and `api.upload()` with
progress. A sound library would add a `sounds` module with the same service
surface, swap the parser for audio metadata, and point `themeSounds.<event>` at
a `soundId`.
