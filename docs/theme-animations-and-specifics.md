## Theme animations & specifics overview

This document summarizes the logic implemented around board animations, Douze Points animations, points count-up, and theme-specific configuration. Use this as a reference when extending or debugging the system.

---

### 1. ThemeSpecifics model

Shared type in `src/theme/types.ts`:

- `ThemeSpecifics`:
  - `flagShape: FlagShape`
  - `pointsContainerShape: PointsContainerShape`
  - `boardAnimationMode: 'flip' | 'teleport'`
  - `douzePointsAnimationMode: 'parallelograms' | 'heartsGrid' | 'year2022'` (`year2022` is spec-driven, §10)
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
- `'year2022'`: the 2022 broadcast animation, played from a spec (§10). `DouzePointsAnimation` renders nothing for spec modes; `DouzeRowOverlay` plays them instead.

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
  - Sets a shorter timer to turn off and clear `animationPoints`.

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

Year animations recreated from broadcast footage are data, not components: a `DouzeAnimationSpec` (`model.ts`) is a list of layers placed against the row's parts, each with keyframes on one shared clock. The format is meant to be what a remix form, and later an editor, edits. The first one is `specs/year2022.ts` (the 2022 theme's default).

**Anchors.** Layers are placed against `data-douze-anchor` parts: `row` (the main container in `CountryItemBase`), `flag`, `name` (`CountryItem`, `ThemePreviewCountryItemUI`), `lastPoints` and `total` (`PointsSection`, both layouts). Boxes are shares of the anchor's box plus lengths in row heights (`…Rh`), so one spec fits every breakpoint, the two-column board and the zoomed column layout. Anchors are measured with layout offsets (`anchors.ts`), which ignore transforms and the board's CSS zoom. Keep these attributes on any new row variant that should play spec animations.

**Keyframes.** Each property is its own track: a keyframe that leaves a property out gets it interpolated in time between the nearest keyframes that set it, and before the first / after the last it holds (`fillKeyframes`). So give every layer an explicit `opacity` where it should start hidden, or it holds its first defined value back to t = 0. `x` is a move in row widths or a placement against a part (`{ on, at, align, offset }`: the layer's `align` edge on the part's `at` edge, plus row widths). Placements are resolved to distances first, so one track can mix them with numbers and still interpolate. Example: the 2022 beam's path ends "tip on the 12 box", wherever the theme puts it.

**Layers.**
- `rect`: a CSS background and shadow.
- `effect`: SVG generated at the layer's size in `effects.ts` (torn bar, arc, ring, star, rays, strands, spear-shaped beam, cross lines). Seeded, so deterministic.
- `clone`: a copy of a row part taken at the start. `hideSource` hides the real part until the end, which is how the 2022 12 box slides in. `glitch` tears it with an SVG displacement filter.
- `canvas`: drawn every frame by a painter in `painters.ts` from the shared clock, for effects whose shape changes over time. `waveFlow` is the 2022 mesh: a lattice of waves flowing right at a set speed, pinched through a point that rides the beam and then sits on the 12 box. Its `pinch` and window come from keyframes (linear), and lines are erased softly around the pinch so they vanish into whatever white covers it. It is drawn at the zoomed size in the column layout.

**Layer options.**
- `clipTo: 'row'` clips a layer to the row in its shape: the clip wrapper takes the row's computed `border-radius`, so on rounded themes (the 2026 pill rows) nothing shows square corners past the pill's ends. Everything that sits inside the row is clipped: flag glitch copies, sweeps, waves, spear, wash, flash. Only soft glows (bloom, star, rays, spear glow) reach outside it. A `rect` with `radius: 'anchor'` takes its anchor's radius, so the halo is a pill on pill rows.
- With `clipTo`, `windowLeft` / `windowRight` keyframes animate a clip window that stays put while the layer moves through it. The 2022 waves flow under an edge that sweeps after them.
- `filter` is a static CSS filter. `brightness(0) invert(1)` on a clone gives a white silhouette in the part's own shape.
- `cutBy` (with `clipTo`) cuts out of the layer whatever those row parts draw over the copied part (`buildCutMask`: each part's own box when it paints a background, with its corner radii, plus the filled shapes of its SVGs). The mask is measured on screen, divided by the board's zoom, and set on the static clip wrapper. Without it the 2022 12 box copies come out square: on the board the total's curved edge (its `RoundedTriangle`) covers the box's right end. With it, the box slides out from under the total and the white flash keeps both curved edges, whatever box shape the theme uses.
- `blend` sets mix-blend-mode.
- `heavy` layers are left out on low-performance and reduced-motion devices (`useIsLowPerfDevice`).

Colours go through `var(--douze-<key>)`. With `paletteFrom: 'flag'` (the 2022 spec), `c1`, `c2`, `c3` and `glow` come from the row's flag (`flagPalette.ts`), as in the broadcast: bar = first colour, second sweep = second, ring = third, and a two-colour flag reuses the first. With `paletteFrom: 'theme'` (a custom theme's choice, below) they come from the row's theme colours (`themePalette.ts`: the 12 box, the douze colour and the name text, read from the `--twc-countryItem-*` variables, so overrides and the editor's preview count). Either way `paletteFromColors` fills the keys and lifts very dark colours, and the spec's fixed `palette` is the fallback.
- The flag image on the row is sampled at 96×64. Blends on stripe edges are dropped, and saturated colours count from 3 % of the flag (Korea's red and blue), whites and greys from 7 %.
- Order: colours in reading order (top to bottom, then left to right), then neutrals, lightest first. So Serbia is red, blue, white, and Germany is red, gold, then black.
- Very dark colours are lifted. Results are cached per image.
- A flag the canvas can't read (another origin without CORS) keeps the spec's `palette`, and a flag still loading is read once it loads.

**Player.** `DouzeSpecPlayer` renders an empty layer at the top-left of its positioned parent, next to the row rather than inside it: the row container clips, and the rays and halo reach past it. Every layer runs one Web Animation over the whole duration (`timeline.ts`). Canvas painters read that animation's `currentTime` on each frame. So `heldAtMs` freezes everything at any moment. Only transform, opacity and clip-path animate. Copies of row parts drop GSAP's in-flight inline styles (`cloneRowPart`), or the 12's label would be copied at opacity 0.

**Motion.** Broadcast animations of this kind never stop moving until they end. In the 2022 one, the waves keep flowing right and drain into the 12 box while their trailing edge sweeps after them, and the wash arrives from the left. Holding a layer in place and fading it out reads as a slow-down. When rebuilding a year, check the second half in the lab at 50 ms steps (strip step, from, to).

**Every 12 plays.** `useDouzePointsAnimation` returns a `runId` that grows with each new 12, and `CountryItem` / `ThemePreviewCountryItemUI` key the overlay (and the hearts) by it. A new 12 is the flag going up, or the country's total changing while the flag is still up: a whole jury vote given at once can set the flag again before it was cleared. Without the key, a country given 12 again before its previous overlay unmounted kept the finished one and showed nothing.

**Board timing.** A spec with `reorder: 'after'` plays where the row is and the row climbs afterwards: `useDouzePointsAnimation` doesn't wait for the teleport, and `useBoardAnimations` waits `getDouzeMoveDelayMs` (duration + 150 ms) instead of 1000 ms before moving. Sound and the `douzeBloom` haptic fire when `DouzeRowOverlay` mounts.

**Custom themes.** Any custom theme can pick a spec mode: the editor lists every mode in `DOUZE_POINTS_ANIMATION_MODES` ("Sound waves (ESC 2022)" next to the hearts and parallelograms), and the backend accepts it (`THEME_DOUZE_POINTS_ANIMATION_MODES` in `douze-points-backend/src/themes/theme-douze-modes.ts`, kept in sync with `DOUZE_POINTS_ANIMATION_MODES`). The douze colours (background, text, the parallelograms' blocks) are edited with the animation, in "Customize animation" below, not in the Colors step. A theme saved with a mode an older app bundle doesn't know falls back to the hearts there (`sanitizeThemeSpecifics` drops unknown modes). Adding a mode means adding it in both lists, and deploying the backend first.

**Customize animation (`options.ts`).** A custom theme can change its douze animation, whichever of the three it uses: the editor's Visuals tab shows "Customize animation" under the animation select (`DouzeOptionsSection`). The choices are a small diff over an animation built by hand, so every combination still looks finished. What each animation offers is its `DouzeOptionsSupport` (`getDouzeOptionsSupport(mode)` in `registry.ts`): a spec's comes from its `parts`, `paletteFrom` and tagged layers, the hand-written hearts' and parallelograms' from a small table there.
- **Colors:** the animation's own first (2022: flag colours; hearts and parallelograms: the theme's douze colours), then the others it offers. The theme's douze colours are edited right there (`themeColors` in the support: `countryItem.douzePoints*` overrides, shown while they're in use: not the hearts' or blocks' colour once flag colours replace it, not a colour whose part is off, and for 2022 only the douze colour, with theme colours chosen). Every colour in the section, overrides and custom colours alike, uses the Colors step's picker (`ColorOverridePicker`: a popover on desktop, `ColorEditorPanel` in the section's place on phones); options store custom and veil colours as `#rrggbb`. 2022 also offers theme colours and three custom colours (glow is a tint of the first, and picked colours are not lifted). Hearts and parallelograms offer flag colours: the row's flag read with `useRowFlagColors`, the hearts in bands across the row in the flag's reading order, the parallelograms' two sweeping blocks in its first two colours.
- **Speed:** a slider from 0.5× to 2× (steps of 0.05). On a spec it rescales every keyframe, the duration and the painters' flow speed, so the player, the board's move delay (`getDouzeMoveDelayMs(mode, options)`) and the lab follow the returned spec. The hearts' CSS times and the parallelograms' GSAP tweens are multiplied by `douzeDurationScale(options)` (1 / speed). So are the overlay's timers in `useDouzePointsAnimation` and the editor preview's, and a presentation that pauses after animated points pauses that much longer when the animation is slower.
- **Parts:** a spec's layers carry a `group`, and the spec lists them as `parts` in the editor's order. Hearts have `name` (the country name over the hearts), parallelograms `blocks` and `label` (the blocks stay mounted but hidden, since useAnimatePoints' tweens need them). Labels are under `widgets.themes.visualDetails.douzeOptions.parts`. A switched-off part's layers are left out; layers without a group always play (the 2022 box slide takes over the real box).
- **Glow and veil strength** (specs with `intensity`-tagged layers): 0–100 %. They multiply the opacity of layers tagged `intensity: 'glow'` or `'wash'` (the veil's controls hide while its part is off). The spec's peaks are already at full opacity, so there is no "more".
- **Veil colour** (a spec whose palette has `veil` and whose veil fills use `var(--douze-veil)`): the 2022 white wash in any colour.
- **Hearts over the flag** (`coverFlag`, hearts only, off by default): the hearts start at the flag's edge because the overlay lays out an invisible copy of the flag first. With the option on, that copy moves inside the hearts' box, so the hearts span the whole row (the row clips them) and the overlay name stays on the row's name. The parallelograms already span the row.

They're stored on the theme as `douzeOptions` (`{ colors?, custom?, speed?, off?, glow?, wash?, veil?, coverFlag? }`, defaults left out, null when everything is a default). `sanitizeDouzeOptions` (frontend) and `normalizeDouzeOptions` (backend, `theme-douze-options.ts`) keep the same rules: unknown keys dropped, numbers clamped, part ids only checked for shape, so new animations and parts need no backend change. The editor keeps whatever was chosen while switching animations, but saves and plays only what the chosen one offers (`restrictDouzeOptions`); the hand-written animations read the theme's options through `useThemeSpecifics` (the editor preview passes its own as overrides). `getDouzeSpec(mode, options)` applies them to a spec (`withDouzeOptions`, memoised per spec and options). Every change replays the 12 on the preview (350 ms after the last change). They count as content in both fingerprints (only when set, so older themes keep theirs) and as real customization for remix linking. Older app bundles ignore the field and play the animation as built. The lab has the same controls.

**Dev lab.** `/dev/douze-lab` (dev builds only) plays a spec on a themed preview row, holds it at any moment (slider, ±1 frame), lays out a strip of held frames and plays a local reference video next to it at the same time. `scripts/douze-frames.mjs` cuts the matching frames out of a clip (`ref`) and puts each strip frame next to its reference (`compare`, from a full-page screenshot and the rows' `data-lab-t` boxes).

**Adding an animation.** Follow the `add-douze-animation` skill (`.claude/skills/add-douze-animation/SKILL.md`): footage, frame reading, a breakdown with the owner's answers, the spec, lab comparison, the board, then shipping (labels, the year's `themeSpecifics`, the backend list). `registry.test.ts` checks every registered spec: id and mode, keyframes inside the duration, colours defined, windows and cuts clipped, `parts` matching the layers' groups, and labels (modes and parts) in every language. The editor's list is `DOUZE_POINTS_ANIMATION_MODES`, in its order.
