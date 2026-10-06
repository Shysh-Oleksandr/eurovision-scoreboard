# Graphics studio

The engine behind every generated image in the app (share results, share
running order, share stats) and, in later phases, the free-form graphics
editor and public templates. Plan and status:
[plans/graphics-studio-plan.md](plans/graphics-studio-plan.md); PoC
evidence: [plans/graphics-poc-results.md](plans/graphics-poc-results.md).

Phase 1 (2026-10-04) moved the three share images onto this engine with no
visible change for users. Phase 2 (2026-10-05) added the free-form editor
(handoff direction A, rail + inspector), local drafts and the Graphics widget.
The module lives in `src/graphics/`.

## 1. Mental model

A **design** is a JSON document: a canvas (size, background layers) plus an
ordered list of **elements**. Elements are either absolutely positioned
(`x`/`y`/`w`/`h` in canvas px, the free-form editor's world) or laid out in
flow inside a **stack** container, where `x`/`y` are ignored and a missing
`w`/`h` means "fill the cross axis" / "auto height". The stack is what lets
the share images stay a centred column that adapts to the number of rows
while still being an ordinary design the editor can open.

Data-bound elements (the country grid, the stats tables) do not carry data.
They read it from `DesignDataContext`, which the owner resolves from the
design's `data` binding (`live` = the scoreboard store, `provided` = rows
handed in by the caller, `manual` = rows in the document).

A **template** is, for now, a function `settings → Design` (`templates/`).
`templateFields` (dot paths exposed as a form) exist in the schema but are
not used yet; Phase 3 turns them into user-publishable templates.

## 2. Files

| path | what |
|---|---|
| `model/design.ts` | zod schema + types: fills, elements, stack, data binding, canvas, `Design`; `parseDesign`, `walkElements` |
| `model/serialize.ts` | canonical (sorted-key) `serializeDesign` / `deserializeDesign`, `getAtPath` / `setAtPath`, `newElementId` |
| `elements/registry.tsx` | `ElementView` (type → renderer), `AbsoluteChild`, flow children, the stack renderer |
| `elements/*Element.tsx` | one renderer per type: text, image, shape, flag, scoreboard, stats, branding |
| `model/designTheme.ts` | `design.theme` helpers: snapshot of the active theme, `ThemeScope` value, inline CSS variables, labels |
| `render/DesignStage.tsx` | renders a design at design size inside a wrapper scaled by `zoom`; auto-sized canvases are measured with a ResizeObserver; scopes the node to `design.theme` |
| `render/useElementFont.ts` | class + style for an element's font slot (`ui` / `scoreboard` / `custom`) and `@font-face` injection |
| `render/DesignDataContext.tsx` | `DesignDataProvider` / `useDesignData`; `StatsSource` |
| `render/fills.tsx` | fill → style/class; background `FillLayers` |
| `export/exportNode.ts` | deterministic DOM → image (see §4) |
| `export/useDesignExport.ts` | hook: `nodeRef`, `generate(size)`, `isGenerating` |
| `components/DesignPreview.tsx` | preview + "Generate image" used by the share modals |
| `templates/results.ts` | `buildResultsDesign` (share results / running order) |
| `templates/stats.ts` | `buildStatsDesign` (share stats; content-sized) |
| `templates/editor.ts` | built-in templates (Blank, Results, Running order, Qualifiers, Top 10, Announcement poster, Stats) with their `templateFields`, and `toEditableDesign` for "Open in editor" |
| `templates/fields.ts` | template fields: candidates per element, control derivation, `applyTemplateField` (see §9) |
| `data/contestRows.ts` | saved-contest snapshot → ranked rows / stage list |
| `cloud/publishDesign.ts` | publish pipeline: create/update, upload `asset:` images, rewrite refs, thumbnail |
| `components/TemplateSheet.tsx`, `TemplateFieldsForm.tsx`, `DataSourceControl.tsx`, `ContestPicker.tsx` | the template sheet and its form controls |
| `export/imageActions.ts` | download / Web Share / copy helpers shared by the editor and the sheet |
| `model/elements.ts` | tree helpers (`findElement`, `mapElements`, `removeElementsIn`), per-type capability rules (`resizeModeOf`, `canRotate`, `canDelete`…) |
| `model/geometry.ts` | pure transform math: resize around the anchored side, rotate, snap + distance hint, bounding/union boxes |
| `model/presets.ts` | canvas presets, gradient parse/build, upload limit |
| `model/resizeCanvas.ts` | proportional relayout when the canvas size changes |
| `editor/` | the editor (see §8); `editor/flatten.ts` turns stacks into free elements on open |
| `storage/designsDb.ts` | IndexedDB drafts (`graphicsDesigns`) and uploaded images (`graphicsAssets`) |
| `assets/localAssets.ts` | `asset:<id>` / `theme:bg` / `contest:logo` image sources, upload with the 8 MB limit, `useLocalAssetUrl` |
| `state/graphicsStudioStore.ts` | app-level entry points: `openEditor(request)`, `openSheet(request)`, Graphics modal flag + tab, drafts version |
| `components/GraphicsEditorHost.tsx` | mounted once in `Main`; lazy-loads the editor chunk when a request arrives |
| `components/DesignThumb.tsx` | a design scaled into a fixed box (gallery cards, template rows) |

Unit tests: `model/design.test.ts` (schema, templates, round trip, paths),
`model/geometry.test.ts` (resize/rotate/snap maths), `templates/fields.test.ts`
(every built-in's fields resolve; apply/read back), `editor/flatten.test.ts`
(stacks → free elements at measured boxes; content-sized canvas → fixed). Frontend API:
`src/api/designs.ts`, types `src/types/design.ts`; backend module
`douze-points-backend/src/designs/` (`design-derived.spec.ts`).

## 3. Element contract

Renderers receive only their element. Everything else comes from context:

- rows and `isVotingOver` → `useDesignData()`;
- theme colours → CSS variables already on `<html>` (`tw-colors`), so
  `ShareCountryItem` and the stats tables render exactly as on the board;
- fonts → `dp-scoreboard-font` on country rows (see
  custom-fonts-and-font-library.md); text elements choose the UI or
  scoreboard slot via `fontSlot`.

`ScoreboardElement` reuses `ShareCountryItem` and `useReorderCountries`
(column-major fill). `statusMode: 'uniform'` is the running-order / podium
look (every row the neutral surface, `withConsistentCountryStatus`);
`'live'` colours rows by jury / finished / NQ state.

`StatsElement` renders `StatsTable` / `SplitStats` / `SummaryStats` from the
`StatsSource` the stats modal passes to `DesignDataProvider`. The stats
customisation store (border opacity, voting-country names) is still read by
the tables themselves.

Adding an element type: extend `design.ts` (schema + union), add a renderer,
add a `case` in `ElementView`. The stack is defined in `registry.tsx`
because it and `ElementView` are mutually recursive.

## 4. Export

`exportNode(node, { width, height, scale, format, quality, engine })`:

1. inline every `<img>` and CSS `background-image` under `node` as data
   URLs (through `/api/image-proxy` for foreign origins, which the flag and
   background helpers already apply), force eager loading, await `decode()`
   and a real `load`;
2. `await document.fonts.ready` + two animation frames;
3. snapshot once with **snapdom** (default). snapdom reports degradations;
   an `image-fallback` warning (an image could not be inlined, grey
   placeholder drawn) triggers **one** re-capture with its resource cache
   invalidated. If snapdom throws, **html-to-image** runs as the fallback.
   `reconcile: true` is enabled only when the node contains a `<table>`
   (text re-wrap check, ~2× capture time).

This replaces the old five-attempt loop (two copies of it) that compared
output sizes because it had no signal for a missing image. Results and
timings per browser: plans/graphics-poc-results.md. In dev, warnings are
logged as `[graphics] export …`.

`scale` is the output multiplier. The share modals keep the old effective
sizes: results = quality factor (2 on desktop with "high quality") × device
pixel ratio (capped at 2); stats = device pixel ratio (capped at 3). Those
multipliers were an accident of html-to-image's defaults; Phase 2 should
replace them with explicit export sizes.

## 5. Auto-sized canvases (stats)

`canvas.autoSize: true` lets the content decide the size: the stage renders
the fill-canvas stack at `max-content`, measures it with a ResizeObserver,
sizes its own scaled wrapper from the measurement (not from the design's
minimum, or the preview would be clipped), reports it (`onMeasured`), and
`DesignPreview` uses the measured size for the preview scale and the export.
The preview scale itself follows the container width through a second
ResizeObserver, so it tracks window resizes. Until a measurement has been
stable for 150 ms the stage stays `visibility: hidden` and the fit runs in a
layout effect, so the user never sees the preview fitted to the
pre-measurement minimum (it used to flash wide, then snap back).
`buildStatsDesign` also needs the measured width for the title/branding
font sizes (clamped 22–42 px and 16–22 px at 4 % / 2.5 % of width, as
before), so `ShareStatsModal` keeps a `measuredWidth` state and rebuilds the
design when it changes by more than 10 px. Auto-generation waits 300 ms
after the measurement settles.

## 6. Share modals (simple mode)

`ShareResultsModal` and `ShareStatsModal` keep their forms and stores
(`imageCustomization` in generalStore, `statsCustomizationStore`). They build
a design from the form state and render
`<DesignDataProvider><DesignPreview/></DesignDataProvider>`. Download and
Web Share are unchanged. `DesignPreview` auto-generates when its host is
open and `autoGenerateKey` changes (stage id / stats tab), never on settings
edits — the user presses "Generate image" for those, as before.

## 7. Image sources

`ImageElement.src` and image fills take a URL, or one of two conventions:
`asset:<id>` (an upload stored as a data URL in IndexedDB `graphicsAssets`,
resolved through a module cache by `useLocalAssetUrl`) and `theme:bg` (the
active theme background). Uploads over 8 MB raise `ImageTooLargeError` and
the editor shows the "too large" dialog. Keeping uploads out of the design
JSON keeps drafts small and stops the undo history from copying image bytes.

## 8. Editor (Phase 2)

Entry points: the **Graphics** widget on the Hub (fourth card, teal) opens
`GraphicsModal` (My designs = IndexedDB drafts · Templates = built-ins);
"Open in editor" in the Share results / running order modal converts the
share design with `toEditableDesign` (running-order `provided` rows become a
manual list) and opens it with the scoreboard selected. Both go through
`useGraphicsStudioStore.openEditor()`; `GraphicsEditorHost` (in `Main`)
mounts the lazily imported `GraphicsEditor` in a portal at z-index 1005.

Layout (`editor/GraphicsEditor.tsx`): ≥ 1024 px is direction A — top bar
(`chrome/EditorTopBar`), 64 px rail + 290 px panel (`chrome/EditorRail`),
stage, 320 px inspector (`inspector/Inspector`). Below that it is the phone
editor: `phone/PhoneChrome` (top bar, bottom bar, 52 % sheet with the
inspector sections as tabs and a d-pad in Layout; tap selects, one-finger
drag moves, no handles).

State (`editor/editorStore.ts`): zustand + zundo. Only `design` is in the
history; selection, hover, zoom, panel/sheet and export settings are UI
state. `load()` clears the history so opening is not an undo step. A
subscription drops selection ids that an undo/template swap removed.
`dirty` flips on every design edit; `useAutosave` writes the draft 1.5 s
after the last edit once a record exists, `Save` creates it. Closing a dirty
unsaved design asks (save / discard).

Stage (`editor/EditorStage.tsx`): the viewport is the neutral dotted
surface; `DesignStage` renders the design inside a `translate()`d world at
the fit zoom (48 px padding, 14 px on phones) or 50 % / 100 %; the
selection chrome (`SelectionOverlay`) is a sibling world so it never enters
the exported node. Pointer-down on the design node resolves
`[data-element-id]` under the pointer (stack children included; the
full-canvas layout stack counts as background) and starts a move.

Boxes (`editor/useElementBoxes.ts`): content-sized elements (scoreboard
height, stats, branding) have no `w`/`h` in the model, so the editor
measures every element node after each render and on resize. Free elements
take x/y from the model and the layout size from the DOM; stack children
take everything from the DOM.

Stacks are flattened on open (`editor/flatten.ts`). Templates and share
images are built from flow stacks so they stay responsive to the row count,
but inside the editor every element should drag, resize and reorder like on
a blank design. So `load()` / `replaceDesign()` set `flattenPending`; once
the data is in (`status !== 'loading'`) and every visible element has a
measured box, the stage calls `flatten(boxes, measured)`: each descendant
becomes a free element at its measured box (scoreboards keep the measured
width only, stats/branding nothing), stacks disappear, and a content-sized
canvas becomes a fixed one at its measured size. Not an undo step. The
template sheet and the share modals keep rendering the stack version.

Paint order follows the layer list: every `AbsoluteChild` / flow child is
its own stacking context (`isolation: isolate`), so the z-indexes inside the
country rows never lift a scoreboard above a shape that is higher in the
list. Elements can't leave the canvas during a move (`MIN_INSIDE` = 32 px
stays inside on each axis) and the parts of a selected element that do lie
outside the canvas get invisible grab pads in the overlay (`.gfx-grabpad`),
because the clipped canvas node has nothing left to click on.

Gestures (`editor/useGestures.ts`): move (multi-select, snapping to canvas
edges/centre and sibling edges/centres at 6 screen px, with the distance
pill), resize (8 handles; scoreboards and stacks side handles only; Shift
keeps the aspect on corners), rotate (Shift = 15°, dead zone around 0°).
One undo entry per gesture: the first tracked set pushes the pre-gesture
state, then the history is paused until release; the final rounding set's
push is reverted (same trick as the PoC).

Keyboard (`useEditorKeyboard.ts`): arrows nudge 1 / Shift 10, ⌘Z / ⇧⌘Z, ⌘D,
Delete/Backspace, `[` `]` (⌘ to the end), Esc closes popover → panel →
sheet → selection, Enter on a text element focuses its Text field.

Inspector (`inspector/sections.tsx`): one `useElementSections(el, ctx)`
produces the handoff §5 sections per type and `useCanvasSections()` the
canvas ones (Canvas size · Theme · Background · Data source); the desktop
inspector stacks them as collapsible sections (`Position & size` starts
collapsed; bodies stay mounted and animate through a `grid-template-rows`
transition, closed ones are `inert`), the phone sheet shows them as tabs.
`focusSection(id)` (store) opens a section, scrolls to it and flashes it —
the top-bar size and theme chips use it. Controls live in
`editor/ui/controls.tsx`. Gradient fills are edited as from/to/angle
through `parseGradient`/`buildGradient`. The button reset in `editor.css`
is `:where(.gfx-editor button)` on purpose: zero specificity, so `dp-cta`,
`dp-act` and the `gfx-*` classes keep their own font weights and
backgrounds.

Export (`useEditorExport.ts`): PNG/JPEG at 1×/2×/3× from the popover; one
`exportNode` pass (snapdom, html-to-image fallback inside), then the result
dialog with Download / Web Share / Copy (clipboard wants PNG, so JPEG is
re-encoded). A failure shows the handoff copy with "Try again" and "Try the
other engine" (the engine toggles explicitly).

Styling: `editor/editor.css` (plain CSS on the hue-derived tokens, `gfx-*`
classes, also loaded by the Graphics modal). Copy lives under the
`graphics` namespace in `messages/en.json`.

## 9. Data sources, templates and the cloud (Phase 3)

**Data binding.** `design.data` is `live` (the scoreboard store; an optional
`stageId` picks another stage of the running event, else the viewed stage),
`manual` (rows in the document), `contest` (a saved contest: `contestId`,
denormalised `contestName`, optional `stageId`) or `provided` (share modals
only). `DesignDataProvider` resolves all of them: `contest` loads the snapshot
with `useContestSnapshotQuery` and ranks the chosen stage
(`data/contestRows.ts`, ported from the PoC); if the contest can't be opened
(403/404) the rows quietly fall back to live and `inaccessible` says why —
the editor shows the "contest you can't open" dialog once, the template
sheet a warning note. The resolved data also carries the stage's
`runningOrder` (scoreboard `rowOrder: 'runningOrder'` lists rows in draw
order) and, for live sources, `statsStage` (the stage + its predefined
votes) so stats elements compute their own tables through
`finalStats/statsAccessors.ts` — the pure part extracted from
`useFinalStats`. Stats on manual or contest sources show a placeholder.
The Data panel offers Live (stage select), Saved contest (search, yours /
public, stage select) and Manual (`components/ContestPicker.tsx`,
`components/DataSourceControl.tsx`).

**Template fields** (`templates/fields.ts`). A published design exposes a
few properties as a short form. A field is `{ path, label }`; the control is
derived from the target (`templateFieldCandidates`, `resolveTemplateField`,
`applyTemplateField`): `el.<id>.text`, `.columns`, `.itemSize`, `.limit`,
`.table`, `.voteType`, `.countryCode`, plus `data`, `canvas.size` and
`canvas.bgOpacity`. `TemplateFieldsForm` renders it; the **template sheet**
(`components/TemplateSheet.tsx`, handoff §3) shows the form, the live
preview, Generate → result card (2× PNG, Download / Share / Copy, retry with
the other engine) and "Open in editor" (which stamps `remixedFrom` for
provenance). Built-ins (`templates/editor.ts`: results, running order,
qualifiers, top 10, announcement poster, stats) declare their fields and are
validated in `templates/fields.test.ts`.

**Cloud.** Backend module `designs` (`douze-points-backend/src/designs`)
mirrors `themes`: `Design` document (JSON + derived `sizeClass`,
`hasScoreboard`, `hasStats`, `fieldsCount`, thumbnail, `assetKeys`),
`DesignLike`/`DesignSave`, routes `POST /designs`, `GET /designs/me|public|
me/saved|state|:id`, `PATCH|DELETE /designs/:id`, `POST /designs/:id/assets|
thumbnail|like|save|duplicate`. `isPublic: false` means *unlisted* (link
only). Frontend: `api/designs.ts`, `types/design.ts`. **Publish as template**
(`editor/chrome/PublishDialog.tsx`, handoff §8): name, description,
visibility, exposed fields as checkbox cards per element with label inputs,
the form preview and a thumbnail; `cloud/publishDesign.ts` creates/updates
the record, uploads every `asset:` image to R2 and rewrites the cloud copy
(the local draft keeps `asset:` refs), then uploads a JPEG thumbnail. The
draft record remembers `cloudId` so later publishes update in place. Signed
out → sign-in dialog. The Graphics modal's Templates tab lists Mine (cloud),
Built-in and Community (search, sort, size and content filters, like / save
/ copy link / share / unpublish); Saved lists saved templates; `?design=<id>`
share links open the sheet (`useShareLinks`).

**Other.** `contest:logo` image source (the loaded contest's logo, else the
hosting country's). "Open in editor" on the Share stats modal binds the
design to the live stage the modal showed.

## 10. Design theme, fonts and branding

**`design.theme`** (`model/design.ts`, helpers in `model/designTheme.ts`).
A design renders in a theme of its own — `{ kind: 'year', year }` or
`{ kind: 'custom', theme }` with a trimmed snapshot of a custom theme
(palette inputs, overrides, specifics, background image URL, font
snapshots; no sounds or ownership) — so a saved design looks the same later
whatever theme the app is on. `editorStore.load()` stamps the app's active
theme into a design that has none, and `replaceDesign()` keeps it across
template swaps. `DesignStage` provides a `ThemeScope`
(`src/theme/ThemeScope.tsx`) and puts the theme's `--twc-*` palette,
interface tokens and `--dp-font-family` / scoreboard font variables inline
on the design node (re-resolving `font-family` there so the editor chrome's
inherited face does not leak in). The row components read the theme through
`useScopedTheme()` — `useThemeSpecifics`, `useShareBgImage`,
`ShareCountryItem`, `CountryPlaceNumber` — and fall back to the general
store outside a scope, so the board itself is unchanged. The account-level
custom background is ignored inside a scope. Without `theme` (share-modal
images, the template sheet's previews) a design still follows the active
theme. The canvas inspector's **Theme** section lists the user's themes
(`useMyThemesListQuery`), the built-in ESC / JESC years and, when needed,
the theme the design already carries; "Use the app's theme" resets it.

**Fonts per element.** Text and branding elements have `fontSlot: 'ui' |
'scoreboard' | 'custom'` and, for `custom`, a `font` — a bundled alias or a
font-library snapshot (`designFontSchema`). `render/useElementFont.ts`
turns that into class/style and injects the `@font-face` rules; the
snapshot travels with the document so published templates render in the
same font everywhere (the files are public, but see the R2 CORS note for
exports). `inspector/FontField.tsx` is the control: a UI / Scoreboard /
Custom segment, the picker trigger (opens `FontPickerModal` with
`slot="element"` above the editor at z 1012) and one-click chips of the
fonts already used in the design (`usedDesignFonts`). The Weight select
offers Regular / Medium / Semibold / Bold only, the four weights every font
ships; older documents with 800 snap to Bold in the UI.

**Branding** keeps its text, but `fontWeight`, `color`, `fontSlot` /
`font`, `shadow`, `showIcon` and `uppercase` are editable (all optional in
the schema; `BRANDING_DEFAULTS` is the classic look).

The editor also warns through the browser's own `beforeunload` prompt when
the tab is closed with unsaved changes.

## 11. Release hardening (review round, 2026-10-05)

What changed after the pre-release review in
`docs/plans/graphics-studio-release-review.md`:

- **Drafts never vanish.** `putDesignRecord` validates and normalises the
  document before writing (a design that would not load again is never
  stored; the name falls back to "Untitled design");
  `listDesignsWithUnreadable()` returns records that fail the schema
  separately and the gallery shows them as "unreadable" cards with Export
  (.json) and Delete. The Data panel and the sheet switcher keep the current
  binding until a contest is actually picked (`pickingContest`); manual
  Points are whole and ≥ 0; Add row picks the first unused country;
  scoreboard rows are keyed by rank so duplicate codes stay distinct.
- **Lossless canvas resizing.** `setCanvasSize` re-lays out from
  `resizeBase` (the document before the current run of resizes; any other
  edit clears it), the width/height fields commit on blur/Enter
  (`NumberField commitOnBlur`), and the template sheet derives its design
  from the template plus the field values applied in order
  (`TemplateSheet` `values` map), so toggling sizes never compounds.
- **Autosave for every edited design** (`useAutosave`): the record is
  created on the first edit, closing just flushes, and the unsaved dialog
  only appears when a save fails. Opening a template is clean (`flatten`
  sets `dirty` after restoring the history).
- **Publish pipeline**: every upload is resolved before any request
  (`MissingAssetError`), the cloud id is remembered as soon as the record
  exists (`onCreated`), a 404 on update (unpublished elsewhere) falls back to
  create, and the draft's `templateFields` change only after success.
  `templateFields` are mirrored in the store and re-applied after undo/redo.
- **Editor**: Escape never closes the editor; `Field` is a `div`; a click no
  longer applies the minimum size (resize gestures only); shortcuts pause
  while the font picker or the contest dialog is open (`modalDepth`);
  primary button only; grab pads and clamps as before; new elements step
  24 px off occupied spots; height-locked resize keeps the rotated centre;
  an unmount mid-drag resumes the history; the store resets on close and
  unreferenced uploads are swept (`sweepUnreferencedAssets`); phones get
  pinch zoom / double-tap (`usePinchZoom`), Redo, a theme-aware subtitle
  that opens Canvas → Theme, and the bar comes back when the selection
  empties. Layers use list semantics; handle labels are translated.
- **Gallery**: rename and report use dialogs (`PromptDialog`,
  `ReportDialog`), drafts can be exported/imported as `.douze-design.json`,
  the header says drafts live in this browser, thumbnails and counters have
  accessible names, community cards moved to
  `components/CloudDesignCards.tsx` and also render in profile content
  feeds (`type: 'design'`), with a Report action (`api/reports.ts`).
- **Backend** (`douze-points-backend/src/designs`, `src/reports`): asset
  reference counting by URL (`assetRefs`) before deleting R2 objects, pruning
  of unreferenced `assetKeys` on update, public designs rejected while they
  still contain `asset:` sources, multer `limits`, magic-byte image checks,
  atomic like/save counters, per-user dedupe of `duplicatesCount`,
  ObjectId guards, quotas (100 designs, 24 assets per design), compound sort
  indexes, `minimize: false`, a `reports` module (`POST /reports`,
  `GET /reports/me/state`), designs in the user-content feed and
  `designsCount` / `savedDesignsCount` in the profile summary.
- **Template fields** gained `image` (an image element's source).

## 12. Still deliberately not here

- Cloud copies of private drafts (only published templates live in the
  cloud; drafts stay in this browser — export/import JSON is the backup).
- Theme-driven row overrides per design (the Row style section points at
  the Theme section instead).
- Custom fonts and uploaded images in exports depend on the same R2 CORS
  rule as the font library (see `custom-fonts-and-font-library.md` §8).
- Stats tables for saved-contest and manual sources (the inspector says so
  and offers "Switch to Live").
- R2 CORS for custom-entry flags: the export inlines
  `cdn.douzepoints.app` images directly, so a contest with uploaded custom
  flags renders them blank until the bucket allows the app origin.

Those are Phase 3 leftovers and Phase 4 in the plan.
