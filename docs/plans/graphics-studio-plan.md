# Plan: Graphics studio (free-form image editor + templates)

> Status: **Phase 3 done (2026-10-05)**: saved-contest data source (with the
> inaccessible-contest fallback), live stage select, running-order rows,
> stats elements computing their own tables, template fields + generated
> form, the template sheet, six built-in templates with fields, backend
> `designs` module (R2 assets + thumbnails, likes, saves, duplicates with
> provenance), "Publish as template" dialog, community gallery with filters,
> Saved tab, share links, "Open in editor" from the stats share modal, the
> contest-logo image source. Phase 2 (2026-10-05) built the editor on the
> Claude Design handoff (`currentTask/design_handoff_graphics_studio`,
> direction A); Phase 1 (2026-10-04) moved the share images onto the engine.
> How it is built: [../graphics-studio.md](../graphics-studio.md) §8–9; what
> is still missing is listed there in §10. Phase 0 PoC evidence:
> [graphics-poc-results.md](graphics-poc-results.md). "Graphics studio" is a
> working name.

## Goal

Turn the fixed-form share images (results, running order, stats) into a
Canva-like editor where the user can drag, resize, rotate, add and remove
elements, change colors, fonts and other properties, add their own images and
icons, and bind the scoreboard elements to live scoreboard data, a saved
contest, or manually entered data. Templates make the simple path stay simple:
a template exposes a few fields as a form and renders the same way the current
share modals do today, and "Open in editor" turns it into a free-form design.
Templates can be published, reused and remixed like themes.

Later (not core, separate design pass): the country-item styles the editor can
express become part of the custom theme and drive the interactive scoreboard.

Today the share images come from
[ImageGenerator.tsx](../../src/components/simulation/share/ImageGenerator.tsx)
(results / running order) and
[StatsImagePreview.tsx](../../src/components/simulation/share/StatsImagePreview.tsx)
(stats), both rendering React into a fixed-size, CSS-scaled `div` and
snapshotting it with `html-to-image`. The two export loops are copies of each
other (the second lives in
[useImageGenerator.ts](../../src/hooks/useImageGenerator.ts)) and both retry
up to five times on Safari/Chrome because background images sometimes render
blank. Settings live in `ImageCustomizationSettings` (generalStore) and
`statsCustomizationStore`.

---

## Decisions (made 2026-10-04, don't re-ask)

- **No paid SDK.** Polotno, IMG.LY and similar are out. Everything is built on
  what is already in the repo plus small MIT libraries at most.
- **DOM editor, DOM export.** Elements are absolutely positioned React
  components inside the existing fixed-size canvas `div`; export stays
  DOM-to-image. Canvas object models (Fabric.js, Konva) are the fallback only if
  the PoC proves DOM export unfixable, because they would force a canvas
  re-implementation of every country row, stats table, gradient and font, and
  that kills the theme crossover.
- **Hand-rolled interaction layer** (pointer events, transform math, snapping)
  behind a small adapter. `react-moveable` is the fallback if hand-rolling
  stalls; its maintenance signals are weak, so it is not the default.
- **PoC first.** A throwaway dev-only route proves the risky parts before any
  product work. Exit gates are listed in Phase 0; failing them changes the
  approach, not the goal.
- **Design brief for Claude Design:** [../design/graphics-studio-design-prompt.md](../design/graphics-studio-design-prompt.md) (written 2026-10-04, before Phase 2).
- **Templates are first-class, public and remixable.** Same social model as
  themes: public gallery, likes, saves, duplicate with provenance
  (`remixedFrom`). Built-in templates ship as JSON in the repo and appear in the
  same gallery.
- **Simple mode stays.** The current Share Results / Share Stats forms remain
  the default. They become "template + bound fields", not a separate code path.
- Desktop-first editor; phones get tap-select and inspector editing, no
  promise of precise dragging.
- Out of scope: real-time collaboration, pen/vector tools, video, server-side
  rendering of designs. (Per-contest Open Graph images are a possible later
  spin-off, see Downstream.)

---

## Approach comparison (why DOM)

| | DOM editor + DOM export (chosen) | Fabric.js / Konva | Polotno |
|---|---|---|---|
| Reuses `CountryItemBase`, stats tables, theme CSS vars, gradients, custom fonts | yes, as-is | no, redraw everything on canvas | no, custom Konva elements |
| Editor chrome (selection, handles, snapping, inspector, undo) | build (~1–2k lines + UI) | mostly built-in | built-in |
| Export | `html-to-image` / snapdom; fidelity is the risk | native `toDataURL`, deterministic | built-in |
| Theme crossover later | same components render both places | second implementation to keep in sync | not possible |
| Cost | 0 | 0 | $199/mo+ |

The DOM path trades "write the editor chrome" for "never maintain two
renderers". The export risk is what the PoC must retire.

---

## UX outline

- **Entry points.** "Share results / running order / stats" keep opening the
  current modals. Each gets an **Open in editor** button. The Event Setup hub
  gets a **Graphics** widget: my designs, templates gallery, new blank design.
- **Editor** (full-screen modal or route): canvas centered with zoom-to-fit,
  left rail of element types + templates, right inspector for the selected
  element, top bar with canvas size, undo/redo, data source, export, save.
  Layers list collapsible in the inspector.
- **Elements v1:** text, image (upload / URL / contest logo / theme
  background), shape (rect, ellipse, line; solid or gradient fill, border,
  radius, shadow), flag (shapes incl. heart mask), scoreboard list (bound),
  stats table (bound), branding.
- **Data source** switcher: live stage (as today), any saved contest / snapshot,
  manual table (names, points, flags, custom entries).
- **Templates:** a design plus a list of exposed fields (`templateFields`). The
  gallery card shows the thumbnail; "Use" clones it into My designs with the
  bound fields shown as a short form (that is exactly what the current share
  modals are). "Publish as template" from any design: choose which fields to
  expose, name, description, public toggle. Remix provenance shown like themes.
- **Export:** PNG / JPEG at 1× / 2×, Web Share, copy to clipboard where
  supported.

---

## Technical design

### Document model (`src/graphics/model/`, zod, pure, Vitest)

```ts
Design {
  id, name, version: 1,
  canvas: { width, height, background: Fill },
  elements: Element[],              // z-order = array order
  data: DataBinding,                // { source: 'live' } | { source: 'contest', contestId, snapshotId?, stageId? } | { source: 'manual', rows: ManualRow[] }
  templateFields?: TemplateField[], // present when published/used as template
  remixedFrom?: { designId, name, userId },
}
ElementBase { id, type, x, y, w, h, rotation, opacity, locked, hidden, name? }
Text      { text, fontRef (builtin alias | font library id), size, weight, color, align, lineHeight, letterSpacing, uppercase, shadow }
Image     { src: AssetRef, fit: 'cover'|'contain', radius, flip }
Shape     { kind: 'rect'|'ellipse'|'line', fill: Fill, stroke, radius, shadow }
Flag      { countryCode | bound: 'rank:1', shape: FlagShape | 'heart', border }
Scoreboard{ columns, itemSize, showPoints, showRankings, shortNames, slice: [from, to], styleOverrides: Partial<CountryItemStyle>, themeOverride? }
Stats     { table: StatsTableType, voteType, stageId?, options }
Branding  { size }
Fill = { kind: 'color' | 'gradient' | 'image' | 'theme-bg', ... }
AssetRef = { kind: 'url' | 'r2', url, key? } | { kind: 'local', id }   // local = IndexedDB blob, drafts only
TemplateField = { path: string, label, kind: 'text'|'number'|'bool'|'select'|'image', options? }
```

Template fields are JSON pointers into the design (e.g. `elements[2].text`,
`data`, `elements[4].columns`). The simple-mode form is generated from them.

### Element registry (`src/graphics/elements/`)

Each type registers `{ Renderer, Inspector, defaults, bind(data) }`. Renderers
are plain React components with no store access; everything they need arrives
as props (resolved data, theme vars, fonts). `Scoreboard.Renderer` reuses
`ShareCountryItem` → `CountryItemBase`, which already takes theme specifics and
overrides as inputs. `Stats.Renderer` wraps `StatsTable` / `SplitStats` /
`SummaryStats`.

### Editor runtime (`src/graphics/editor/`)

- Zustand store with `zundo` temporal middleware for undo/redo (same pattern as
  `scoreboardStore`). Selection, hover, zoom and tool state stay out of the
  undo history.
- `Stage` renders the canvas `div` at design size with `transform: scale()`;
  an overlay renders selection boxes and handles in *screen* space. Pointer
  math divides deltas by the scale (this is the fiddly bit, proved in the PoC).
- `useTransformGesture` handles move / resize (8 handles, aspect lock with
  Shift) / rotate; `snap.ts` snaps to canvas edges, center lines and sibling
  edges with a 6 px threshold and renders guides.
- Keyboard: arrows nudge (Shift ×10), Delete, Cmd+D duplicate, Cmd+Z/Shift+Z,
  `[`/`]` z-order, Esc deselect.
- The whole editor is behind `next/dynamic` so it never enters the main
  bundle; `html-to-image` stays dynamically imported.

### Export (`src/graphics/export/`)

Single `exportDesign(node, { width, height, scale, format })`. Deterministic
sequence: resolve every `<img>` and CSS background to a same-origin blob URL
(proxy via `/api/image-proxy` as today), `await document.fonts.ready`, wait one
animation frame, snapshot once. No retry loop. The snapshot library is behind
this function so `html-to-image` and snapdom can be A/B'd in the PoC and
swapped later.

### Data (`src/graphics/data/`)

`resolveData(binding) → { countries: Country[], stage, contestMeta }` from the
scoreboard store (live), `useContestSnapshotQuery` (saved contests) or the
manual rows. Elements receive only the resolved view model.

### Persistence

- Drafts: IndexedDB store `graphics-designs` (extend
  [indexedDB.ts](../../src/helpers/indexedDB.ts)) with autosave; local image
  assets as blobs in `graphics-assets`.
- Cloud (Phase 3): backend `designs` module mirroring `themes`: `Design`
  document (JSON, thumbnail R2 key, `isTemplate`, `isPublic`, `likes`,
  `saves`, `duplicatesCount`, `remixedFrom*`), `DesignLike` / `DesignSave`,
  routes `POST /designs`, `GET /designs/me|public`, `PATCH|DELETE /designs/:id`,
  `POST /designs/:id/like|save|duplicate`, `POST /designs/:id/assets`
  (multipart → R2, same size limits as theme backgrounds), `POST
  /designs/:id/thumbnail`. Local assets are uploaded on first cloud save and
  rewritten to `r2` refs.
- Built-in templates: `src/graphics/templates/*.json`, validated by the zod
  schema in a Vitest test, listed in the gallery under "Built-in".

### Downstream

- **Theme crossover (Phase 4).** Define `CountryItemStyle` as the token set the
  `Scoreboard` element exposes (container shape, flag shape, place-number
  style, points container, colors per `ItemState`, border, shadow, spacing).
  `CustomTheme` already has `flagShape`, `pointsContainerShape`,
  `roundedCountryContainer`, `uppercaseEntryName` and color overrides; the rest
  are additions to `ThemeSpecifics`. Restrict to a fixed menu of layouts: the
  GSAP flip/teleport, douze-points and rounded-glow code assume specific
  geometry (see rounded-country-layout-and-2026-theme.md and
  theme-animations-and-specifics.md).
- **Open Graph images** for public contests could render a reduced element set
  from the same `Design` JSON with satori on Workers. Different renderer,
  shared document; only worth it after templates exist.

---

## Phases

### Phase 0 — PoC (throwaway, dev-only route, ~1 week)

Route `src/app/dev/graphics-poc/page.tsx` following the Palette Lab pattern
(compiled out in production). Nothing here needs to be reusable; copy, don't
refactor. It must answer these questions with evidence (numbers and screenshots
in a `docs/plans/graphics-poc-results.md` appendix):

1. **Export fidelity.** A fixture canvas (1200×630 and 1080×1920) containing:
   ~26 real `ShareCountryItem`s in the 2026 rounded layout with a gradient
   override and a custom font from the font library, one rotated and one
   scaled element, a text with shadow, a proxied external image, a locally
   uploaded image via blob URL, a heart-masked flag (CSS `clip-path`), a
   gradient background and a theme background image. Export with the
   deterministic sequence (preload → fonts.ready → one snapshot) using
   `html-to-image` and snapdom. Browsers: Chrome, Safari desktop, iOS Safari,
   Android Chrome, Firefox.
   *Gate:* pixel-faithful to the preview in all five with a single pass; no
   retry loop; 2× export under 3 s on a mid-range phone.
2. **Interaction layer.** Hand-rolled move / resize / rotate / snap on
   absolutely positioned elements inside a CSS-scaled container at 3 zoom
   levels, mouse and touch, with undo via `zundo`.
   *Gate:* handles track the pointer exactly at every zoom; no drift after 50
   operations; touch drag works on iOS.
3. **Model round-trip.** zod `Design` → render → export → serialize → reload →
   identical render. One hard-coded template with two bound fields producing
   an image from a saved contest snapshot via `useContestSnapshotQuery`.
4. **Bundle.** The PoC chunk size when loaded via `next/dynamic`; confirm the
   main bundle is unchanged (`yarn build` output).

Fallback decisions if a gate fails: export → try snapdom, then a manual SVG
`foreignObject` rasterizer with inlined fonts, then (last) Fabric.js for the
scoreboard element only; interaction → `react-moveable`; phone export time →
cap phone exports at 1×.

### Phase 1 — Foundations (1–2 weeks)

Document model + element registry + export module. Re-render today's results,
running-order and stats images as built-in templates with no editing and verify
parity against the current output. Delete the duplicated export loop. Simple
mode now renders from templates; users see no change.

### Phase 2 — Free-form editor MVP (2–3 weeks)

Editor shell, selection, transforms, snapping, z-order, duplicate, delete,
keyboard, undo/redo, layers, inspectors. Elements: text, image, shape,
scoreboard, branding. Canvas presets + custom size, backgrounds. IndexedDB
drafts, PNG/JPEG export at 1×/2×, Web Share. "Open in editor" from the share
modals. Phone: tap-select + inspector.

### Phase 3 — Data, templates, community (2–3 weeks)

Data source switcher (live / saved contest / manual table incl. custom
entries). Flag and stats elements. Template fields + generated form. Built-in
templates: results, running order, qualifiers, announcement poster, stats.
Backend `designs` module, uploads to R2, thumbnails, public gallery, likes,
saves, duplicate with provenance, share by link, Graphics widget in the Event
Setup hub, "Publish as template".

### Phase 4 — Theme crossover (later, 2+ weeks, own design pass)

`CountryItemStyle` tokens in `CustomTheme`; board `CountryItem` and editor
`Scoreboard` element consume the same object; fixed layout menu.

---

## Sources

- Fabric.js vs Konva vs PixiJS (2026): https://www.pkgpulse.com/guides/fabricjs-vs-konva-vs-pixijs-canvas-2d-graphics-2026
- Konva vs Fabric technical comparison: https://medium.com/@www.blog4j.com/konva-js-vs-fabric-js-in-depth-technical-comparison-and-use-case-analysis-9c247968dd0f
- snapdom (DOM → SVG/PNG, benchmarks vs html2canvas): https://feedbagel.com/post/snapdom-a-speedy-alternative-to-html2canvas-for-capturing-html-elements
- react-moveable health/maintenance: https://mcp.depscope.dev/pkg/npm/react-moveable
- Polotno pricing (rejected, for the record): https://polotno.com/sdk/pricing-update
