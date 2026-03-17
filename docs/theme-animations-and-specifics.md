## Theme animations & specifics overview

This document summarizes the logic implemented around board animations, Douze Points animations, points count-up, and theme-specific configuration. Use this as a reference when extending or debugging the system.

---

### 1. ThemeSpecifics model

Shared type in `src/theme/types.ts`:

- `ThemeSpecifics`:
  - `flagShape: FlagShape`
  - `pointsContainerShape: PointsContainerShape`
  - `boardAnimationMode: 'flip' | 'teleport'`
  - `douzePointsAnimationMode: 'parallelograms' | 'heartsGrid'`
  - `uppercaseEntryName: boolean`
  - `juryActivePointsUnderline: boolean`
  - `isJuryPointsPanelRounded: boolean`
  - `usePointsCountUpAnimation: boolean`

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

Two variants, controlled by `ThemeSpecifics.douzePointsAnimationMode`:

- `'parallelograms'`: original overlay with moving parallelograms.
- `'heartsGrid'`: hearts grid animation (default).

#### 5.1. Selection and rendering

Component: `src/components/countryItem/DouzePointsAnimation.tsx`

- Reads `douzePointsAnimationMode` from `useThemeSpecifics()` unless a `douzePointsAnimationModeOverride` prop is provided (used in theme previews).
- Normalizes the mode:
  - If resolved mode is not a known key, falls back to `DEFAULT_THEME_SPECIFICS.douzePointsAnimationMode` (currently `'heartsGrid'`).
- Variant map:
  - `parallelograms` → `LegacyParallelogramsAnimation`
  - `heartsGrid` → `HeartsGridAnimation`
- Container positioning:
  - Uses `getFlagOverlayOffsetClassName(flagShape)` for left offset when heartsGrid is active, to avoid covering the flag.
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

