---
name: DouzePoints
description: A song contest scoreboard simulator made by and for Eurovision fans.
colors:
  # Every colour is derived from the active theme at runtime
  # (src/design-system/tokens.css, src/theme/oklch.ts, interfaceAccents.ts).
  # Values below are the 2026 theme's; never hardcode them.
  surface-page: "oklch(0.3482 0.0536 86.5)" # --p-950
  surface-base: "oklch(0.386 0.067 86.5)" # --p-900
  surface-raised: "oklch(0.428 0.07504 86.5)" # --p-800
  surface-high: "oklch(0.47 0.08174 86.5)" # --p-750
  surface-highest: "oklch(0.512 0.08844 86.5)" # --p-700
  accent: "oklch(0.84 0.13 88)" # --accent
  accent-ink: "oklch(0.22 0.05 88)" # --accent-ink (text on an accent fill)
  accent-2: "oklch(0.65 0.105 101)" # --accent-2
  ink: "#ffffff" # --ink
  ink-muted: "rgba(255, 255, 255, 0.72)" # --ink-70
  ink-subtle: "rgba(255, 255, 255, 0.55)" # --ink-55
  hairline: "rgba(255, 255, 255, 0.1)" # --hair
  hairline-strong: "rgba(255, 255, 255, 0.16)" # --hair-2
typography:
  # The interface font is the theme's (`--dp-font-family` slot); country
  # rows use the theme's scoreboard font (`.dp-scoreboard-font`).
  headline:
    fontFamily: "var(--dp-font-family)"
    fontSize: "24px"
    fontWeight: 800
    letterSpacing: "-0.022em"
    lineHeight: 1.25
  title:
    fontFamily: "var(--dp-font-family)"
    fontSize: "20px"
    fontWeight: 800
    letterSpacing: "-0.024em"
  label:
    fontFamily: "var(--dp-font-family)"
    fontSize: "15px"
    fontWeight: 800
    letterSpacing: "-0.01em"
  body:
    fontFamily: "var(--dp-font-family)"
    fontSize: "13px"
    fontWeight: 600
  caption:
    fontFamily: "var(--dp-font-family)"
    fontSize: "12px"
    fontWeight: 600
  board-row:
    fontFamily: "var(--dp-scoreboard-font-family)"
    fontSize: "12.5px"
    fontWeight: 700
rounded:
  board-row-square: "3px"
  control-sm: "9px"
  control: "12px"
  card: "14px"
  modal: "16px"
  pill: "999px"
spacing:
  tile-gap: "7px"
  control-gap: "8px"
  section-gap: "14px"
  section-gap-wide: "16px"
  modal-padding: "14px"
  modal-padding-wide: "20px"
components:
  library-button:
    backgroundColor: "rgba(255, 255, 255, 0.06)"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  surface-button:
    backgroundColor: "{colors.surface-high}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "38px"
  cta:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.control}"
    height: "50px"
  stage-card:
    backgroundColor: "{colors.surface-base}"
    rounded: "{rounded.card}"
    padding: "14px"
  quiet-tile:
    backgroundColor: "rgba(255, 255, 255, 0.06)"
    textColor: "{colors.ink}"
    rounded: "10px"
---

# Design System: DouzePoints

## Overview

**Creative North Star: "The Green Room"**

The interface is the green room, the scoreboard is the stage. Everything
around the board (setup, libraries, settings, dialogs) is calm, flat and
plainly worded, so the one thing with colour and drama is the contest
itself: country rows drawn in the theme's own board colours, the hosting
heart, the Start button. Playfulness lives in the simulation and in small
moments (rows sliding in like a board filling up, a fan's turn of phrase in
an empty state), never in decoration.

Every colour comes from the active theme, including themes users make, so
the app never looks like one product skinned over another. Personality comes
from type, shape, layout, motion and copy, never from hardcoded colour.

The audience is very online and spots generic AI design immediately (see
PRODUCT.md). The setup hub was rebuilt in 2026-10 to remove exactly those
tells; the rules below keep them out of the rest of the app.

**Key Characteristics:**

- Flat tonal surfaces with hairline borders; no drop shadows on surfaces or
  buttons, no glows, no gradients on cards.
- One loud element per screen (the CTA, or the board rows on the setup).
- Country rows mirror the theme's scoreboard: row colours, flag shape, row
  shape, points box, letter case and scoreboard font.
- Sentence case everywhere; numbers as plain words ("6 private, 3 public").
- Layouts decide by measuring the content, not the viewport alone, and are
  checked in German, Greek, Ukrainian and French.

## Colors

A small tonal ladder tinted by the theme's hue, plus one accent, all
re-derived for every theme.

### Surfaces

- **Page / base / raised / high / highest** (`--p-950` … `--p-700`): five
  OKLCH steps at the theme's hue. Cards sit on the next step up from what is
  behind them and are separated by a hairline, not a shadow.
- **Quiet fills**: `rgb(255 255 255 / 6%)` (11% on hover) for secondary
  surfaces that sit on a card: library buttons, pool tiles, chips.

### Accent

- **Accent** (`--accent`): hand-picked per theme in `interfaceAccents.ts`
  (auto curve for custom themes). Used for the CTA fill, selection outlines,
  the active state of toggles, library icons and state dots. Text on an
  accent fill uses `--accent-ink`.
- **Accent 2** (`--accent-2`): only for tints that need a second hue (the
  contest card gradient, the avatar placeholder).

### Named Rules

**The Theme-Only Rule.** Never hardcode a hex, a Tailwind palette colour or
a fixed "tone" in interface code. If a colour isn't a token, it doesn't
belong. (The old pink/gold/teal widget tones were removed for this.)

**The One Accent Rule.** The accent marks what is active, selected or
primary. It is never decoration, never a background wash behind a whole
section, and never a glow: no coloured drop shadows behind buttons or cards.

**The Board Colour Rule.** Country rows inside stages take the theme's
`countryItem` jury colours (`bg-countryItem-juryBg`,
`text-countryItem-juryCountryText`, `juryPointsBg`, place badge colours) and
`getSpecialBackgroundStyle` for gradients. They are the only place the
board's palette appears outside the board.

## Typography

**Interface font:** the theme's (`--dp-font-family`), so a custom theme's
uploaded font carries through. **Board rows:** the theme's scoreboard font
(`.dp-scoreboard-font`), only on country rows and place badges.

The project's root font size is 14px, so Tailwind rem utilities run small
(`text-xs` is 10.5px, `h-10` is 35px). **Write sizes in px**
(`text-[13px]`, `h-[38px]`).

### Hierarchy

- **Headline** (800, 17px phone / 22px / 24px desktop): the contest title.
- **Title** (800, 17.5px / 20px): stage names, section titles.
- **Label** (800, 14–15px): button and library titles; buttons 13px.
- **Body** (600, 12.5–13px, `text-white/80`): one-line facts under a title.
- **Caption** (600, 12px, `text-white/75`): the small line inside a combo
  ("Eurovision" over "2026"), menu section headers (12.5px, 700).
- **Board row** (700, 12–12.5px uppercase when the theme says so, else 13px).

### Named Rules

**The No Tracked Caps Rule.** No small, letter-spaced uppercase labels
(`text-[10px] uppercase tracking-[.1em]`). Name things in sentence case at a
readable size, or put the name inside the control as a caption. Uppercase
is reserved for the CTA label and for country names when the theme's
scoreboard uses it.

**The Plain Numbers Rule.** Stats are short phrases joined by commas
("18 custom, 28 saved"), never strings glued with middle dots. On phones,
show one number ("9 contests").

**The Non-Breaking Space Rule.** Never put U+00A0 in UI text: the 2026
theme's Gotham draws it 25em wide (a 525px gap at 21px). Use `text-balance`
to avoid orphans instead.

## Layout

- **Phone first.** Tailwind `max-[…]` variants are not generated here; write
  the phone layout, then add `2cols:` (576px), `sm:`, `md:`, `lg:`.
- **Fit by measuring, not by guessing.** When a row may not fit (long
  translations, long contest or theme names), give it ordered layout steps
  and let `useFitStep` (`src/hooks/useFitStep.ts`) pick the first one that
  fits (measure an element without horizontal padding, or pass `targets`
  for overflow inside grid cells), instead of `flex-wrap` (which leaves a ragged second row) or a fixed
  breakpoint (wrong for German at 1200px, wasteful for English at 800px).
  Steps are `data-*` attributes styled in `styles.css`; see the setup
  header and contest card.
- **Degrade in a fixed order:** first move a cluster to its own row, then
  shorten labels, then move secondary actions into a ⋯ menu, then drop
  labels from icon-recognisable actions. The primary action (Save, Start)
  keeps its label.
- **Titles never truncate to a stub.** A title gets its own row (and up to
  two balanced lines on phones) before it is cut.
- **Check every layout** at 320, 390, 720, 1100 and 1440px in English,
  German, Ukrainian and French, signed in and out.

## Elevation & Depth

Flat by default. Depth comes from the tonal ladder and hairlines.

### Named Rules

**The Flat Surface Rule.** Cards, buttons, combos and stages have no drop
shadow, no inset highlight and no glow inside the setup hub
(`.dp-hub .dp-act:not(.is-on)`). Nested cards never share a tint: a card on a
card steps up the ladder or uses a quiet fill.

Shadows are allowed only on things that float above the page: menus
(`.dp-menu`), the drag overlay, toasts, and the slight lift of a board row
on hover.

## Shapes

- **Cards** 14px, **controls** 12px (`rounded-xl`), small controls 9–10px,
  chips and pills fully round.
- **Board rows follow the theme:** the board's own heights (28px phones,
  31.5px from `md`, 35px from `lg`, 31.5px for rounded themes), a pill for
  rounded themes (2026+), 3px corners otherwise; the points box is the
  theme's shape: the board's `RoundedTriangle` wedge in front of it, square,
  or transparent.
- **Flags follow the theme's flag shape** on board rows (`getFlagPath` with
  the theme's `flagShape`, sized by the scoreboard's `useFlagClassName`).
  Heart flags appear only where the user's heart
  setting applies: the country pool, the hosting logo, the contest select.

## Components

### Library buttons (`WidgetContainer`, `.dp-lib`)

One neutral fill per library (Themes, Contests, Graphics), accent icon,
title, and a stat line only for signed-in users. No descriptions that
restate the title. On phones a 15px icon sits before the title, or above it
for the whole row when one title wouldn't fit beside it ("Wettbewerbe").

### Header (`SetupHubHeader`, `.dp-hub-header`)

Contest and theme combos carry their name as a caption inside the control.
One row while everything fits at its natural width; otherwise the combos
share the first row and Profile / Settings stretch across the second; on
narrow screens the profile button shrinks to the avatar. The feedback button
is the original bare 40px icon.

### Contest card (`ContestCard`, `.dp-contest-card`)

Hosting heart, title, then one line of facts: where the contest lives
(icon + "On this device" / "Private" / "Public" / "Community") and its save
state ("Saved Oct 25, 14:05", or an accent dot + "Unsaved changes"). Draw
and participant counts are not repeated here; the stage list shows them.
Actions follow the fit steps above.

### Stage cards and board rows (`StageCard`, `CountryTile`)

Flat `--p-900` card, place-badge number in the board's colours, collapsible
(remembered per contest in `stageAccordionStore`). The body clips only while
collapsing or sliding open, so a selected tile's outline is never cut. Stage
tiles are board rows; pool and draw-bucket tiles are quiet tiles. While
selecting, the checkbox sits in the points box so names never shift.

### Buttons

`Button` `variant="cta"` for the one primary action per screen: one flat
accent fill with its ink, uppercase label, no glow, no gloss gradient, no
inset highlight, no text shadow and no border; hover brightens it (no lift),
a press scales it to 0.985, focus shows a 2px accent outline. `surface` /
`surfaceStrong` for everything else, `size`
`md` with `!h-[38px]` in toolbars. Toggles show state with `.is-on` (accent
border and ring).

### Menus (`AnchoredMenu`)

No entrance animation (a fade reads as a slow click). Section headers in
sentence case (`plainHeaders`).

### Motion

- **Board rows enter staggered** (`useTileEntrance`): 420ms, 30ms per row,
  capped at 12 steps, ease-out, slide + clip reveal. On first open, on
  expanding a stage, on a new line-up, and for countries that just arrived.
  Never on reopening the setup. Off under reduced motion.
- Hover lifts by 1px at most; presses scale to 0.985.

## Do's and Don'ts

### Do:

- **Do** derive every colour from the theme tokens and check two contrasting
  themes (2026 gold, JESC purple) plus a light custom theme.
- **Do** spend boldness in one place per screen.
- **Do** keep copy plain, with at most one fan-voice line per surface
  ("169 countries waiting in the wings").
- **Do** keep screens that reopen often mounted (`Modal` `keepMounted`) and
  narrow store selectors so hidden trees don't follow the board's updates.

### Don't:

- **Don't** build rows of identical feature cards with tinted icon tiles,
  descriptions and chevrons.
- **Don't** use small spaced-out uppercase labels or middle-dot stat strings.
- **Don't** float badges on a card's edge or stack chips next to a title.
- **Don't** nest a card in a card of the same tint, or add glows, inset
  highlights and drop shadows to make surfaces "pop".
- **Don't** use NBSP (U+00A0) in UI strings.
- **Don't** pick a layout from the viewport width when the content length
  decides whether it fits.
