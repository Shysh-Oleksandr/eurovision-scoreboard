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
  voter-caption:
    fontFamily: "var(--dp-font-family)"
    fontSize: "19px"
    fontWeight: 800
    letterSpacing: "-0.01em"
    lineHeight: 1.25
rounded:
  board-row-square: "3px"
  control-sm: "9px"
  control: "12px"
  card: "14px"
  modal: "16px"
  sheet: "22px"
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
  sim-panel:
    backgroundColor: "{colors.surface-page}"
    rounded: "{rounded.modal}"
    padding: "16px"
  sim-caption-bar:
    backgroundColor: "{colors.surface-base}"
    textColor: "{colors.ink}"
    typography: "{typography.voter-caption}"
    padding: "11px 16px 12px"
  sim-sheet:
    backgroundColor: "{colors.surface-page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
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
  the active state of toggles, library icons, state dots and progress lines
  (the simulation's voter progress, the televote budget). Text on an
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
board's palette appears outside the board, together with the custom entry
editor's preview, which is a board row too.

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
- **Voter caption** (800 uppercase, -0.01em; 19px in the simulation's voter
  window, 16px in the phone peek and the stripe): the voter's name, with the
  ordinal next to or under it (600, 14px / 12.5px, `text-white/75`).
- **Number input** (700, 16px): the televote points field. 16px keeps iOS
  from zooming the page when the field gets focus.

### Named Rules

**The No Tracked Caps Rule.** No small, letter-spaced uppercase labels
(`text-[10px] uppercase tracking-[.1em]`). Name things in sentence case at a
readable size, or put the name inside the control as a caption. Uppercase
is reserved for the CTA label, for country names when the theme's
scoreboard uses it, and for the voter's name on the simulation's caption
(large and untracked, like the broadcast's).

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
- **The simulation board scales as a whole on desktop, with air around
  it.** CSS `zoom` fits it to the free width and 96% of the height under the
  header (columns 360–520 board px), never past 1.25× the chrome's zoom, and
  as if it had at least a final's 13 rows, so a semi-final's rows are as big
  as the final's instead of filling the screen. Row proportions never
  change. Header, column and stripe get a milder zoom on big screens (1.5 at
  2560×1440). The page's side inset (`clamp(40px, 4vw, 120px)`) is the same
  on both sides: the logo lines up with the board's first column, the ⋯
  button with the column's right edge; the column sits 1.5rem from the
  board.
  Anything that measures rows inside the zoomed board divides by the zoom
  (`patchRowRects`); see `docs/simulation-column-layout.md` §4.
- **Phones fit the simulation board by measuring.** One column if the whole
  board fits the height, otherwise two, but only if every name still fits
  at the theme's size (a long name may take two lines); otherwise one
  column after all and the board scrolls. Names never shrink, and every row
  keeps the theme's flag shape. Two columns picked in the sheet stay two:
  then sports-style codes (NOR, GER, SUI) replace names that don't fit, all
  rows alike. Rows grow into spare
  height (up to 44px) only as far as flags keep the theme's shape (a flag
  widens by 6px at most); the place badge grows with its row and a rounded
  theme's badge stays a circle. The rest
  becomes even spacing between rows (up to 6px), and a tap there goes to
  the nearest row.
- **Relayouts snap, entrances rise.** A new column count, row size or a
  window resize moves the rows straight to their places (no row transitions,
  no FLIP). A new stage instead keeps the board hidden until it is fitted,
  then every row rises 14px and fades in, top to bottom (0.55s each, about
  0.4s of cascade), the ones carried over from the previous stage included:
  nothing slides between stages.
- **Check every layout** at 320, 390, 720, 1100 and 1440px in English,
  German, Ukrainian and French, signed in and out.

## Elevation & Depth

Flat by default. Depth comes from the tonal ladder and hairlines.

### Named Rules

**The Flat Surface Rule.** Cards, buttons, combos and stages have no drop
shadow, no inset highlight and no glow inside the setup hub and the
simulation view (`.dp-hub` / `.dp-sim .dp-act:not(.is-on)`). Nested cards
never share a tint: a card on a card steps up the ladder or uses a quiet
fill.

Shadows are allowed only on things that float above the page: menus
(`.dp-menu`), the drag overlay, toasts, the slight lift of a board row
on hover, and the simulation's bottom sheet, floating stripe and popovers
(`.dp-sim-sheet`, `.dp-sim-float`). The spokesperson column sits flat.

## Shapes

- **Cards** 14px, **controls** 12px (`rounded-xl`), small controls 9–10px,
  chips and pills fully round.
- **Board rows follow the theme:** the board's own heights (28px phones,
  31.5px from `md`, 35px from `lg`, 31.5px for rounded themes), a pill for
  rounded themes (2026+), 3px corners otherwise; the points box is the
  theme's shape: the board's `RoundedTriangle` wedge in front of it, square,
  or transparent. Only the simulation's phone board grows rows past these
  heights (see Layout).
- **Floating simulation pieces:** sheets round their top corners only
  (22px), the stripe 18px, popovers 14px; the spokesperson column is a 16px
  panel.
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

**The picker (`EditionPicker`, `src/components/setup/hub/picker/`): a
series, then a year.** What opens from either combo, the same content in two
shells: a `.dp-menu` panel under the combo on desktop and tablets (392px,
no entrance animation, the combo turns into its search field), the
simulation's ⋯ sheet on phones (below 576px wide or 521px tall; the search
field isn't focused on open). Never a native select.

- **Latest** first: the newest edition of each series plus every edition of
  the current year, newest first, at most four (`getLatestEditions`). Tiles
  are a heart over the year over the series' tab name.
- **Tabs** in the segmented well: Quick select (only when it has entries),
  then the series ("Eurovision", "Junior", "Asia"). A series whose editions
  all show in Latest gets no tab (ESC Asia while it has one edition). The
  picker opens on the tab holding the current pick. Too long for the row, the
  Quick select tab keeps only its pin.
- **The grid**: four across, newest first, heart + year. The tab panel is as
  tall as the tallest tab, so switching tabs moves nothing; search results
  keep that height too.
- **Built-in themes show their background**: the tile is a 2 kB thumbnail
  (`public/bgImages/thumbs/`, `scripts/theme-thumbnails.mjs`) darkened under
  the year; quick select themes keep their swatch.
- The current pick has the accent ring (1px, 2px on pictures). Search matches
  series names (Eurovision, Junior, JESC, Asia), years, host countries and
  quick select names, and lists full names ("Eurovision 2026", "Austria").

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

Rare or destructive actions next to a surface button are **quiet**
(`surface` + `dp-act--quiet`: no fill until hovered), so a row of them
doesn't read as a wall of equal buttons: Remove beside Change, Undo, Delete
account. A permanent action adds `dp-act--danger` (red text only); its
confirmation dialog carries the alarm, never a filled red button on the
screen. A quiet button at a column's edge shifts by its padding so its label
lines up with the text or buttons around it. Legacy `tertiary` /
`destructive` (gradient, shadow, all caps) don't belong on redesigned
screens.

### Forms and account screens (`EditProfileModal`, `AccountModal`)

- **One commit model per screen.** A screen with Save holds only what Save
  saves; actions that apply at once (sign-in methods, blocking, log out,
  deletion) live on a screen with Close only. Never mix the two under one
  Save bar.
- **Save waits for a change** (`saveButtonDisabled`), and Enter in a text
  field saves.
- **Every field says where its value shows** in a one-line hint under it
  (`InputField` `hint`), with format rules before they're broken; an error
  replaces the hint, in the user's language, under the field it's about.
  A fixed prefix that's part of how the value is shown ("@" for the
  username) sits inside the field (`prefix`).
- **Staged changes say so:** a picked or removed picture shows "Removed
  when you save" and an Undo until Save.
- Avatars without a picture use the theme's placeholder (`.dp-profile-ph`),
  not the grey silhouette image.
- Screens redesigned in the hub's style add `dp-flat` to the modal content
  so their surface buttons lose the drop shadow, as in the hub.

### Profile modals (`ProfileModal`, `UserProfileModal`, `.dp-profile-*`)

**Who it is stays beside what they made.** From 1024px the person sits in
a 290px column left of the list (the spokesperson column's idea): flat
`--p-950`, hairline, 16px radius, sticky while the list scrolls; the modal
widens to 1040px. Below that the same block is a band above the list that
scrolls away. The frame is the libraries': a header with "Profile", your
own profile's two views beside it, and × to close; no Close bar. On phones
the views move to a bar at the bottom.

- **Identity:** avatar (88px in the column, 64px in the band; the theme's
  placeholder without a picture), the name (22px / 19px, 800) with the
  heart flag, @username, the joined date, then one hairline-framed line of
  plain stats: "128 followers ›" (opens the list) and "12 public items".
  No big-number stat blocks.
- **Actions** (`ProfileActions`): a stack of 46px buttons in the column; on
  phones one row, the first stretching and the others dropping their
  labels when they don't fit (`dp-act-label`). Another fan: Follow is the
  one accent fill (a surface "Following" once followed; signed out the
  disabled button says "Sign in to follow"), then Share profile and Entry
  leaderboard; report and block sit in the ⋯ in the corner. Your own:
  Edit profile, Account, Share profile, all surface buttons, left-aligned
  in the column.
- **Your profile / Following feed** are tabs in the segmented well, like
  the libraries' places: in the header from `2cols`, in the bottom bar on
  phones (44px segments that share its width). Both views stay mounted.
- **The list's toolbar** (`ContentListToolbar`): All / Themes / Contests /
  Designs as a segmented well (`ContentTypeBadges`: icons, then labels
  only, then two rows) beside the search while both fit, else above it;
  under them Sort by and Created as caption selects (`WidgetSortBadges`,
  `CaptionSelect`: the name in small type over the value, a menu with the
  choice checked) and "Found 12 items" at the row's end, or under the
  selects when it doesn't fit. Never rows of filter chips.
- Theme, contest and design cards are the libraries' own; neighbouring
  designs share one gallery grid, so they sit two to a row. Previous /
  Next (`WidgetPager`) are quiet buttons with chevrons, sentence case.

### Libraries: Themes and Contests (`widgets-section/library/`, `.dp-lib-*`)

**The list gets the screen.** One frame for both modals (`LibraryModal`):
a flat `--p-950` surface, the title with the three places beside it,
**Yours / Saved / Community** (the simulation's segmented well, real tabs
with arrow keys), and × to close. Saved is a place of its own, as in the
Graphics library. On phones the places move to a bar at the bottom where
Close used to be; × stays at the top. Each place mounts on its first
visit and keeps its search, sort and page.

- **Toolbar** (`LibraryToolbar`, fitted): the search (a recessed frame,
  16px text on phones), then Sort by, Created (Community) and Includes
  (themes' Community: audio, custom fonts, background video, any mix) as
  caption selects (`CaptionSelect`, `LibraryMultiSelect`), then the place's
  one action as a surface button (New theme, Save current contest). When
  the row doesn't fit, the selects share a row under the search. Phones
  keep one row: the search, a Sort button that names the current sort (an
  accent dot when a filter is also set) and opens Sort and filter as the
  simulation's sheet (choices as tiles, Clear, Done), and the action as an
  icon.
- **Groups** (`LibraryFolderRail`, Yours): one row of pills that scrolls
  sideways and fades at its edges; the chosen one is followed by its Edit
  button, then a quiet New group.
- **The toolbar and groups scroll away with the list** (they're used less
  than the height is needed); the header with the places stays. Previous /
  Next scroll back to the top.
- **One quiet line over the list** (`LibraryListHeader`, 13px 700 at 70%):
  the count ("21,895 themes", grouped by the locale), Clear filters in the
  accent tint while Created or Includes is set, and the list's stats as a
  labelled link at the end (Your entry stats, Country leaderboard). Never an
  unlabelled chart icon.
- **In use**: the applied theme / loaded contest heads Yours under its own
  line on page 1 while nothing narrows the list.
- **Empty states** say what would be here and offer one action: New
  theme / Save current contest, Clear search, Clear filters, or Browse the
  community from an empty Saved.
- **Cards** keep their layout, never a tracked-caps kicker or chips. A
  theme card: the name with its date on the right, then one line of facts
  with small icons: Private / Public (your own only), the group, what it
  adds (Audio, Custom fonts, Background video). A contest card's name lives
  in the host panel; its right column ranks the facts by type instead of
  giving each an icon: the description, then the stages (14px 700, white),
  the entries ("137 participants, 25 finalists", 13px, 75%), then the rest
  quietly (12.5px, 55%, at most two lines, each fact kept whole): the date,
  Private / Public, the group, custom entries, theme, venue, hosts, points
  system. The status (winner, In progress, Not started yet) is one neutral
  pill in the host panel. Load is the flat `cta`, like Apply. Your own
  items skip the creator row. Theme cards keep the theme's own surface and
  accent; contest cards are flat `--p-900`.
- **A theme preview's state** (Jury, Televote, Active, Finished,
  Unqualified) sits in the preview's top-left corner as a quiet tint, never
  a row of five: ‹ › step through the states (round the end, the arrows
  first so they stay put), the name opens them all as a menu. No
  translation outgrows it, and the card loses a row. A tap on the row
  still awards 12.
- Counts drop the locale's no-break space ("21 903 теми"): Gotham draws it
  25em wide.

### Settings modal and Odds (`settings/`, `.dp-settings-*`, `.dp-odds-*`)

**The libraries' frame, the simulation's layout.** Settings uses the
libraries' frame (`SettingsModal`, `SegmentedTabs`): the title with
General / Odds / Relations beside it and × in the header; on phones the
tabs sit in a bar at the bottom. Each tab scrolls on its own and is
remembered. General and Relations keep their own content inside it.

- **Odds is the board with its column** (`OddsSettings`): the countries on
  the left, one 288px column of controls on the right that stays put
  (sticky) while the list scrolls under its sticky header. In order: Numbers
  / Ranking, Jury / Televote (Ranking), one line of help or the last
  change's line with Undo, Set all odds, then Randomness and Points spread
  under a hairline. Narrower than 700px (a container query, so the stage
  setup's Odds tab gets it on narrow windows too) the column folds above the list: Numbers
  / Ranking shares a row with "Set all", and the two sliders become caption
  combos (name over value) that open their slider in place.
- **Numbers is a table that keeps its labels** (`OddsTable`): flag, name,
  then Jury and Televote fields under column headers with the stats
  Summary's swatches (white 45%, accent). Headers sort on click (A–Z,
  highest first), never while typing. Fields are text with the decimal
  keypad, right-aligned tabular figures in the language's decimal mark;
  Enter / ↓ / ↑ move down and up a column; empty shows a faint 50; over
  1000 is outlined red while typed and becomes 1000.
- **Ranking is the scoreboard it predicts** (`OddsRankList`): the theme's
  jury rows (`BoardFlag`, `BoardCap` widened for "83.5") with the country's
  real odds in the points box, places in their own column that stays put
  while a row is dragged. No medal colours, no coloured side bars. A drop
  re-spaces the channel; the help line says so before, and the change's
  line with Undo after, while the dropped row keeps an accent ring.
  Keyboard: Space picks a row up, arrows move it, Space puts it down.
- **Bulk changes are one menu that names outcomes** (Set all odds): Default
  odds ("Based on the real 2026 results"), Even odds, Random odds, the two
  copy directions, and in a stage's override Global odds first. Each leaves
  a line ("Every country is at 50. Undo") until the next change; never a
  row of equal uppercase buttons.

### Custom entry editor (`CustomCountryModal`, `setup/custom-entry/`)

**The entry is shown as the board will draw it.** On top, the entry as the
active theme's jury row (`EntryRowPreview`: `useBoardRowLook`, `BoardFlag`,
`BoardCap` from `CountryTile`), with 12 in the points box: one full row,
no short-code version (the Short code field's hint says where the code
shows). It updates as you type and pick, so the flag is checked in the
theme's flag shape, not in a loose rectangle.

- **One flag picker, not one control per source.** The group's label line
  holds Upload image (a `surface` button; on desktop an image dropped
  anywhere on the modal does the same). Under it one hint line: the upload
  rules, a staged upload with Undo, or the error. Then the simulation's
  segmented well (`ShareSegmented`: Your flags, Presets, Countries) over one
  grid of 3:2 tiles (`.dp-flag-tile`), the chosen one ringed in the accent.
  Countries and long lists of your own flags get a search field; lists show
  20 tiles until "Show all". An image link is the rare path: a quiet "Use an
  image link" opens the field. Uploaded and preset flags never show up as a
  URL.
- **The last flag chosen wins:** a tile, an upload or a typed link replaces
  the others. A new entry starts on the World preset, ringed.
- **Saving never loses data.** A staged upload goes up after the entry is
  saved and replaces the flag only once it has arrived; if it fails, the
  hint line says the entry was saved without it and Save retries on the same
  entry. A link that doesn't load an image blocks Save with an error under
  the field.
- **Colors** (`EntryColorsField`) sit under the flag: the same segmented
  well (From the flag, Custom) and, for Custom, up to three 46px swatches
  (main colour first) and a quiet + tile. Custom starts from the colours
  read from the chosen flag (one white swatch with the picker open when it
  can't be read). A tapped swatch takes the accent ring and opens the
  Colors step's picker inline under the row (no popover: the modal is full
  screen on phones), its presets the flag's colours, then common flag
  colours; Remove color (quiet) and Done under it. The swatches show the
  entry's own data, so they're the one place here with colours that aren't
  the theme's.
- **Footer** (`EntryActionBar`): Delete entry is quiet red text, and when
  creating, an "Add another" check (kept for the session) sits there instead:
  Save then clears the form and keeps the group. The bar is fitted: one row,
  then Delete as its icon, then the leading action on its own row.
- Each custom-entry group's header has a + that opens a new entry in that
  group.

### Name and flag editor (`EntryOverrideModal`, `setup/entry-override/`)

A standard country's own name and flag in one contest (docs/entry-overrides.md)
uses the custom entry editor's parts, so the two read as one tool: the
board-row preview drawn with the country's code (its flag in the theme's
shapes), one Name field and the same flag picker. One quiet line under the
title says the change is for this contest only and the results still count
as the country in the stats. The name is prefilled; the built-in name is the
placeholder and the hint, and an empty field means the built-in name. The
country's own flag is the ringed tile of Countries until another is picked.
The flag group's label line holds Upload image and the same hint line
(rules, staged upload with Undo, or the error) as the custom entry editor;
an image dropped on the modal on desktop does the same. Under the picker, one
check row like "Add another": "Use in my new contests", with its hint. The
footer's leading slot holds a quiet "Use the original" (RotateCcw) while
the draft differs from the country as it ships. The tile menu's "Edit name
and flag" opens it; "Use the original name and flag" there resets in one tap.

Settings → Contest has a "Country names and flags" subhead: the Historical
names switch, then "Your names and flags", the account's defaults as plain
rows (28×20 flag, name, what it replaces, a quiet ✕), like the keyboard
shortcuts list.

### Stage editor (`EventStageModal`, `setup/event-stage/`)

**Say where everyone goes, in places.** A stage ends as a ranking, so "Who
goes through" is written in its terms: one line under the rows reads the
result back ("10 of 15 entries go through.", "Places 1–10: Grand Final,
11–14: Semi-Final 2, 15: out."), with the stage's size only when it's known
(not while earlier stages still send entries in).

- **Name and Voting mode are wells with their caption inside**
  (`dialogFields` `Field`; the voting well covers a native select), and the
  selected voting mode explains itself in one hint line.
- **Two ways to set qualifiers are one segmented well** (How many / Which
  places), not a switch: switching converts the numbers both ways.
- **One row per stage in running order** (`.dp-qual-row`): the stage being
  edited is an outlined row marked "This stage", stages that run earlier
  say "Runs earlier" instead of showing disabled controls, and later stages
  get −/count/+ or a first–last place pair. A row's × appears only when it
  has a value, in a slot kept so the fields never shift. Names wrap to two
  lines; when the list is too narrow for a readable name beside the fields
  (a container query), the fields move under the name.
- **Errors name the rows** while you type ("Place 8 goes to two stages: …",
  "Place 11 has no stage yet.") and outline only the fields involved; a
  half-typed range waits until you leave its row. An empty first field
  shows the next free place as its placeholder.
- **Order is dragged by the grip** (`SortableKnob`, so rows scroll on
  touch). A move that leaves a target running earlier says so under the
  rows, with Undo.
- Save waits for a change; Enter in any field saves; Delete stage is quiet
  red text in `EntryActionBar`.

### Stage setup (`PostSetupModal`, `setup/post-setup/`, `.dp-ss-*`)

**The last look before the show.** Start opens it before each stage. The
libraries' frame at 1040 × 740: the stage's name as the title, Running order
/ Voters / Odds / General as the segmented well beside it (under it when they
don't fit, fitted with `useFitStep`: then the short "Order" label, then less
padding; always under it on phones), × to close. The footer reads the stage
back ("15 entries, 17 voters", a hairline, the voting mode) beside a quiet
Cancel and Start, the one filled button; phones keep only Start. Closing asks
first only when something differs from what the modal opened with (Undo back
to the start counts as nothing). Each tab mounts on its first visit and
scrolls on its own.

- **Bulk changes are one menu that names outcomes**, as in Odds: the running
  order's Order (A to Z, Z to A, Shuffle, Draw halves with its explanation,
  Remove halves, Back to the saved order) and the voters' Set voters
  ("Replace the list with": the year's real voters, this stage's entries,
  entries from other stages, every entry; then the sorts, then Clear all in
  red text). Each leaves a line under the toolbar with Undo; the line is the
  tab's help until then. No rows of unlabeled icons.
- **The running order is the board before the first vote**: the theme's jury
  rows (`useBoardRowLook`, `BoardFlag`, `BoardCap`), numbered outside the row,
  in two columns that read down from 600px (one on phones). Drawn halves are
  the two columns; the points box of each row moves it to the other half.
  Share is a surface button in the toolbar.
- **Voters are numbered**, because the order is the spokespersons' order, as
  quiet tiles with a quiet line under the name only for exceptions (Auto-Q,
  the stage a voter performs in, Jury only); one column on phones so names
  never become stubs. Add voters is a 336px column beside them (search, one
  Group caption select, the group's countries with their stage, "18
  countries" with Add all) and the simulation's sheet behind Add on phones.
- **Channels is a labelled toggle** that turns the voters into a table that
  keeps its labels: Jury and Televote columns with the stats' swatches and
  the counts in the headers, 44px check buttons, the last channel locked.
  No channel empty: the error bar above the footer offers both fixes in place.
- **General** is the stage editor's voting well with its hint, then pressed
  toggles with a check (`StageToggle`) whose hint says whether the stage
  follows Settings, then Points with "Same as Settings." or "Only this
  stage. Use Settings' points", a preset well, and each points system as a
  strip of tiles in a well: the value as a field, its star (the douze
  animation) and × inside the tile, a dashed + tile, a legend under it.
- Buttons inside sortable rows use `noDrag` so a tap never starts a drag; a
  dragged row lives in `<body>` (`dp-ss-dragged`, above the modal).

### Menus (`AnchoredMenu`)

No entrance animation (a fade reads as a slow click). Section headers in
sentence case (`plainHeaders`).

### Toasts (`src/app/toast-root.tsx`, `src/helpers/toast.ts`, `.dp-toast`)

**The answer, not an interruption.** A toast says what just happened when
the place it happened can't (a menu closed, a dialog saved and left, a
background event). When the answer can sit where the user is looking, it
goes there instead: a field's error under the field, a toggle's new state
on the toggle (likes and follows have no success toast).

- **Top centre, as wide as the text** (up to 420px): every header keeps its
  actions top right, and the centre is free on all of them. Phones: a card
  8px under the status bar (and the offline strip), never a full-width band.
  Newest on top, 8px apart, three at most.
- **The menus' material:** `.dp-menu`'s dark gradient, `--hair-2` border,
  14px corners, a shadow (toasts float), the theme's interface font at
  13.5px/700, 46px minimum height. No fills by status and no countdown bar.
- **Status is the icon's colour only:** the accent for done, the ballot dots'
  fixed hues for warnings (#e6b23c) and errors (#ff5d70, plus a faint red
  border), `--ink-70` for information and decisions.
- **One action at most**, as text in the accent tint (`toastWithAction`):
  it follows the message, or moves under it with its label lined up with the
  text when both don't fit. It answers in place ("Copied") and the toast
  leaves 1.2s later; it never raises a second toast. A decision (update
  ready, What's new: `ActionToast`) is the only toast with a CTA, beside a
  quiet Later, and stays until answered.
- **Timing by reading time** (`toastDuration`): confirmations 2–6s, a toast
  with an action 6s, errors and warnings 5–10s with a close button. All pause
  while hovered. Dismiss: tap, or swipe up.
- **Screen readers:** confirmations are `role="status"`, only errors
  `alert`. The same text of the same type isn't stacked twice.
- **Motion:** rises 12px from the top edge and settles (320ms, ease-out),
  leaves by lifting 8px and fading (180ms); a fade under reduced motion.
- Import `toast` from `@/helpers/toast`, not from react-toastify, so these
  defaults apply. Text is always translated; English only for admin pages.

### Simulation view (`columnLayout/`, `.dp-sim-*`)

The default since 2026-11-14 (a setting brings back the old layout, which
is deprecated: don't design for it); the mechanics are in
`docs/simulation-column-layout.md`. Where the broadcast shows the
spokesperson, the app shows the voter and their controls. The
board rows and the theme's jury points strip (`VotingPointsInfo`) are drawn
by the theme and never restyled here, only sized.

- **Spokesperson column** (desktop ≥1024px, 320–440px wide): one flat
  `--p-950` panel with a hairline border. On top the voter window: the
  voter's flag full-bleed over a flat `--p-900` caption bar (name, then
  "6th of 35 countries"), and a 3px accent progress line under it (the
  round's progress: juries, or the televote points given). The
  window is a flag's own 3:2 at the column's width (it gives way first, down
  to 2:1). Under it the hint (until the first row is tapped; never in the
  televote), the points strip (or the televote field and
  Vote) and At random; Present (CTA) and the options gear stay pinned at the
  bottom, with free space above them. While a presentation runs, the same
  column shows the points strip (read-only), the speed and Pause where
  Present was. The column is as tall as the board while the board fits the
  screen (taller only if its controls need it); with a board taller than the
  screen it takes the screen's height and stays put while the board
  scrolls, and so do the header's actions above it.
- **Phone sheet** (<1024px): the column folded into a bottom sheet. The peek
  keeps the same first line in every round (flag, name, ordinal, Random),
  then the hint and the points strip, or the televote field. Pulling it up
  (the grab handle, or a drag past 28px; the controls follow the finger)
  adds the random scopes, Board columns (Auto / 1 / 2) and Present; the
  presentation options only while presenting. Sheet buttons and segmented
  options are at least 44px tall.
- **Floating stripe** (the minimal view): the board goes wide and centred,
  and one floating stripe keeps the voter and the controls: the points strip
  or televote field, Random, Present, the presentation options (a gear with
  the speed inside) and leave. Starting a presentation changes as little as
  possible: Present turns into Pause, Random and the televote field step out
  and leave their place empty; the stripe keeps its height and width, and
  every control in it is 40px. The progress is a 2px line along its top
  edge (the phone sheet has the same). The header keeps only its title,
  centred over the board, so a screen recording can be posted
  as it is. A presentation runs in either view: the minimal view is one
  switch (header button, Escape, leave), and Present and Pause never change
  it.
- **Televote count** ("Awarded: n / x") is secondary: a quiet "265 / 1044"
  inside the field everywhere; its share is the round's progress line. An
  over-the-limit error floats above the stripe rather than growing it.
- **Header actions** are 46px (`lg`) on every screen size. The ⋯ menu adds
  "Enable fullscreen mode" (the Settings switch) where the browser has the
  Fullscreen API: not in the apps, not on iPhone Safari.
- **At random:** a labelled group with one `surface` button per scope, each
  naming what gets randomised: the next value ("4 points"), the voter's
  whole vote ("Belgium" over "whole vote"), all juries; in the televote, the
  country and all countries. It replaces Random / Vote randomly / Finish
  randomly. The stripe and the peek have a one-tap Random that repeats the
  jury scope picked last (the next value by default; "whole vote" shows
  under it once that was picked; never "all juries"). On the stripe it is a
  split button: the left part runs it, the chevron opens every scope and
  runs the one picked.
- **Results** take the controls' place (column, sheet or stripe): the
  winner's window or "Semi-Final 1 is over", with Continue the only filled
  button. The final televote reveal keeps the controls until the last
  points are given (they are how the viewer gives them), then gets the stage
  to itself: the controls step aside while the bar runs (the results would
  give the winner away) and come back 1.4s after it ends, with "View
  scoreboard" as the filled button.
- **Controls side by side are one height**: a select drawn as a button
  (the stage select) matches the button next to it (46px in the column and
  sheet, 35px in the stripe); a label that needs two lines wraps inside it.
- **Segmented choices** (`Segmented`): options in a dark well, the chosen
  one on `--p-750` with a 1px accent ring.
- **Pick qualifiers mode** (semi-finals without points) keeps the same
  layout. The board is the line-up in running order (the theme's
  qualification rows); a qualified row stays in place, dimmed, so nothing
  reflows. The window shows the latest qualifier with "4 of 10 qualified";
  the split screen splits it into the candidates (flush tiles, a 2px seam,
  ringed in the accent on the board too); the stage's end turns it into the
  qualifiers' flags. Under it, "Qualified for the Grand Final" as numbered
  places (dashed outlines while empty), At random ("Next qualifier", "All 6
  left"), Present. Phones and the stripe show the places as a row of flags
  where the jury points strip sits; the split screen floats above them.
- The accent fills only Present, Vote, Pause, Continue and View scoreboard;
  everything else is a `surface` button.
- **Shortcut hints** (website, mouse or trackpad): the key in a button's
  top-right corner is plain text, 10px bold in the button's own colour at
  55%, never a keycap, chip or badge. Menu rows show it right-aligned, an
  icon button in its tooltip. Space is drawn as ␣ and Enter as ↵: a
  spelled-out "Leertaste" collides with the label in a narrow button. A hint never changes a fitted
  layout: buttons of 40px and less make room with right padding
  (docs/keyboard-shortcuts.md §3).

### Stats modal (`simulation/finalStats/`, `.dp-stats-*`)

**Tables that keep their labels.** A finished stage's stats in four views:
Summary (the one it opens on), Split, Breakdown and Votes (the voting
graphic). One flat `--p-950` surface; the views are the modal's own
components (`SummaryView`, `SplitView`, `BreakdownView`, `VotesView`), and
the share image keeps drawing its own tables (`SummaryStats`, `SplitStats`,
`StatsTable`), so changing one never changes the other. Votes has no share
image yet: Share opens on the Summary there.

- **Header:** the views as the simulation's segmented well (`dp-sim-seg`),
  Share (`cta`) and × on the right from `2cols`. Phones move Close and Share
  to a bottom bar under the thumb.
- **Controls row** under it, fitted by `useFitStep`: the stage's name as a
  title (a combo with a "Stage" caption and a menu once two stages have
  finished), then the Total / Jury / Televote switch (Breakdown; Split below
  720px, where it picks the one list shown) and the website's Export. The
  switch takes its own row when they don't fit.
- **Tables:** hairlines between rows only, no vertical rules; numbers
  right-aligned in tabular figures; headers in sentence case at 12.5px 700
  (70%). Each view scrolls in its own box, so the header row stays on top
  and the first column (place, flag, name) stays on the left.
- **Summary** draws each entry's total against the winner's as a 4px bar
  under the name, split into jury (white at 45%) and televote (the accent);
  the same two swatches mark the column headers. Each channel shows points,
  then the place in ordinal form (stacked below 560px).
- **Split** groups the three rankings by spacing (32px between groups), not
  rules. Pointing at an entry lights it in every list, its name in the
  accent tint.
- **Breakdown** codes the voters (ALB, ARM…) under their flags; below 560px
  the frozen column shows codes instead of names. Shading is white, growing
  with the points (26% at the top value, curved so high values stand out);
  the top value (a 12, or 24 for a jury and televote 12 in Total) is in the
  accent tint. A country's own cell is a dim "–". Pointing at or tapping a
  cell lights its row and column, outlines the cell in the accent and says
  the vote in the line above the table ("Croatia gave Israel 16 points: jury
  8, televote 8"); a ramp on that line's right reads the shading.
- **Votes** (`votes/`) is the one graphic among the tables, so it gets the
  boldness: one country in the middle, a ring of round flags around it
  (everyone who gave it points, or every entry it gave points to), sized
  by area, the biggest just after 12 o'clock and clockwise down to the
  least, each joined to the middle by a spoke (white, stronger with the
  points; an arrowhead past its middle shows the way). It sits in a dark
  well (the share picture slot's) under the controls row: a band with the
  middle's name (20px / 17px, 800), one plain line ("Winner, 576 points
  from 36 countries") and the key to the pills with the view's totals
  ("289 Jury, 287 Televote" as pills), Received / Given on the right; a
  toolbar with Countries, the "Jury and televote" toggle (a check and the
  two swatches; the label goes before the swatches do), and Replay / Full
  screen. Jury pills are near-white with `--p-950` ink, televote pills the
  accent with its ink (the stats' swatches), just outside the flag's rim
  so they never cover its number, always jury counter-clockwise of
  televote. They start hidden when the ring is too crowded for them
  (under 44px of ring per flag: a final on a phone) until the toggle says
  otherwise. Numbers sit on a dark radial scrim inside the flag with a
  tight dark edge, so they read on white fields. The middle flag is
  ringed in the accent, and when its country both got and gave points a
  click on it switches Received / Given (it grows 4% when pointed at, and
  a small pill over it says "Switch to Given"); a pointed flag grows 7% with an accent ring and
  its spoke in the accent, and its card floats beside it (the popovers'
  shadow): name, place line, the Breakdown's sentence ("Denmark gave
  Bulgaria 24 points"), the two pills. On touch the first tap shows the
  card with Open, so a tap never opens a country by surprise. Countries
  lists the entries as the theme's board rows (numbered by place, reading
  down the columns) and the voting-only countries as quiet tiles whose
  names wrap rather than cut, the middle one ringed. Zero points is "Nul
  points" (the surface's one fan line).
- **The voting graphic moves, the tables don't.** Entrance (and Replay, and
  a pick from the list): the middle opens, the ring's flags land as dots
  (from just outside for Received, out of the middle for Given), then the
  sweep: clockwise each flag grows to its size, its spoke draws in and the
  middle's total counts up with it (about 1.5s for a final). A clicked
  flag (the usual way to explore) is quicker: it comes in to the middle
  while the flags in both views travel round the ring to their new places
  (elliptic polar paths, so nothing cuts across the middle; clockwise
  movers take an inner lane a flag's width inside the ring, the others
  stay on it), the old middle leaving a beat later beneath it, then a
  short sweep; numbers read within about a second. A flag that
  lands under a resting pointer isn't hovered until the pointer moves.
  Resizes snap, except during a move: then the move re-aims at the new
  layout (the band gains a line as the list closes or the name changes);
  reduced motion fades the finished ring in.

### Voting predefinition (`setup/voting-predefinition/`, `.dp-vp-*`)

**The matrix is the Breakdown, made editable.** The Detailed tab draws the
stats Breakdown's table (codes under the voters' flags with each vote's
status dot, hairlines between rows only, white shading, the top value in the
accent tint, "–" for a country's own cell, codes in the frozen column below
560px) in a flat `--p-950` well. The mechanics are in
docs/voting-predefinition.md §3.1.

- **The modal fits the matrix.** From `md` it grows, measured, until the
  whole table shows (up to the viewport), never below its usual 64rem ×
  720px, and keeps that size on every tab.
- **One selected cell**, outlined in the accent, its voter's code and
  country's name in the accent tint, its row and column lit. With a mouse
  cells are fields; on touch they are 40px buttons, and no keyboard opens.
- **The points bar** sits under the matrix: one line (the voter's flag, the
  readout or a notice, quiet actions on the right, labels dropping to icons
  when they don't fit) over the voter's points as chips in balanced rows
  (10 chips are one row or two of 5, never 9 and 1). Free chips are quiet
  fills; a used one is a hairline outline with its holder's code under the
  value; the cell's own one is ringed in the accent; in a whole vote the
  next value is the accent fill. With nothing selected the chips are a
  disabled legend, so the bar's height never jumps.
- **A whole vote** lights the voter's column (white tint, its header
  outlined in the accent like a selected cell) and shows the next value
  faintly in an empty field on hover.
- **Header:** fitted (one row; the tab's controls on a second row; on
  phones stretched tabs, Reset only in ⋯, icon-only Share and Randomize).
  "Predefine votes" is a sentence-case caption before the stage name, left
  out on phones.

### Share image modal (`simulation/share/`, `.dp-share-*`)

**The picture is the screen.** Most people never change an option, so the
modal opens on the finished image and Save image is the only filled button.
The mechanics are in docs/graphics-studio.md §6.

- **One picture slot**, in a dark well with a hairline: the exported image,
  made when the modal opens, and the live stage in its place once an option
  has changed it (every change shows at once). Save makes the file again only
  if something changed (a 2px accent line runs along the picture's top edge
  meanwhile). Never a preview and a second "result" copy, and never a
  Generate button. A corner button opens the current image at full size.
- **Options beside it, never in front of it.** From 1024px a 336px column
  next to the picture (the spokesperson column's idea); the well keeps its
  size when the format changes, the picture fits inside it. Below 1024px the
  picture comes first, then the primary option (Format, or Table for stats)
  and one Customize row (title + what it holds, a chevron). Customize unfolds
  the rest in place and the picture stays pinned above it, smaller, so every
  change is visible.
- **Choices, not parameters.** Groups have a sentence-case label (13px 700 at
  70%) with Auto, or a Reset link in the accent tint, on its right. Segmented
  choices use the simulation's well (`dp-sim-seg`) and fall back to one per
  row when a label doesn't fit (`useFitStep`); Format shows each shape as an
  outline above its name. Text fields carry their name as a caption inside the
  frame (16px values for iOS). On/off options are pressed buttons with a check
  (`dp-share-toggle`); numbers are steppers. Pixel sizes and paddings belong
  to the graphics editor, reached by the last row.
- **The action bar replaces the Close bar**: Save image (`cta`), Share where
  the device can share, Copy image on desktop browsers, all 46px. On desktop
  the file's format and size sit on the left ("JPG, 2400 × 1260"). Save turns
  into "Preparing…" while it waits for the image and into "Saved" with a check
  for two seconds after. × in the header closes.

### Motion

- **Board rows enter staggered** (`useTileEntrance`): 420ms, 30ms per row
  (tighter on long stages, the last row starts by 600ms), ease-out, slide +
  clip reveal. On first open, on
  expanding a stage, on a new line-up, and for countries that just arrived.
  Never on reopening the setup. Off under reduced motion.
- **The voter's flag crossfades** (`CrossfadeFlag`): when the voter changes,
  the new flag fades in from 1.04× over the old one (320ms, ease-out), so the
  window never flashes empty and nothing else moves. It is the simulation
  chrome's one authored moment; the sheet's slide, the scrim and the
  progress line are plain transitions. All off under reduced motion.
- **The simulation's controls come and go quietly:** the stripe rises 14px
  and fades in (360ms), the sheet slides up from below (420ms), the phones'
  ⋯ sheet slides up over a fading scrim (320ms; down again in 200ms), and the
  spokesperson column folds its width away for the final reveal (500ms,
  ease-in-out, fading first) and unfolds after it. All off under reduced
  motion.
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
- **Don't** restyle the theme's board rows or jury points strip to suit new
  chrome: size them, never redraw them.
