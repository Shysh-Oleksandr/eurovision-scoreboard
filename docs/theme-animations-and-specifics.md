## Theme animations & specifics overview

This document summarizes the logic implemented around board animations, Douze Points animations, points count-up, and theme-specific configuration. Use this as a reference when extending or debugging the system.

---

### 1. ThemeSpecifics model

Shared type in `src/theme/types.ts`:

- `ThemeSpecifics`:
  - `flagShape: FlagShape`
  - `pointsContainerShape: PointsContainerShape`
  - `boardAnimationMode: 'flip' | 'teleport'`
  - `douzePointsAnimationMode: 'parallelograms' | 'heartsGrid' | 'year2022' | 'year2023' | 'year2024' | 'year2026'` (the year modes are spec-driven, §10)
  - `uppercaseEntryName: boolean`
  - `juryActivePointsUnderline: boolean`
  - `isJuryPointsPanelRounded: boolean`
  - `usePointsCountUpAnimation: boolean`
  - `roundedCountryContainer: boolean` — pill country row, points track, panel glow (see [rounded-country-layout-and-2026-theme.md](./rounded-country-layout-and-2026-theme.md))
  - `fontAlias?: string` — interface font (e.g. Gotham on 2026)
  - `scoreboardFontAlias?: string` — built-in font for scoreboard surfaces only; absent means "same as `fontAlias`" (custom uploaded fonts live on the theme as `fontId` / `scoreboardFontId`, see [custom-fonts-and-font-library.md](./custom-fonts-and-font-library.md))

`Theme` now has:

- `themeSpecifics?: Partial<ThemeSpecifics>`

**Global defaults** (`DEFAULT_THEME_SPECIFICS` in `src/theme/themeSpecifics.ts`):

- `flagShape: 'big-rectangle'`
- `pointsContainerShape: 'triangle'`
- `boardAnimationMode: 'teleport'`
- `douzePointsAnimationMode: 'heartsGrid'`
- `uppercaseEntryName: true`
- `juryActivePointsUnderline: true`
- `isJuryPointsPanelRounded: false`
- `usePointsCountUpAnimation: true`
- `roundedCountryContainer: false`

**Rounded pill layout (2026+):** See [rounded-country-layout-and-2026-theme.md](./rounded-country-layout-and-2026-theme.md) for country row structure, points section breakpoints, televote glow, side panels, qualification UI, and a year-cloning checklist.

---

### 2. Resolving theme specifics

All consumers should rely on the resolver functions in `src/theme/themeSpecifics.ts` instead of reading raw fields directly.

#### 2.1. Sanitization

`sanitizeThemeSpecifics`:

- Takes `Partial<ThemeSpecifics> | null | undefined`
- Filters out invalid values:
  - Only accepts known union members for `boardAnimationMode` and `douzePointsAnimationMode`
  - Only keeps booleans for boolean fields
  - Omits fields entirely instead of setting them to `undefined`
- This is important so that spreading sanitized objects does **not overwrite defaults** with `undefined`.

#### 2.2. Main resolver

`resolveThemeSpecifics(defaultThemeSpecifics, customTheme)`:

Merge order:

1. `DEFAULT_THEME_SPECIFICS`
2. `sanitizeThemeSpecifics(defaultThemeSpecifics)`  
   (from base theme `theme.themeSpecifics`)
3. `sanitizeThemeSpecifics(mapLegacyCustomThemeSpecifics(customTheme))`  
   (legacy top-level fields on `CustomTheme`)
4. `sanitizeThemeSpecifics(customTheme?.themeSpecifics)`  
   (nested overrides on the custom theme)

This gives a final `ThemeSpecifics` instance with all defaults and overrides applied.

#### 2.3. Convenience resolvers

- `resolveThemeSpecificsForGeneralState({ themeYear, customTheme })`
  - Used by `useThemeSpecifics()` and runtime logic.
- `resolveThemeSpecificsForCustomTheme(customTheme)`
  - Used in theme previews (`ThemeListItem`, `CustomizeThemeModal`).
- `resolveThemeSpecificsForBaseThemeYear(baseThemeYear)`
  - Used to compare against base-theme defaults when building create/update payloads.

---

### 3. Runtime consumption (useThemeSpecifics)

Hook: `src/theme/useThemeSpecifics.ts`

- Reads:
  - `themeYear` and `customTheme` from `generalStore`
- Returns:
  - `ThemeSpecifics` resolved via `resolveThemeSpecificsForGeneralState`

Key consumers:

- `CountryItem` (flag shape, points container shape, uppercase entry name)
- `ShareCountryItem`, `CountryQualificationItem` (same fields for share/qualification UIs)
- `ControlsPanel` (jury panel rounding and underline)
- `Board` (default `boardAnimationMode` selection, with a winner override to forced `flip`)
- `PointsSection` (points count-up enable/disable)
- `useDouzePointsAnimation` (board animation mode, for teleport delay)
- `useAnimatePoints` (parallelogram vs heartsGrid logic)
- `DouzePointsAnimation` (active douze points variant)
- `PresentationPanel` (presentation delay tuning based on `teleport` vs `flip`)

---

### 4. Board animation modes (flip vs teleport)

#### 4.1. Selection logic in `Board.tsx`

- `boardAnimationMode` from `useThemeSpecifics()` is the default.
- If `winnerCountry` is set **and** `isLastSimulationAnimationFinished` is `true`, board forcibly uses `'flip'` (for non-simulation browsing).
- Otherwise uses the mode from theme specifics:
  - `'flip'`: pure FLIP movement via `react-flip-toolkit`
  - `'teleport'`: GSAP-based teleport fade-in/out animation (with complex choreography and queueing, implemented in `useBoardAnimations`)

#### 4.2. Voting / teleport interplay

- Store actions in `scoreboard/votingActions.ts` determine whether to defer last-points reset and when to queue teleport updates, based on an `isTeleportBoardAnimationEnabled` helper that uses `resolveThemeSpecificsForGeneralState` to check the current `boardAnimationMode`.
- Teleport sequence:
  - Out phase: staggered bottom-to-top fade-out/move with direction based on rank change.
  - In phase: reordering + staggered fade-in.
  - Non-receiving countries move with FLIP only; receiving countries run teleport.
  - Total duration is fixed; stagger auto-adjusts by item count.

---

### 5. Douze Points animations

Three variants, controlled by `ThemeSpecifics.douzePointsAnimationMode`:

- `'parallelograms'`: original overlay with moving parallelograms.
- `'heartsGrid'`: hearts grid animation (default).
- `'year2021'`: the 2021 broadcast's pop-out row, from a spec (§10), the 2021 theme's default since 2026-11-22 (with a flipping board, so the raised row flies to its place).
- `'year2022'`: the 2022 broadcast animation, played from a spec (§10). `DouzePointsAnimation` renders nothing for spec modes; `DouzeRowOverlay` plays them instead.
- `'year2023'`: the 2023 broadcast's circles and flashing words, from a spec (§10), the 2023 theme's default since 2026-11-22. The parallelograms stay as they were (JESC 2026 and custom themes use them, with their block colours).
- `'year2024'`: the 2024 broadcast's colour wipe, from a spec (§10), the 2024 theme's default.
- `'year2026'`: the 2026 broadcast's gold sweep, from a spec (§10), the 2026 theme's default.

#### 5.1. Selection and rendering

Component: `src/components/countryItem/DouzePointsAnimation.tsx`

- Reads `douzePointsAnimationMode` from `useThemeSpecifics()` unless a `douzePointsAnimationModeOverride` prop is provided (used in theme previews).
- Normalizes the mode:
  - If resolved mode is not a known key, falls back to `DEFAULT_THEME_SPECIFICS.douzePointsAnimationMode` (currently `'heartsGrid'`).
- Variant map:
  - `parallelograms` → `LegacyParallelogramsAnimation`
  - `heartsGrid` → `HeartsGridAnimation`
- Container positioning:
  - heartsGrid mirrors the row's own layout instead of hard-coded offsets: the caller passes its `flagClassName` (from `useFlagClassName`), its `nameClassName` and a ref to its name `<h4>`. The overlay renders an invisible flag-sized spacer (so the hearts start exactly at the flag's right edge), then the name with the same classes, and copies the row name's width (so truncation matches in the rounded layout, where the overlay also spans the points). The overlay name therefore sits pixel-on-pixel over the row's name for every flag shape, breakpoint, two-column layout and theme preview. Don't reintroduce per-shape offsets: they drifted out of sync with `useFlagClassName`, and the preview read `roundedCountryContainer` from the active theme instead of the previewed one.
- Trigger condition:
  - In normal runtime:
    - Only renders if the `pointsSystem` entry has `showDouzePoints` and `value === pointsAmount`.
  - In theme preview (`isThemePreview`):
    - Always treats the click as Douze Points (bypassing pointsSystem gating).

Hearts grid details:

- Uses `ResizeObserver` to set number of columns (`min=8`, `max=20`) based on overlay width.
- Renders 5 rows (3 visible, 1 above, 1 below) for full fill effect.
- Grows columns right-to-left, then shrinks left-to-right, with:
  - `HEARTS_GROW_COLUMN_DURATION_SECONDS`
  - `HEARTS_SHRINK_COLUMN_DURATION_SECONDS`
  - `HEARTS_GROW_STAGGER_SPAN_SECONDS`
  - `HEARTS_SHRINK_STAGGER_SPAN_SECONDS`
  - `HEARTS_REVERSE_DELAY_SECONDS`
- Uses `HeartIcon` with `fill-countryItem-douzePointsBg` by default or a solid color derived from `countryItem.douzePointsBg` via `extractSolidColorFromColorValue` and `toOpaqueColorValue`.
- Country name:
  - Fades in early in the timeline, fades out around shrink phase start, uses `text-countryItem-douzePointsText` and different font size for preview vs full scoreboard.

#### 5.2. Legacy parallelogram logic and hearts

`useAnimatePoints` (in `src/hooks/useAnimatePoints.ts`):

- Responsible for:
  - Douze Points **parallelogram** animation timeline (old variant).
  - Last-points slide-in/out animation.
- For Douze Points:
  - Now gated by `douzePointsAnimationMode`:
    - If mode is **not** `'parallelograms'`, it returns early (no parallelogram animation).
  - In theme preview:
    - Uses `douzePointsAnimationModeOverride` to force the decision for the compact preview UI.

---

### 6. Douze Points animation hook (`useDouzePointsAnimation`)

File: `src/components/countryItem/hooks/useDouzePointsAnimation.ts`

Purpose:

- Controls when to render the Douze Points overlay for a given country.

Inputs:

- `isDouzePoints: boolean`
- `countryCode: string`
- `initialPoints: number | null`
- `ignoreBoardTeleportDelay: boolean` (preview-only path)

Runtime behavior (normal scoreboard):

- Reads from `scoreboardStore`:
  - `hideDouzePointsAnimation`
  - `isBoardTeleportAnimationRunning`
- Reads `boardAnimationMode` via `useThemeSpecifics()`.
- If `boardAnimationMode === 'teleport'` and teleport animation is running:
  - Defers Douze Points until teleport finishes.
- Once allowed:
  - Sets `shouldRender = true`, saves `animationPoints`.
  - Starts timer (`ANIMATION_DURATION`) that calls `hideDouzePointsAnimation(countryCode)` to clear the overlay.
- On non-Douze states (`isDouzePoints === false`) while `shouldRender` is true:
  - Sets a shorter timer to turn off and clear `animationPoints`: half of `ANIMATION_DURATION`, or the spec's whole duration when that is longer. When the row doesn't move, the next jury clears the 12 at once, and 1.5 s cut the longer specs short (2024's tail, 2026's exit).

Preview behavior (`ignoreBoardTeleportDelay = true`):

- Bypasses store and timers entirely:
  - `shouldRender` mirrors `isDouzePoints`.
  - `points` mirrors `initialPoints` when active.
  - No cooldown between runs; the preview can be re-triggered immediately after each animation.

This makes the preview UX responsive while keeping the main scoreboard sequence intact.

---

### 7. Points count-up animation

Component: `src/components/countryItem/PointsSection.tsx`

- Uses `countup.js` to animate changes in the main points display.
- Reads:
  - `winnerCountry` and `isLastSimulationAnimationFinished` from `scoreboardStore`.
  - `usePointsCountUpAnimation` from `useThemeSpecifics()`, with optional override prop `usePointsCountUpAnimationOverride` (used in theme preview).
- Logic:
  - `shouldDisableAnimation` is `true` if:
    - `usePointsCountUpAnimation` is `false`, or
    - `winnerCountry` exists **and** `isLastSimulationAnimationFinished` is `true`.
  - When disabled: `duration: 0` (instant updates).
  - Otherwise: `duration: 1` second.
- Handles a number of edge cases:
  - NQ label (no animation).
  - Same-value updates (skip CountUp to avoid jitter).

---

### 8. Theme previews and defaults

#### 8.1. Theme list preview (`ThemeListItem`)

File: `src/components/setup/widgets-section/custom-themes/ThemeListItem.tsx`

- Computes `cssVars` via `getCssVarsForCustomTheme(theme)`.
- Resolves animation- and shape-related specifics via:
  - `resolveThemeSpecificsForCustomTheme(theme)`
- Passes resolved values into `ThemePreviewCountryItemCompact`:
  - `uppercaseEntryName`
  - `pointsContainerShape`
  - `flagShape`
  - `isJuryPointsPanelRounded`
  - `juryActivePointsUnderline`
  - `usePointsCountUpAnimation`
  - `douzePointsAnimationMode`

This ensures preview and applied behavior match, even for old themes where fields may be missing or partially nested.

#### 8.2. CustomizeThemeModal preview

File: `src/components/setup/widgets-section/custom-themes/CustomizeThemeModal.tsx`

Key points:

- On edit:
  - Uses `resolveThemeSpecificsForCustomTheme(initialTheme)` to initialize local state for all `ThemeSpecifics` fields instead of directly using top-level fields.
- Live preview (`previewTheme`):
  - Constructed as a `CustomTheme` object with:
    - `_id: 'preview'`
    - `baseThemeYear`, `hue`, `shadeValue`, `overrides`, `backgroundImageUrl`
    - `usePointsCountUpAnimation`, `boardAnimationMode`, `douzePointsAnimationMode`
  - Applied via `applyCustomTheme(previewTheme, true)` with `data-theme="custom-preview"`.
- `ThemePreviewCountryItem` is given both:
  - Raw colors/overrides and base theme year
  - The current local state for all relevant `ThemeSpecifics` fields.

#### 8.3. Create / update payload rules

Still in `CustomizeThemeModal.tsx`, `buildThemePayload(isUpdate)`:

- Computes `defaultThemeSpecifics` via:
  - `resolveThemeSpecificsForBaseThemeYear(baseThemeYear)`

**Create (no `isUpdate`)**:

- Only includes a field if it differs from `defaultThemeSpecifics`:
  - e.g. if `boardAnimationMode !== defaultThemeSpecifics.boardAnimationMode`, then include `boardAnimationMode`.

**Update (`isUpdate === true`)**:

- For each field, checks:
  - Whether the initial theme had any custom value (either top-level or in `initialTheme.themeSpecifics`).
  - Whether the current value equals or differs from `defaultThemeSpecifics`.
- If it **had custom** and is now equal to default:
  - Sends `fieldName: null` to instruct the backend to unset it.
- If it differs from default:
  - Sends `fieldName: currentValue`.
- If it had no custom value and still equals default:
  - Omits the field.

This keeps the DB representation minimal, while allowing themes to move back and forth between default and custom modes cleanly.

**Fonts** follow a slightly different rule: `fontAlias` is always sent (it doubles as the fallback stack for a custom font), while `fontId`, `scoreboardFontAlias` and `scoreboardFontId` are sent when set on create and as `null` on update when the initial theme had them. Font files themselves are never part of the theme save — they live in the font library (see [custom-fonts-and-font-library.md](./custom-fonts-and-font-library.md)).

---

### 9. Things to keep in mind when extending

- **Always go through `ThemeSpecifics` and resolvers**:
  - If you add a new visual/animation field:
    - Add it to `ThemeSpecifics`.
    - Extend `DEFAULT_THEME_SPECIFICS`.
    - Make sure `sanitizeThemeSpecifics` and resolvers handle it correctly.
    - Update payload builder in `CustomizeThemeModal` accordingly.
- **Avoid reading raw `customTheme` fields directly in UI**:
  - Prefer `useThemeSpecifics()` or `resolveThemeSpecificsForCustomTheme`.
- **Preview vs runtime**:
  - Preview often needs to bypass global store logic (timers, teleport delays) and use local state directly.
  - We use flags like `ignoreBoardTeleportDelay` and override props to achieve this:
    - `douzePointsAnimationModeOverride`
    - `usePointsCountUpAnimationOverride`
    - `isThemePreview`
- **Defaults should be consistent**:
  - The same default values should be:
    - In `DEFAULT_THEME_SPECIFICS`
    - Honored by resolvers
    - Used in `CustomizeThemeModal` when deciding what to save/unset

If you follow these patterns, adding new theme-specific visual behaviors (e.g. new Douze Points styles, additional board animations, or extra decorations) will integrate cleanly with both custom themes and default themes.


---

### 10. Spec-driven douze animations (`src/douze/`)

Year animations recreated from broadcast footage are data, not components: a `DouzeAnimationSpec` (`model.ts`) is a list of layers placed against the row's parts, each with keyframes on one shared clock. The format is meant to be what a remix form, and later an editor, edits. The first one is `specs/year2022.ts` (the 2022 theme's default); `specs/year2026.ts` (the 2026 theme's) is the second: a gold sweep over the name strip and on into the 12 box (the total on square rows), a hold, and the same sweep back. `specs/year2024.ts` (the 2024 theme's) is one `rect`: a gradient band 3.3 row widths long (yellow, magenta, yellow, with soft ends, the colour changes blended in linear light through `color-mix(in srgb-linear, …)` stops) that slides through the whole row with a constant deceleration, plus a `text` caption. `specs/year2023.ts` (the 2023 theme's) grows three circles (magenta, blue, yellow) out of the row's bottom-left corner, each a `rect` with `radius: 50%` sized in row widths across and row heights down (a circle on the broadcast's row) whose `scale` and `y` keyframes are generated every 20 ms from one fitted curve (the centre rises as it grows, so the front straightens into the 2023 slant); the yellow stays with "12 POINTS" on it (`revealX` from the same curve), then giant words ("12 POINTS" and the country's name, `text` layers with `size` and `align`) cut in and out on broadcast frames (`steps(1, end)` opacity), over the yellow and, once it cuts away, over the row. `specs/year2021.ts` (the 2021 theme's) moves the row itself: a `part` layer zooms it toward the camera about a point far below and right of it (transform-origin `170% 460%`, fitted on the broadcast's pop) and settles it a quarter of a row height up and to the left, and a `slabSides` canvas draws the slab's sides between where the row rests and where it is, in the flag's first two colours; the board flies it to its place while raised (`moveAtMs`) and it lands.

**Anchors.** Layers are placed against `data-douze-anchor` parts: `row` (the main container in `CountryItemBase`), `strip` (its content div: the flag and name's background; on rounded rows a strip whose round end lies over the total, on square rows the whole row under the points), `flag`, `name` (`CountryItem`, `ThemePreviewCountryItemUI`), `lastPoints` and `total` (`PointsSection`, both layouts). Boxes are shares of the anchor's box plus lengths in row heights (`…Rh`), so one spec fits every breakpoint, the two-column board and the zoomed column layout. Anchors are measured to the fraction of a pixel (`rectWithin` in `anchors.ts`): on screen with the browser's own `getBoundingClientRect` (the column layout patches the rows' own to divide by the zoom, for FLIP: see simulation-column-layout.md), divided by the board's CSS zoom (`currentCSSZoom`), and without the translations of the part and its parents, so a part mid-entrance counts where it comes to rest. Layout offsets round every step to whole pixels, which put copies laid over the row (the 2026 name over the gold) a pixel or two off on small screens. Keep these attributes on any new row variant that should play spec animations.

**Keyframes.** Each property is its own track: a keyframe that leaves a property out gets it interpolated in time between the nearest keyframes that set it, and before the first / after the last it holds (`fillKeyframes`). So give every layer an explicit `opacity` where it should start hidden, or it holds its first defined value back to t = 0. `x` is a move in row widths or a placement against a part (`{ on, at, align, offset, offsetRh }`: the layer's `align` edge on the part's `at` edge, plus row widths and row heights; the 2026 round edge rests 0.6 row heights past the row's end, so its corners clear the row's on narrow phone rows too). Placements are resolved to distances first, so one track can mix them with numbers and still interpolate. Example: the 2022 beam's path ends "tip on the 12 box", wherever the theme puts it.

**Layers.**
- `rect`: a CSS background and shadow.
- `effect`: SVG generated at the layer's size in `effects.ts` (torn bar, arc, ring, star, rays, strands, spear-shaped beam, cross lines). Seeded, so deterministic.
- `clone`: a copy of a row part taken at the start. `hideSource` hides the real part until the end, which is how the 2022 12 box slides in. `glitch` tears it with an SVG displacement filter.
- `text`: a line of text centred in its box, set in the type of a row part (`font`: its computed face, size, weight, spacing and case, `typeStyleOf` in `anchors.ts`), so it reads as part of the row on any theme and custom font. `text: 'points'` is the points just given in the app's language ("12 points", `simulation.douzePoints`), which `DouzeRowOverlay` passes to the player as `pointsLabel` (the lab passes "12 points"); without it the layer isn't drawn. The 2024 "12 POINTS" rises from under the row and rides out ahead of the band's tail. `text: 'name'` is the country's name as the row shows it (`shownTextOf` the name part: a phone row's short code, not its screen-reader copy); a row without one doesn't draw it. `size` sets the font size in row heights instead of the part's (letter and word spacing scale with it, `resizeType`), and `align` (`left` / `centre` / `right`) places the line in its box, so a word too long for the row overflows to one side and `clipTo` cuts it: the 2023 words two to three row heights tall.
- `part`: moves one of the row's real parts (`part: 'row'`), not a copy: its keyframes' transform and opacity play on the part itself (a Web Animation on the element, with the layer's `origin` as its transform-origin), so everything in it stays live: the app's own 12 box entrance, the total's count-up, the name. Its `box` is the part's own; clips, cuts and filters don't apply. The animation is cancelled when the run ends or is torn down, so the part is as it was. The player cancels its own part animations before measuring the row again (a flag loading mid-run re-measures, and the lifted row would count as the row's place). 2021 lifts the whole row.
- `canvas`: drawn every frame by a painter in `painters.ts` from the shared clock, for effects whose shape changes over time. `waveFlow` is the 2022 mesh: a lattice of waves flowing right at a set speed, pinched through a point that rides the beam and then sits on the 12 box. Its `pinch` and window come from keyframes (linear), and lines are erased softly around the pinch so they vanish into whatever white covers it. It is drawn at the zoomed size in the column layout. `slabSides` and `slabLines` follow a `part` layer (`follow`: its id): the painter samples that layer's keyframes as its Web Animation plays them (`transformSampler` in `timeline.ts`: each keyframe's CSS ease, `easingFunction`, and placements resolved up front; 2021's are generated every 20 ms and linear) and draws between the part's resting box (the slab's back) and its transformed box (the face). The sides are convex hulls of the two boxes' outline parts a lift up and to the left uncovers (`slabChains`: the right edge from the top-right corner's middle, the bottom edge to the bottom-left corner's middle, corner arcs included, so a pill row is a pill-shaped slab): the whole region in `colors[0]` (the bottom side), the right side over it in `colors[1]`, then the face is erased from the canvas (`destination-out`), so the sides never cover the row. `slabLines` draws thin lines across the bottom side at shares of the face's width with a slant, in `colors[0]` turned lighter on a dark side and darker on a light one (`slabLineColor`, the broadcast's).

**Layer options.**
- `layout: 'rounded' | 'square'` draws a layer only on rows of that layout (the row's `data-douze-layout`, from `CountryItemBase`'s `useInlineContentLayout`). The two stack their parts differently: on pill rows the strip lies over the total and the 12 box, on square rows the 12 box sits between the strip and the total, over the strip. 2026 gilds the 12 box on pill rows and the total on square ones, where a gold 12 box would run into the gold strip.
- `clipTo: 'row'` clips a layer to the row in its shape: the clip wrapper takes the row's computed `border-radius`, so on rounded themes (the 2026 pill rows) nothing shows square corners past the pill's ends. Everything that sits inside the row is clipped: flag glitch copies, sweeps, waves, spear, wash, flash. Only soft glows (bloom, star, rays, spear glow) reach outside it. A `rect` with `radius: 'anchor'` takes its anchor's radius, so the halo is a pill on pill rows. A layer clipped to another part (2026: the strip) is clipped by the row too, as the row clips its content: the strip's left end is the pill's round end, which shows round flags and small rectangles leave uncovered.
- With `clipTo`, `windowLeft` / `windowRight` keyframes animate a clip window that stays put while the layer moves through it. The 2022 waves flow under an edge that sweeps after them.
- `revealX` keyframes reveal a layer up to an edge that is a position in the row (row widths or a placement, like `pinch`), not a share of the layer. The clip is set in the row's frame (its full height, from its left edge), so layers on the same track are cut along one line whatever their boxes: the 2026 gold and the copy of the name over it. `revealEdge: 'round'` gives the edge a half circle the row's height across (the 2026 strip's end). Insets aren't clamped, so the edge stays in step on every layer.
- `clipPath` is a static CSS clip-path (layers with `reveal` / `revealX` animate their own). The 2026 halo cuts a notch on its left at the row's height, so its shadow doesn't lighten the 12 box's left part.
- `filter` is a static CSS filter. `brightness(0) invert(1)` on a clone gives a white silhouette in the part's own shape.
- `paint` on a clone repaints the copy: `fill` its background and its SVG shapes, `text` all its text (`paintCopy`, set as important, so a custom theme's transparent points, `!bg-transparent`, still turn gold instead of leaving ink text on the page). The 2026 12 box (or total) is a gold copy over the real one, and the name over the gold takes `--douze-ink`. Copies keep their part's text while they play (`mirrorText`): a total copied at the award is still counting up. A copy takes its part's computed font size and line height, and a copied name carries `data-douze-name`, so host rules that restyle the board's names (`[data-entry-name]`: the phone's two-line names and short codes in styles.css) style it too; without them the 2026 name sat lower than the row's on two-column phone boards. Where a layer meets an opaque part edge to edge, draw the part again over it rather than cutting it out: a cut leaves a light seam (2026 draws the flag over its gold).
- `cutBy` (with `clipTo`) cuts out of the layer whatever those row parts draw over the copied part (`buildCutMask`: each part's own box, with its corner radii, plus the filled shapes of its SVGs). A part's box is cut whatever its background: a custom theme's transparent points still hold their text, which a layer passing under them must not hide, so the row's own colour shows there instead (square rows with transparent points keep the 12 box in the row's colour under the 2026 gold). Reading the background colour to decide went wrong: `rgb(128, 0, 0)` parsed as clear, so a dark red or yellow total lost its curved edge over the 12 box copies. Only parts that paint over the copied part (a clone's source, else the `clipTo` part) count, by paint order (`drawsOver` in `anchors.ts`: z-index levels under the closest common ancestor, then tree order). One spec fits both layouts that way: on rounded rows the strip lies over the total and the 12 box, on square rows the total and the box lie over the strip. Covers are measured on screen at the start, without their own translation, so a part mid-entrance (the 12 box's GSAP slide) is cut where it comes to rest. The mask is measured on screen, divided by the board's zoom, and set on the static clip wrapper. Without it the 2022 12 box copies come out square: on the board the total's curved edge (its `RoundedTriangle`) covers the box's right end. With it, the box slides out from under the total and the white flash keeps both curved edges, whatever box shape the theme uses.
- `blend` sets mix-blend-mode.
- `heavy` layers are left out on low-performance and reduced-motion devices (`useIsLowPerfDevice`).
- A spec's `raise` gives the row's whole item (the player's positioned parent) `z-index: 40` while it plays: the 2021 face reaches over the row above, and on a flipping board the raised row flies over the rows it passes (later items paint over earlier ones otherwise, and the 2026 strip is z-21).

Colours go through `var(--douze-<key>)`. With `paletteFrom: 'flag'` (the 2022 spec), `c1`, `c2`, `c3` and `glow` come from the row's flag (`flagPalette.ts`), as in the broadcast: bar = first colour, second sweep = second, ring = third, and a two-colour flag reuses the first (a spec's `twoColorFlagC3: 'second'` reuses the second instead: the 2023 blue words sit on the c1 fill and would vanish into it). With `paletteFrom: 'theme'` (a custom theme's choice, below) they come from the row's theme colours (`themePalette.ts`, read from the `--twc-countryItem-*` variables, so overrides and the editor's preview count): by default the 12 box, the douze colour and the name text; a spec's `themeColors` sets another order (2026: the douze colour first, so the gold is the theme's douze colour; 2023: the douze colour, its text colour and the parallelograms' first block, the 2023 theme's yellow, magenta and blue). The douze ones among them (`douzePointsBg`, `douzePointsText`, `douzePointsBlock1`) are edited in "Customize animation" while theme colours are chosen. Either way `paletteFromColors` fills the keys and lifts very dark colours, and the spec's fixed `palette` is the fallback. It also derives keys from c1: `glow` (a pale tint), `sheen` and `shade` (a richer lighter and darker band, for a metallic fill; greys stay grey) and `ink` (black or white, whichever contrasts more: text on a c1 fill). The 2026 spec uses only these: one colour and what's mixed from it.
- The flag image on the row is sampled at 96×64. Blends on stripe edges are dropped, and saturated colours count from 3 % of the flag (Korea's red and blue), whites and greys from 7 %.
- Order: colours in reading order (top to bottom, then left to right), then neutrals, lightest first. So Serbia is red, blue, white, and Germany is red, gold, then black.
- Very dark colours are lifted (below a relative luminance of 0.12, or the spec's `liftBelow`: 2021 keeps the flags' own blues, as the broadcast's sides are, and lifts only near-black below 0.03). Results are cached per image.
- A flag the canvas can't read (another origin without CORS) keeps the spec's `palette`, and a flag still loading is read once it loads. That covers most custom entries' flags: presets and uploads come from the CDN, links from anywhere, and in the apps even country flags are absolute URLs.
- **A custom entry's own colours** (`BaseCountry.colors`, 1–3 `#rrggbb`, main first; `src/data/countries/entryColors.ts`) take the flag's place wherever its colours are read: `CountryItem` looks them up by code in `customCountries` (`useEntryColors`: line-up and stage copies made before an edit don't carry them) and passes `entryColors` to `DouzeRowOverlay` → `DouzeSpecPlayer` (used instead of sampling the flag when `paletteFrom` is `'flag'`) and to `DouzePointsAnimation` → `useRowFlagColors` (the hearts' bands and the parallelograms' blocks). They go through `paletteFromColors` like a flag's, so very dark ones are lifted too. The winner confetti's Flag colours use them as they are (`useConfettiColors`). They're picked in the custom entry editor (`EntryColorsField`: "From the flag" stores nothing; "Custom" starts from the colours read from the chosen flag, via the website's image proxy or the CDN's CORS, `loadFlagImageColors`), saved with the entry (backend `custom-entries/dto/entry-colors.ts`) and in contests' `customEntriesUsed`, so shared contests play with them.

**Player.** `DouzeSpecPlayer` renders an empty layer at the top-left of its positioned parent, next to the row rather than inside it: the row container clips, and the rays and halo reach past it. Every layer runs one Web Animation over the whole duration (`timeline.ts`). Canvas painters read that animation's `currentTime` on each frame. So `heldAtMs` freezes everything at any moment. Only transform, opacity and clip-path animate. Copies of row parts drop GSAP's in-flight inline styles (`cloneRowPart`), or the 12's label would be copied at opacity 0.

**Motion.** Broadcast animations of this kind never stop moving until they end. In the 2022 one, the waves keep flowing right and drain into the 12 box while their trailing edge sweeps after them, and the wash arrives from the left. Holding a layer in place and fading it out reads as a slow-down. When rebuilding a year, check the second half in the lab at 50 ms steps (strip step, from, to).

**Every 12 plays.** `useDouzePointsAnimation` returns a `runId` that grows with each new 12, and `CountryItem` / `ThemePreviewCountryItemUI` key the overlay (and the hearts) by it. A new 12 is the flag going up, or the country's total changing while the flag is still up: a whole jury vote given at once can set the flag again before it was cleared. Without the key, a country given 12 again before its previous overlay unmounted kept the finished one and showed nothing.

**Board timing.** A spec with `reorder: 'after'` (2022, 2024) plays where the row is and the row climbs afterwards: `useDouzePointsAnimation` doesn't wait for the teleport, and `useBoardAnimations` waits `getDouzeMoveDelayMs` (duration + 150 ms) instead of 1000 ms before moving. A spec with `reorder: 'before'` (2026) keeps the board's own order, as the hearts do: on a teleporting board (the default, and the 2026 theme) the row teleports 1 s after the 12 and the animation plays at its new place once the teleport ends; on a flipping board it plays at once and the row flips 1 s in, under it (the overlay is in the item's root, so it moves with the row). So a `before` spec holds its middle long enough for a flip (2026: the gold holds until about 2 s). A `before` spec's `moveAtMs` sets when a flipping board moves instead of 1 s (`getDouzeMoveDelayMs(mode, options, boardAnimationMode)`; Board passes its mode, and speed rescales it like the keyframes): the 2021 row lifts, holds, and the flip (about 500 ms) starts at 1.7 s, as the broadcast's move, so it lands at its new place at 2.3 s and the spec's landing plays there. A teleporting board keeps its 1 s and plays the whole animation at the new place. The overlay stays mounted until the spec has played out even when the 12 is cleared sooner (`useDouzePointsAnimation`, §6). Sound and the `douzeBloom` haptic fire when `DouzeRowOverlay` mounts.

**Custom themes.** Any custom theme can pick a spec mode: the editor lists every mode in `DOUZE_POINTS_ANIMATION_MODES` ("Sound waves (ESC 2022)" next to the hearts and parallelograms), and the backend accepts it (`THEME_DOUZE_POINTS_ANIMATION_MODES` in `douze-points-backend/src/themes/theme-douze-modes.ts`, kept in sync with `DOUZE_POINTS_ANIMATION_MODES`). The douze colours (background, text, the parallelograms' blocks) are edited with the animation, in "Customize animation" below, not in the Colors step. A theme saved with a mode an older app bundle doesn't know falls back to the hearts there (`sanitizeThemeSpecifics` drops unknown modes). Adding a mode means adding it in both lists, and deploying the backend first.

**Customize animation (`options.ts`).** A custom theme can change its douze animation, whichever of the three it uses: the editor's Visuals tab shows "Customize animation" under the animation select (`DouzeOptionsSection`). The choices are a small diff over an animation built by hand, so every combination still looks finished. What each animation offers is its `DouzeOptionsSupport` (`getDouzeOptionsSupport(mode)` in `registry.ts`): a spec's comes from its `parts`, `paletteFrom` and tagged layers, the hand-written hearts' and parallelograms' from a small table there.
- **Colors:** the animation's own first (2022: flag colours; 2026: the broadcast gold, "Original"; hearts and parallelograms: the theme's douze colours), then the others it offers. The custom swatches are as many as the spec's layers use (`customColors` in the support: the highest `c1`–`c3` referenced; 2026 has one), and the "come from the Colors step" hint shows only when the theme colours used include the 12 box or the name colour (`themeColorsHint`). The theme's douze colours are edited right there (`themeColors` in the support: `countryItem.douzePoints*` overrides, shown while they're in use: not the hearts' or blocks' colour once flag colours replace it, not a colour whose part is off, and for a spec only its douze ones, with theme colours chosen: the douze colour for 2022, 2024 and 2026, also the text and block 1 colours for 2023). Every colour in the section, overrides and custom colours alike, uses the Colors step's picker (`ColorOverridePicker`: a popover on desktop, `ColorEditorPanel` in the section's place on phones); options store custom and veil colours as `#rrggbb`. 2022 also offers theme colours and three custom colours (glow is a tint of the first, and picked colours are not lifted). Hearts and parallelograms offer flag colours: the row's flag read with `useRowFlagColors`, the hearts in bands across the row in the flag's reading order, the parallelograms' two sweeping blocks in its first two colours.
- **Speed:** a slider from 0.5× to 2× (steps of 0.05). On a spec it rescales every keyframe, the duration and the painters' flow speed, so the player, the board's move delay (`getDouzeMoveDelayMs(mode, options)`) and the lab follow the returned spec. The hearts' CSS times and the parallelograms' GSAP tweens are multiplied by `douzeDurationScale(options)` (1 / speed). So are the overlay's timers in `useDouzePointsAnimation` and the editor preview's, and a presentation that pauses after animated points pauses that much longer when the animation is slower.
- **Parts:** a spec's layers carry a `group`, and the spec lists them as `parts` in the editor's order. Hearts have `name` (the country name over the hearts), parallelograms `blocks` and `label` (the blocks stay mounted but hidden, since useAnimatePoints' tweens need them). Labels are under `widgets.themes.visualDetails.douzeOptions.parts`. A switched-off part's layers are left out; layers without a group always play (the 2022 box slide takes over the real box).
- **Glow and veil strength** (specs with `intensity`-tagged layers): 0–100 %. They multiply the opacity of layers tagged `intensity: 'glow'` or `'wash'` (the veil's controls hide while its part is off). The spec's peaks are already at full opacity, so there is no "more".
- **Veil colour** (a spec whose palette has `veil` and whose veil fills use `var(--douze-veil)`): the 2022 white wash in any colour.
- **Hearts over the flag** (`coverFlag`, hearts only, off by default): the hearts start at the flag's edge because the overlay lays out an invisible copy of the flag first. With the option on, that copy moves inside the hearts' box, so the hearts span the whole row (the row clips them) and the overlay name stays on the row's name. The parallelograms already span the row.

They're stored on the theme as `douzeOptions` (`{ colors?, custom?, speed?, off?, glow?, wash?, veil?, coverFlag? }`, defaults left out, null when everything is a default). `sanitizeDouzeOptions` (frontend) and `normalizeDouzeOptions` (backend, `theme-douze-options.ts`) keep the same rules: unknown keys dropped, numbers clamped, part ids only checked for shape, so new animations and parts need no backend change. The editor keeps whatever was chosen while switching animations, but saves and plays only what the chosen one offers (`restrictDouzeOptions`); the hand-written animations read the theme's options through `useThemeSpecifics` (the editor preview passes its own as overrides). `getDouzeSpec(mode, options)` applies them to a spec (`withDouzeOptions`, memoised per spec and options). Every change replays the 12 on the preview (350 ms after the last change), once: `DouzeRowOverlay` plays the spec it was mounted with, so the preview's overlay, which stays mounted a few seconds after its run, doesn't restart the moment the options change (it did, then played again with the replay). They count as content in both fingerprints (only when set, so older themes keep theirs) and as real customization for remix linking. Older app bundles ignore the field and play the animation as built. The lab has the same controls.

**Dev lab.** `/dev/douze-lab` (dev builds only) plays a spec on a themed preview row, holds it at any moment (slider, ±1 frame), lays out a strip of held frames and plays a local reference video next to it at the same time. Its pickers try a custom theme's look over the base theme's: flag shape, pill or square rows, the points' shape (triangle, square, transparent) and the total's colour. `scripts/douze-frames.mjs` cuts the matching frames out of a clip (`ref`) and puts each strip frame next to its reference (`compare`, from a full-page screenshot and the rows' `data-lab-t` boxes).

**Adding an animation.** Follow the `add-douze-animation` skill (`.claude/skills/add-douze-animation/SKILL.md`): footage, frame reading, a breakdown with the owner's answers, the spec, lab comparison, the board, then shipping (labels, the year's `themeSpecifics`, the backend list). `registry.test.ts` checks every registered spec: id and mode, keyframes inside the duration, colours defined, windows and cuts clipped, `parts` matching the layers' groups, and labels (modes and parts) in every language. The editor's list is `DOUZE_POINTS_ANIMATION_MODES`, in its order: by the year of the show each animation recreates (the year in its label; `registry.test.ts` checks it), so a new one goes in at its year.
