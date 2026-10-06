# Graphics studio — Phase 0 PoC results

> Companion to [graphics-studio-plan.md](graphics-studio-plan.md). The PoC lives
> at `/dev/graphics-poc` (dev builds only; `src/components/dev/graphics-poc/`).
> It is throwaway code: nothing in it is meant to be reused as-is.

## What was built

- **Design model** (`model.ts`): zod schema for a `Design` (canvas, ordered
  elements, data binding, optional template fields), five element types
  (text, image, shape, flag, scoreboard), a canonical serializer and dot-path
  helpers for template fields.
- **Renderer** (`DesignRenderer.tsx`): renders a design at design size inside
  a wrapper scaled by `zoom`; the scoreboard element reuses the real
  `ShareCountryItem` rows, flags are heart-masked with a CSS `mask-image`.
- **Export** (`exportDesign.ts`): one function, two engines (`html-to-image`
  1.11, `@zumer/snapdom` 3.2). Deterministic sequence: inline every `<img>` and
  CSS background as data URLs + `decode()`, `await document.fonts.ready`, two
  animation frames, one snapshot. No retry loop. Pixel-diff and hash helpers.
- **Editor** (`useGestures.ts`, `geometry.ts`, `SelectionOverlay.tsx`,
  `editorStore.ts`): hand-rolled move / resize (8 handles, Shift = aspect) /
  rotate (Shift = 15°) / snapping to canvas and sibling edges, keyboard
  shortcuts, layers, inspector, zundo undo with one entry per gesture.
- **Round trip + template** (`RoundTripPanel.tsx`): JSON → zod → render →
  export → pixel diff against the in-memory design; a template with two bound
  fields (`elements.1.text`, `elements.3.columns`) and a data-source switch
  (live store / saved contest snapshot / manual rows / fixture).

## Gate 1 — export fidelity

Fixture: 26 real country rows (2026 rounded layout, active theme), rotated
gradient panel, translucent ellipse with border, text with shadow in the UI
and scoreboard fonts, external image via `/api/image-proxy`, local image,
heart-masked flag, gradient background (landscape) / theme background image
(portrait).

### Chrome 154, macOS, dpr 2 (2026-10-04)

| fixture | engine | scale | preload | preload ms | fonts ms | capture ms | encode ms | **total ms** | bytes |
|---|---|---|---|---|---|---|---|---|---|
| 1200×630 | html-to-image | 2× | yes | 62 | 36 | 859 | 325 | **1283** | 344 KB |
| 1200×630 | snapdom | 2× | yes | 18 | 47 | 274 | 65 | **404** | 347 KB |
| 1080×1920 | html-to-image | 2× | yes | 25 | 34 | 651 | 112 | **821** | 565 KB |
| 1080×1920 | snapdom | 2× | yes | 19 | 33 | 161 | 103 | **317** | 566 KB |
| 1200×630 | html-to-image | 2× | skipped | 0 | 38 | 775 | 67 | **880** | 344 KB |
| 1200×630 | snapdom | 2× | skipped | 0 | 40 | 215 | 58 | **314** | 347 KB |

- Both engines reproduced the preview in a single pass: flags, rounded rows,
  place numbers, gradients, the rotated panel, the heart mask, text shadows,
  the proxied external image and the theme background all match. No warnings.
- Engine A/B pixel diff: 4.19 % of sampled pixels differ by more than 12/255
  on at least one channel. Visually indistinguishable; the difference is
  anti-aliasing and JPEG noise, not missing content.
- snapdom is ~3× faster than html-to-image at 2× on this machine, with the
  same output size.
- "Skip preload" (the legacy behaviour the five-attempt retry loop papered
  over) also produced a correct image in Chrome, so Chrome alone cannot
  reproduce the old blank-background bug; Safari is the browser to watch.
- Custom fonts: the fixture used the active theme's fonts. If the theme uses
  a font-library font served from R2, both engines must fetch the font file
  cross-origin; the R2 CORS rule is still pending (see
  custom-fonts-and-font-library.md), so that case may warn/fallback until it
  is applied.

### Other browsers — TO RUN (desktop Safari, iOS Safari, Android Chrome, Firefox)

Open `/dev/graphics-poc` on the device (the dev server prints a LAN URL),
run **Export** with engine "both" at 2× for both fixtures, compare each image
to the preview, then **Copy results as markdown** and paste below. Also run
once with "skip preload" ticked on Safari to see whether the legacy bug
reproduces there and whether the preload fixes it.

| browser | fixture | engine | total ms (2×) | faithful? | notes |
|---|---|---|---|---|---|
| Safari macOS | both | both | (not recorded) | yes | reported 2026-10-04: everything fine |
| iOS Safari (phone) | both | both | (not recorded) | yes | export fine; page could not scroll (fixed, see below); round-trip hash threw (fixed, see below) |
| Android Chrome (phone) | | | | | |
| Firefox | landscape | snapdom | (not recorded) | **1st run: no** | first export missed the uploaded (blob) image; second run fine. html-to-image fine. See "Firefox / snapdom miss" below. |

### Firefox / snapdom first-run miss (2026-10-04)

Symptom: the first snapdom export after uploading an image rendered the
scoreboard, flags and everything else but not the uploaded image; re-running
produced it. html-to-image on the same run was fine. This is the shape of the
bug the old five-attempt retry loop was written around.

What snapdom does: when an image cannot be inlined it records a
`{ code: 'image-fallback' }` entry in `result.warnings` and draws a grey
placeholder. So the failure is *detectable*, unlike with html-to-image where
the old code could only compare output sizes.

Changes made in response:

1. `exportNode` now surfaces snapdom's own `result.warnings` (prefixed
   `snapdom:`) so the next Firefox run shows the exact code and message.
2. If the capture reports `image-fallback`, it is re-captured **once** with
   `invalidate: true` (resource cache bypassed) and the result records
   `retries: 1`. This is a verified, bounded retry: it fires only on a
   reported degradation and never more than once.
3. The preload step now also waits for `img.complete && naturalWidth > 0`
   (with a 3 s timeout) after `decode()`, and fetches `blob:` URLs without a
   cache mode.

**To verify on Firefox:** upload a new image, export with snapdom, and read
the warnings line under the run. Expected: either no warnings (the preload
fix removed the race), or `snapdom: image-fallback …` followed by
`retries 1` and a correct image. If the retry also fails, the warnings will
say why.

Decision guidance: snapdom stays the preferred engine (≈3× faster, same
output). The product rule is "one deterministic pass, plus at most one retry
triggered by a reported warning"; html-to-image remains available behind the
same `exportNode` seam as a per-browser fallback if Firefox keeps failing on
the retry.

### iPhone fixes (2026-10-04)

- **Page could not scroll:** every element wrapper had `touch-action: none`,
  including in the read-only previews, so touching the preview blocked
  scrolling. Now only the editor stage (where elements are draggable) sets it.
- **`crypto.subtle.digest` undefined:** `crypto.subtle` exists only in secure
  contexts (https or localhost); the phone used the LAN http URL. `sha256()`
  now falls back to a two-lane FNV-1a hash in that case.
- Gestures (drag, resize, rotate) worked on the phone but were reported as
  inconvenient; consistent with the plan's "desktop-first editor, phones get
  tap-select and inspector editing" decision.

Gate: faithful in all five browsers in one pass; 2× under 3 s on a mid-range
phone.

## Gate 2 — interaction layer

Chrome, scripted pointer events on the heart-flag element:

| zoom | screen drag | design delta | expected | handle under pointer |
|---|---|---|---|---|
| 0.25× | +80, +60 px | +320, +240 | +320, +240 | yes |
| 0.5× | +80, +60 px | +160, +120 | +160, +120 | yes |
| 1× | +80, +60 px | +80, +60 | +80, +60 | yes |

- 50 alternating moves (+10/−10 px at 0.5×): start and end coordinates
  identical, no drift.
- Geometry self-test (pure math, button in the Editor tab): 39/39 pass —
  resize there-and-back for all 8 handles at 0°, 30°, 125°, 270°; the anchored
  corner stays fixed while resizing a rotated element; rotate +90° and back;
  snapping to the canvas center.
- Undo: exactly one history entry per gesture. Verified with 10 scripted
  moves + 1 handle resize + 1 knob rotate → `undo 12`; one undo reverted only
  the rotation, the next only the resize, each to the exact previous values.
  This needed a fix to the zundo pause semantics: the first set of a gesture
  is tracked (zundo pushes the pre-gesture state), then the history is paused,
  and the final rounding set's push is reverted. `equality: deepEqual` on the
  partialized design stops selection/zoom/op-counter sets from adding
  entries (the first run showed 3 entries per gesture without it).
- Geometry is also covered by `geometry.test.ts` (Vitest, 44 cases).
- Touch: pointer events with `touch-action: none` on elements and handles.
  The scripted run used `pointerType: 'touch'` events and behaved identically,
  but that is synthetic; **verify on a real iOS device** (drag an element,
  resize with a handle, rotate with the knob, no page scroll while dragging).

## Gate 3 — model round trip and template

- Editor design (9 elements, 4.1 KB JSON) → zod parse OK → re-rendered →
  exported both at 1× PNG → pixel diff **0.000 %** of 189 000 sampled pixels.
- Hashes of the serialized JSON were initially different because zod reorders
  keys and fills defaults; `serializeDesign` now sorts keys recursively.
  Re-run: hash A == hash B, pixel diff 0.000 %.
- Template with two bound fields: editing the "Title" field re-rendered the
  text element through its dot path; switching the data source to the fixture
  and exporting produced a 2400×1260 image in ~840 ms. The saved-contest
  source goes through `useContestSnapshotQuery` → `countriesStateByStage` of
  the last stage with state; **to verify with a real contest id** (must be
  the logged-in user's or public).

## Gate 4 — bundle

The route follows the Palette Lab pattern: the dynamic import sits in a
`process.env.NODE_ENV === 'development'` branch, so production builds compile
it out and `/dev/graphics-poc` 404s. `@zumer/snapdom` and `html-to-image` are
dynamically imported inside the export function only.

Build check (`yarn build`, 2026-10-04): compiled successfully; `/dev/graphics-poc`
is listed as a dynamic route like `/dev/palette-lab` (it renders `notFound()`
in production). No PoC strings (`Graphics studio · PoC`, `data-design-node`)
and no `snapdom` code appear anywhere under `.next/server` or `.next/static`,
so the PoC and its dependency are compiled out of the production bundle.

## Verdict so far

Chrome passes every gate. The architecture decision in the plan (DOM editor,
DOM export, hand-rolled transforms) holds on the evidence gathered; the open
items are browser coverage (Safari/iOS/Android/Firefox), phone export time,
and touch gestures, all of which need a real device run of the same page.
snapdom is the preferred export engine on speed; keep html-to-image behind the
same `exportNode` seam as the fallback until Safari numbers are in.
