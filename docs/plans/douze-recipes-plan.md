# Plan: Douze recipes

> Status: **v1 built (2026-11-20) as "Customize animation"** (`douzeOptions`
> on the theme, `src/douze/options.ts`); how it works is in
> [theme-animations-and-specifics.md](../theme-animations-and-specifics.md)
> §10. Owner answers: the 2022 parts are right; custom themes only; options
> count as content for remix linking; theme colours = the 12 box, the douze
> colour and the name text. Changes from this plan: speed rescales the spec
> instead of the player's playback rate, three custom colours (glow derived)
> instead of four, and Glow/Veil go to 100 % (the spec's peaks are already
> fully opaque). Same day, owner asks: speed is a 0.5–2× slider, the veil's
> colour can change, and the hearts and parallelograms got options too
> (flag colours, speed, parts) without being ported to specs. "Later"
> below is still open. The 2026 gold sweep (`year2026`, 2026-11-20) uses
> it as built: one custom colour (`customColors`), theme colours = the
> douze colour (the spec's `themeColors`), part "Gold points" (the 12 box on pill rows, the total on square ones), glow.
> The 2023 circles and words (`year2023`, 2026-11-22) uses it as built too:
> three custom colours, theme colours = the douze colour, its text colour
> and block 1 (all three editable in the section), parts "Points text" and
> "Flashing text" (the giant words, the owner's ask), no strengths.
> The 2021 pop-out row (`year2021`, 2026-11-22) uses it as built: flag
> colours (bottom side `c1`, right side `c2`), two custom colours, theme
> colours = the douze colour and the 12 box, part "Light lines", no
> strengths; speed also rescales its `moveAtMs` (when a flipping board
> moves the raised row).

## Goal

Let anyone remix a built-in douze animation inside their custom theme and share it with the theme. Today that's the ESC 2022 one, and more are coming through the `add-douze-animation` skill.

A recipe is a few safe settings over a spec built by hand. It is not an editor:
- The spec carries the craft.
- The recipe carries the taste: colours, pace, which parts play and how strong the glow is.

Every recipe still looks finished, because it can only switch parts off and turn values within ranges that were tested.

This is the cheap first step towards user-made animations. It answers "I want the 2022 waves in my theme's colours, a bit faster, without the glitch", which is most of the demand, without a timeline editor.

## What a recipe changes (v1)

1. **Colours.**
   - **Flag**: today's behaviour and the default; each country's own colours.
   - **Theme**: the theme's douze colours (Colours → Douze points), which the editor hides for spec modes today and shows again for this source.
   - **Custom**: four swatches, `c1`, `c2`, `c3` and `glow`, with the editor's existing colour picker.
2. **Speed**: 0.8× to 1.25×, in five steps (Slower … Faster). Use the player's existing `playbackRate`. Canvas painters read the animation's own clock, so they speed up with it, and no keyframe needs rescaling. The board waits `durationMs / speed + 150`.
3. **Parts**: switch groups of layers on and off. Layers get a `group`, and the spec lists its groups with a label key. A group the spec marks as core can't be switched off. For 2022:

   | group | layers | can be turned off |
   |---|---|---|
   | box (core) | box | no: it takes over the real 12 box |
   | glitch | smear, tearA, tearB, tearC | yes |
   | sweeps | bar, trail, sweep2, ring, sweep3 | yes |
   | burst | bloom, rays, star | yes |
   | waves | waves, front, beamGlow, beam | yes |
   | flash | boxFlash | yes |
   | wash | wash, halo | yes |

4. **Intensity**: Glow and Wash, 0–150 %. Each multiplies the opacity keyframes of its tagged layers, capped at 1. Layers get `intensity?: 'glow' | 'wash'`.
   - 2022 glow: bloom, rays, star, front, beamGlow, halo.
   - 2022 wash: wash.

The Lite rule doesn't change: `heavy` layers are still dropped on low-performance devices, after the recipe has been applied.

## Data

```ts
/** Only non-default values are stored; all defaults = null. */
type DouzeRecipe = {
  v: 1;
  colors?: {
    source: 'flag' | 'theme' | 'custom';
    custom?: { c1: string; c2: string; c3: string; glow: string }; // #rrggbb
  };
  speed?: number; // 0.8–1.25
  off?: string[]; // group ids switched off; ids the spec doesn't have are ignored
  intensity?: { glow?: number; wash?: number }; // 0–1.5
};
```

- **Where it lives.** It's a theme field, `douzeRecipe`, next to `douzePointsAnimationMode`, and it applies to whichever spec mode the theme uses. Switching mode keeps the colours, speed and intensity. `off` ids the new spec doesn't have are ignored. Hand-written modes (hearts, parallelograms) ignore the recipe.
- **Frontend.** `src/douze/recipe.ts` has two pure, tested functions:
  - `sanitizeDouzeRecipe(value: unknown): DouzeRecipe | null` clamps ranges, checks hex colours, caps the size, and returns null when everything is a default.
  - `applyRecipe(spec, recipe): DouzeAnimationSpec` removes switched-off groups (never core ones), scales intensity opacities, and sets `palette` and `flagPalette` from the colour source. Speed is left to the player. Results are memoised per spec and recipe.
- **Plumbing.** Follow §9's rules for theme fields:
  - `ThemeSpecifics.douzeRecipe` defaults to null. `sanitizeThemeSpecifics` runs `sanitizeDouzeRecipe`, and the resolvers carry it for custom themes.
  - `getDouzeSpec(mode, recipe?)` and `getDouzeMoveDelayMs(mode, recipe?)` take the recipe. Their callers today are `DouzeRowOverlay`, `CountryItem`, `ThemePreviewCountryItemUI`, `ColorOverridesSection`, `DouzePointsAnimation`, `useDouzePointsAnimation` and `Board`.
  - Types to update: `src/types/customTheme.ts` and the create/update payloads in `src/api/themes.ts`.
  - The `CustomizeThemeModal` payload builder saves the recipe and unsets it when it equals the defaults.
- **Fingerprint.** Add the recipe to `themeContentFingerprint` (`src/theme/themeFingerprint.ts`) and to the backend's `theme-fingerprint.ts`. Make it canonical: sorted keys, a sorted `off` list, rounded numbers. Then a remix that only changes the recipe counts as changed and can be published.
- **Backend.**
  - The schema gets `@Prop({ type: Object })`, and the DTO gets `@IsObject() @IsOptional()` (null clears it).
  - `normalizeDouzeRecipe` in `ThemesService` works like `normalizeThemeSoundsCreate`. It keeps known keys only and clamps numbers. It accepts `/^#[0-9a-f]{6}$/i` colours and at most 16 `off` ids matching `/^[a-z][a-zA-Z0-9]{0,23}$/`, and refuses anything over 1 KB as JSON.
  - It stays generic: new specs and new groups need no backend change.
  - Tests go in a spec file next to `theme-douze-mode.dto.spec.ts`.
- **Old app bundles** don't read the field and play the plain spec (or the hearts, if they don't know the mode), so no `required` live update is needed.

## UI (Customise theme → Visuals)

- When the chosen animation has a spec, a "Customise animation" group appears under the animation select:
  - Colours: Flag / Theme / Custom, as a segmented control. Custom shows the four swatches.
  - Speed: five steps.
  - Parts: a toggle chip per group, labelled from the spec.
  - Glow and Wash sliders.
  - "Reset animation".
- **Preview.** The preview row replays the 12 about 300 ms after each change, so every change is seen in motion. The preview's +12 button stays. v1.1: a scrubber that holds the preview at a moment (`DouzeSpecPlayer`'s `heldAtMs`), for checking colours.
- **Phone first.** Keep one column with the preview visible above the controls while editing. Follow `DESIGN.md` and the Visuals tab's existing controls.
- **Strings.** Group labels and control names go under `widgets.themes.visualDetails.douzeRecipe.*`, in all 9 languages.
- **The lab** gets a recipe panel, so recipes can be tried on the strip and against footage.

## Order of work

1. **Model.** Add `group`, `groups` and `intensity` to the model, and tag the 2022 spec. `registry.test.ts` checks that every layer of a spec with groups has a known group, and that core groups exist.
2. **`recipe.ts`**, test-first:
   - sanitize: clamping, bad colours, unknown keys, defaults → null;
   - apply: groups removed but core kept, intensity capped at 1, custom colours replace the flag palette, theme colours point at the theme's douze colours (the CSS variable behind `fill-countryItem-douzePointsBg`, so `var()` keeps working in previews).
3. **Plumbing**: theme specifics, the registry signatures, the board delay with speed, the player's `playbackRate` from the recipe, and the frontend fingerprint.
4. **Backend**: the field, normalisation, fingerprint and tests. Deploy it before the frontend ships.
5. **UI**: the editor section, preview replay and lab panel. Then an impeccable critique of the section on phone and desktop.
6. **Docs and release**: add a recipes part to §10 and a "Douze recipes" note in the general features overview. Suggest `yarn live-update publish --mode prompt` (a new feature) once the backend is deployed and the tree is committed.

## Later

- **v2.** Port the hearts grid and the parallelograms to specs, so every animation takes a recipe and the hand-written components can go. Every new year spec ships with groups and intensity tags (add that to the `add-douze-animation` skill when step 1 lands), so recipes work on it from day one.
- **Mixing parts across animations**, for example the 2022 waves with another year's burst. This needs a contract for groups that depend only on anchors, not on each other's timing.
- **A desktop timeline editor** over the same spec format: layers, keyframes and the lab's strip as its preview.
- **Recipes as their own library items**, shareable apart from themes like fonts. Only once people are making many.

## Open questions (owner)

1. **Parts and sliders.** Are the 2022 groups above right? Should Wash and Glow be the only sliders?
2. **Theme colours.** Which theme colours should map to `c1`–`c3` and `glow`? Proposal: `douzePointsBg` → c1, `douzePointsText` → c2, `c3` = c1, and `glow` a pale tint of c1.
3. **Built-in themes.** Can a recipe be used without making a custom theme, for example as a per-device setting? v1 proposal: custom themes only.
4. **Remix linking.** Does a recipe count as "non-trivial content" for linking remixes (`hasNonTrivialContent` in the backend)? Proposal: no in v1.
