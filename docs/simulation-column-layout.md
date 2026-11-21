# Simulation view: the column layout

The redesigned simulation view ("spokesperson column"). It replaces the stacked
Controls / Presentation panels and the icon header of the classic layout. It is
the default since 2026-11-14; the classic layout still ships behind a
setting ("Use the classic simulation layout") until it is deleted.

**The classic layout is deprecated.** New features, fixes and redesigns
target the column layout only. Changes don't have to bring the classic
layout along or match it; it only has to keep working (no crash, the vote
still runs). The setting's hint tells users so.

Code: `src/components/simulation/columnLayout/`. Design brief and direction:
`.impeccable/surfaces/src-components-simulation-simulation-tsx.md`; approved
state sketches: `.impeccable/mocks/sim-column-states.html`; Pick qualifiers
mode's options: `.impeccable/mocks/sim-pick-qualifiers.html` (option A built,
§7).

## 1. Switching layouts

`useSimLayout()` (`useSimLayout.ts`) picks `classic` or `column`:

- The setting `enableClassicSimulationLayout` (Settings → Look & feel →
  Popups & chrome, off by default, synced with the account) turns on
  `classic`. It applies at once: the open simulation switches layouts
  without a reload.
- `?simLayout=classic` / `?simLayout=column` in the URL still set the
  setting. A choice stored before the setting existed (localStorage
  `dp-sim-layout`) moves into it once and the key is removed
  (`adoptLegacyChoice`, run when the module loads, before the first render,
  so the layout never flashes).
- The server render always uses `column`.

`Simulation.tsx` renders `SimulationColumnLayout` unless the jury scale reveal
is running (that keeps the classic layout for now). Semi-finals in Pick
qualifiers mode render it with `mode="qualifiers"` (§7). The winner modal,
confetti and qualification modal are shared, except that the qualification
modal stays off while picking qualifiers in the column layout (the column
shows the qualifiers).

When the classic layout goes, delete the classic branch, the setting (and
its sync key and translations), the `?simLayout` switch, `ControlsPanel`,
`PresentationPanel`, `PhaseActions` and `SimulationHeader` (once nothing
else uses them).

## 2. Structure

```
SimulationColumnLayout          usePresentationLoop(), the Share shortcut
├─ SimHeader                    logo, stage + contest, minimal view, Setup, ⋯
├─ BoardStage                   Board (or FinalTelevoteReveal) + column count + zoom
├─ VotingColumn | ResultsPanel  desktop ≥1024px, right of the board (.dp-sim-col)
├─ VotingSheet                  phones/tablets <1024px, on BottomSheet (peek / open)
└─ SimStripe                    the minimal view, floating
   Pick qualifiers (mode="qualifiers"): QualifierBoard in BoardStage,
   QualifiersColumn, QualifiersSheet, SimStripe's qualifiers branch (§7)
```

- **Who votes** comes from `useVoterInfo()`: phase (`jury` / `televote` /
  `reveal` for lowest-to-highest televote), the voter or the country receiving
  televote, `index` of `total`, progress and the next value.
- **Random actions** come from `useRandomActions(voter)`: jury → next value,
  the voter's whole vote (grouped when `useGroupedJuryPoints`), all juries;
  televote → this country, all countries. Their keyboard shortcuts (Space,
  N, V, F) are registered once by `SimulationShortcuts`, never per button
  (docs/keyboard-shortcuts.md).
- **The one-tap Random** (`useQuickRandomAction`: the stripe's split button,
  the sheet's peek) repeats the jury scope picked last,
  `simViewStore.quickRandom` (`next` by default, `voter` after a whole vote
  from the menu, the sheet or the column; "All juries" never sticks). It
  shows a "whole vote" line in that case. In the televote it is always this
  country. The stripe's chevron opens every scope and runs the one picked.
- **The presentation engine** is `usePresentationLoop()`
  (`presentationPanel/usePresentationLoop.ts`), shared with the classic panel.
  Mount it exactly once per layout.
- **Televote entry** state and validation live in `useTelevoteEntry()`
  (`controlsPanel/`), shared with the classic `TelevoteInput`. It has effects
  (the reveal value), so only one entry may be mounted at a time: the column,
  the sheet or the stripe, never two. The points given against the stage's
  total come from `useTelevoteProgress()`, which has no effects and can be
  used anywhere (`useRoundProgress`). `TelevoteEntry` shows the count
  quietly inside the field everywhere ("265 / 1044", the full "Awarded: …"
  for screen readers and as a tooltip); variants only place an error:
  `panel` (column, sheet) under the field, `stripe` in a bubble above the
  stripe so it keeps its height.
- **Round progress** (`useRoundProgress(voter)`): the juries through "Show
  jury voting progress", the televote as the points given of the stage's
  total (shown with the televote limit on). One value for every progress
  line: the window's 3px line under its caption (column; `shrink-0`, or a
  held column squeezes the empty box away), and `EdgeProgress`, 2px along
  the top edge of the stripe and the sheet, inset by their corner radius so
  the first steps show.
- **Results** use `usePhaseResults()` (the column layout's `PhaseActions`).
- **Board rows and the jury points strip** are the theme's own components
  (`Board`, `VotingPointsInfo`), never restyled here (only sizes: §4).
- **The voter's flag** (`CrossfadeFlag`) keeps the outgoing flag underneath
  while the next one fades in: the one animated moment of the chrome.
- **The phone sheet** opens with a tap on the grab handle or a drag anywhere
  on it (`useSheetDrag`, shared with the ⋯ sheet): pull the peek up, push the
  open sheet down from the peek or its controls. The peek and the safe area
  are `touch-action: none`; the controls scroll natively when they overflow,
  and a pull down moves the sheet only once they are back at their top (a
  non-passive `touchmove` cancels the scroll for a sheet drag; iOS holds a
  sheet-like move from its first `touchmove`, before it commits to its own
  pan). Moves under 6px, sideways moves and inputs (televote field, speed
  slider) never drag; a drag past 28px swallows the click it may end in.
  Its controls are a px height (the measured content, 0 closed): a drag sets
  a share of it, so the controls come in under the finger (no gap under the
  sheet), and past 28px the sheet opens or closes from where the finger left
  it. (`fr`
  rows can't do this: mid-transition a `0.5fr` row shows a quarter of the
  content in half its height.) The safe area is a spacer at the very bottom,
  so neither the peek nor the controls change padding when it opens. Any
  random scope from the open sheet closes it. The presentation options show
  in it only while presenting; otherwise just Present.
- The **"presentation mode" setting** hides Present and its options.
- **⋯ → "Save contest"** is the setup's contest-card Save
  (`useContestSave`, docs/event-setup-hub-and-design-tokens.md §4). It saves
  the results so far too:
  - one tap on the user's own saved contest;
  - the save dialog otherwise;
  - labelled "Save a copy" on someone else's contest.

  Saving never reloads the snapshot into the stores, so the board and a
  running vote carry on as they were.
- **⋯ → "Enable fullscreen mode"** toggles the same `enableFullscreen`
  setting as Settings (`useFullscreen` applies it), shown only where
  `document.fullscreenEnabled` and not in the apps (so not on iPhone Safari).
- **Column height** (`useColumnFit`, desktop). `BoardStage` reports the
  board's box (`onBoardBox`: top in the scroll container, height, viewport).
  While the board fits the screen the column is as tall as the board, or as
  tall as its controls need (the window at its 2:1 minimum, the
  `data-col-part` parts, the spacer's minimum) if that is more. A board taller
  than the screen gets a column of the screen's height, `position: sticky` at
  the board's top, unless the controls don't fit that either (then it takes
  the height they need and scrolls along). Results keep their natural height
  and stick the same way. The column is zoomed, so board px are divided by
  the chrome zoom (`top` included: CSS zoom scales it). The window's part of
  the need is counted from the caption and progress line one by one: a
  squeezed frame reports less than its content takes.
- **Desktop grid.** `.dp-sim` is a grid on desktop: the title in the first
  row, the board row (board + column) in the second, and a zero-width second
  track that carries the header actions down the right edge (they overflow
  to the left, the title keeps clear of them with a measured padding). That
  track spans both rows, so the actions can be `position: sticky` together
  with the column while a long board scrolls. Phones keep the one-row
  `SimHeader`.

## 3. Modes

| State | Desktop | Phone |
|---|---|---|
| Voting | board + column | board + sheet |
| Presenting (show mode: `presentationSettings.isPresenting` and the stage not over) | board + column (window, points strip, speed, Pause + options) | board + sheet (voter, Pause; open: options, columns) |
| Minimal view, voting | board wide + stripe (voter, points strip or televote field, Random split button, Present, options, leave) | two rows (voter, Present, leave; strip or field) |
| Minimal view, presenting | the same stripe: Present turns into Pause, Random and the televote field step out and leave their place empty | the same, Pause for Present (no field) |
| Results | board + results column | board + results sheet |
| Final televote reveal, last points not given yet | reveal + column (televote field, At random) | reveal + sheet |
| Final televote reveal, bar running | reveal centred, column folded away | reveal, no sheet |

**One minimal view.** `simViewStore.minimalView` is the only switch (header
button, ⋯ on phones, the stripe's leave button, Escape); Present and Pause
never change it, so a presentation runs in whichever view is on. In the
minimal view the header keeps only the title (clean for screen recording),
centred over the board.
The Android back button pauses a presentation first, then leaves it.

`simViewStore` (`sim-view-storage` in localStorage, not synced to the account)
holds `minimalView`, `phoneColumns` (`auto` / `1` / `2`), `quickRandom` and
`boardTapped`.

**The voting hint** ("Choose a country to give N points", `VotingHint`) is
the only thing that says the board's rows are what you tap, so it shows in
jury rounds and the lowest-to-highest reveal only until points are first
given by tapping a row on this device (`BoardStage` marks `boardTapped` on a
row click, capture phase; disabled rows take no clicks). Never in the
televote: the window names the country and the field says what to type.
"Hide voting hints" still hides it.

**Phones' ⋯ sheet** (`QuickActionsSheet`) slides up over a fading scrim
(320ms) and back down when closed (200ms, kept mounted for it); under reduced
motion it just appears and goes. A pull down anywhere on it (`useSheetDrag`)
follows the finger and fades the scrim; past 28px it closes from there,
shorter it springs back. Letting go over an action after a drag doesn't run
it.

**The stripe keeps its size.** Desktop: one width (970 own px, capped by the
screen) and one height in every round and while presenting: every control is
40px (`md` buttons forced to 40px; `md` is 35px under the 14px root), the
voter line has a fixed slot, the strip or field a 330px slot, and the
actions sit at the right edge, so starting a presentation moves nothing.
The speed is in the options popover (the gear), not in the stripe. The
round's progress is `EdgeProgress` along the stripe's top edge (both
sizes).

**The final televote reveal** (`useControlsHiddenForReveal`). The reveal
panel appears before the last country's televote is given, and the controls
are how the viewer gives it, so they stay until then. Once the last points
are in (the stage is over) the results they would show give the winner away:
the column folds away (`.dp-sim-col.is-folded`, width + opacity; the reveal
re-zooms into the freed width) and the sheet and stripe unmount while the bar
runs. 1.4s after it ends they come back with the results; "View scoreboard"
(`onBackToScoreboard`) is the filled button there, not in the board header
(`BoardHeader revealOnly` keeps only the teaser).

## 4. Board sizing

`BoardLayoutContext` lets the host choose the column count. Without a provider
(the classic layout, share images, the setup hub) nothing changes. With one,
`Board` sets `data-cols`, `useReorderCountries` lays rows out column-major in
that many columns and `CountryItem` uses the compact two-column styling.
CSS (`styles.css`, `[data-cols]`) sets the grid and lets rows fill their track.

**Desktop (zoom to fit).** `BoardStage` wraps the board in an element with CSS
`zoom`, chosen so the board fits 96% of the height left under the header (and
above the stripe) and the width (a column must stay ≥360 board px wide), as if it had at least 13 rows (`MIN_SCALE_ROWS`: a semi-final's rows
are as big as a final's), and never more than 1.25× the chrome zoom. The
board's own px never change, so row proportions are untouched; extra width
becomes margin on the right (columns ≤520 board px; next to the column the
board starts at the page's inset, lined up with the header's logo; in the
wide modes it is centred). Header, column and stripe get a
milder chrome zoom on big screens (1 up to ~1700px wide / 960px tall, 1.5 at
2560×1440).

Two things break under `zoom` and are handled:

- **FLIP moves.** react-flip-toolkit measures rows with `getBoundingClientRect`
  (zoomed) and animates with transforms in the board's px (zoomed again), so
  rows overshoot. `patchRowRects` gives each `[data-flip-id]` row an own
  `getBoundingClientRect` that divides by the current zoom.
- **The douze overlay's name width.** `DouzePointsAnimation` reads the name's
  computed width (board px) instead of its bounding rect.

Anything new that measures rows on screen and writes px back inside the board
must do the same.

**Phones (fit by measuring).** `usePhoneColumnFit` runs in phases, re-measured
only when the line-up, the space or the fonts change (never on awards):

1. **Rows** (natural row height): one column if the whole board fits the
   screen height, otherwise two (Auto). Then the rows grow into the height left over
   (`data-tall`, `--sim-row-h`, max 44px), but only as far as the flag keeps
   the shape the theme gives it: a flag may widen by 6px at most
   (`--sim-flag-w`), so on a 390px phone two-column rows stop at about 34px.
   Height the rows can't take becomes even spacing between them
   (`--sim-row-gap`, max 6px). The
   place badge grows with its row, both ways (`min-width`); a rounded
   theme's badge is always a circle on phones (`aspect-ratio`, over the
   classic tablet width that made it a pill). Rows are measured at rest (the host
   renders `data-relayout` until the fit is done, which switches the theme's
   row transitions off).
   A tap in the spacing or on a place badge goes to the nearest row
   (`onBoardSpacingClick`), so each row's tap area is the full pitch (~44px).
2. **Names** (at the final sizes): names keep the theme's size. In two
   columns (`data-names="wrap"`) a long name may take two lines; if one is
   still cut off (a long single word: on a phone under ~600px two columns
   leave a name 20-30px), Auto goes back to one column (step 3; the board
   scrolls a little under the sheet). Two columns picked in the sheet stay.
   They keep the names while the names read well enough
   (`namesReadWell` in `nameFit.ts`): at most a quarter of them (rounded
   up) may end in an ellipsis, and each cut name still shows at least 70%
   of its widest line next to an ellipsis taken as 1em ("MONTENE…" yes,
   "MON…" no). Otherwise the board shows short codes in place of names
   (`data-names="code"`, step `twoCodes`; `STEP_ORDER` lists each setting's
   steps). Measured on 2026-11-17: the 2023-style themes on a 390px phone
   cut only the longest names (Liechtenstein, Netherlands, Switzerland,
   Montenegro, Luxembourg, Bosnia & Herzegovina) by about 1em and keep
   names; the 2026 theme leaves a name about 41px at 390px (60px at 430px),
   so it still shows codes on most phones.
   **Always show full country names** (Settings → Look & feel,
   `alwaysShowFullCountryNames`, synced with the account) turns two columns
   asked for into `TWO_FULL_NAMES` (just `two`): names in two columns
   however many end in an ellipsis, never codes and never one column. The
   owner's call (2026-11-17): these users asked for two columns and names
   both, so a narrow phone with the 2026 theme shows "BELG…", "MON…" rather
   than taking either away. In Auto and one column the setting changes
   nothing (they never cut names or show codes).
   The styling is the board's attribute, never per row, so rows remounted
   by an entrance need nothing.
   **Short codes** (`src/data/countries/shortCodes.ts`): sports-style
   three-letter codes (IOC; the football ones for England, Scotland, Wales,
   Northern Ireland, Macao, Guadeloupe, French Polynesia; ROW for the Rest
   of the World), a map keyed by `code` rather than a field on the countries
   (those are copied into saved contests and line-ups, and contests saved
   before would lack it). A custom entry uses the code its owner picked in
   the custom entry editor ("Short code": 1–3 letters or digits,
   upper-cased, stored on the entry as `shortCode` and copied into
   `customEntriesUsed` when a contest is saved), kept even if another entry
   has the same one. Callers pass these as `getShortCodes`' `chosen` map
   (`useChosenShortCodes` / `getChosenShortCodes`), read from
   `customCountries`, not from the line-up's copies, so voters and copies
   made before an edit get it too. Every other custom entry gets one from
   the name (`getShortCodes`): initials of three or more words, else the
   first three letters, else first letter + two consonants…, free of every
   other code in the event (all stages, so it stays the same across them);
   a number as the last resort. The editor shows that code as the field's
   placeholder (`suggestShortCode`). `BoardStage` passes them through
   `BoardLayoutOverride.shortCodes`; `CountryItem` shows the code (the name
   stays for screen readers) and the douze overlay follows. A code is never
   cut: it may run into the name's right margin, so it fits from a 345px
   phone up.
   Shrinking names (the first version) read too small next to the classic
   board and mixed sizes row to row.
3. **The douze overlay** copies the name's width and font size, and the
   board's name rules also match its `data-douze-name` (and its invisible
   flag `data-douze-flag` takes `--sim-flag-w`), so it lands on the row's
   name exactly.

The fit is keyed on the window's width, not the board's: a scrollbar that
appears while a step is measured would otherwise change the width and restart
the fit in a loop.

Each phase is a layout effect that sets state, so passes that keep restarting
each other never let the frame end, and React stops at 50 nested updates
(error #185, the error page). One such crash came from an iPhone with a
393 × 267 window on 2026-11-15, cause unknown. `fitLoopGuard.ts` caps the
passes at 16 per animation frame (a normal fit needs at most six): past that,
the fit settles on the last finished layout under the current key, and the
page posts `Board fit loop stopped (phone)` to `/errors` once, with the key,
the fit state, the board's top and the visual viewport.

Overflow is measured from the name's text range, not `scrollWidth` (which
rounds, and a 0.3px overflow already draws an ellipsis): `measureName` in
`nameFit.ts`, with the decisions (`allNamesFit` for Auto, `namesReadWell`
for two columns) as pure functions under unit test. Margins for the row
height are read off one row at a time, because rows ease their height and a
mid-transition read would skew it. Two columns on narrow phones also narrow
the flags (26px) and give the rounded points cell room for three digits
(`[data-points-current]` / `[data-points-track]`, set by `PointsSection`).
Three columns only for line-ups of 32+ in the wide modes.

**Centring.** In the wide modes the board is centred on what is visible (place
badge to current points), because rounded rows keep an empty lane for the
latest points on their right.

**Relayouts snap** (`useRelayoutFlags`). While the window is resized
(`data-resizing`, set straight on the host so it lands before the browser
restyles) and for 220ms after the column count, row height, flag width, row
gap or name size changed (`data-relayout`, rendered in the same commit), CSS
switches every row transition off and `Board` skips FLIP moves
(`isBoardRelayout` in `shouldFlip`). Without it a resize resized and moved
rows at once with the slow FLIP spring, and could leave them mid-move.

**Entrance** (`BoardLayoutOverride.appearReady`). With a host, `Board` skips
its whole-board fade: on a new stage, restart, stage select or line-up
(`useBoardAnimations` `appearKey`) the rows are remounted (the Flipper is
keyed with `entranceKey`), the new order is applied at once (no teleport,
however the points changed), and the board stays hidden until the host has
fitted it (`appearReady`: zoom measured / phone fit settled) and the rows
show the new line-up in its new order; then the rows rise 14px and fade in
top to bottom (a GSAP stagger of about 0.4s). Before this, a restart after
some awards teleported the rows from their old order while they rose in.
No FLIP move runs while the entrance is pending or playing (`isEntranceActive` in `shouldUseFlipAnimationForCountry`): rows a
stage shares with the previous one (the qualifiers) would otherwise slide
from their old places, and GSAP would freeze the slide's offset into the
rise. A 1.5s fallback shows the board if it never settles.

## 5. Styles and strings

- Chrome uses the theme tokens only (`--p-*`, `--accent`, hairlines); classes
  `dp-sim-*` in `styles.css` (components layer: keep the class names literal in
  source or Tailwind purges them). Floating pieces (sheet, stripe, popovers)
  are the only ones with a shadow.
- Strings live under `simulation.view.*` in all nine locales; run
  `yarn gen:messages` after editing them.

## 6. Not done yet (v2 ideas)

- Dragging the stripe to any edge of the screen.
- A point flying from the strip to the row when it's awarded.
- The column layout for the jury scale reveal.

## 7. Pick qualifiers mode

Semi-finals in Pick qualifiers mode (`settings.isPickQualifiersMode`): no
points, the user (or Random, or a presentation) names the qualifiers one by
one. `SimulationColumnLayout mode="qualifiers"` keeps everything else (header,
column sizing, sheet, stripe, minimal view, presenting) and swaps the parts:

- **State** (`useQualifiers`): the qualifiers in the order they were named
  (`qualificationOrder`), the places (`getTotalQualifiersAmount`), the latest
  qualifier, the split screen's candidates while it shows, and the heading
  from the existing `qualifiedForTheGrandFinal` / `qualifiedForStage` /
  `qualifiedEntries` strings with their line breaks flattened. The places
  come as `sections`: one for all of them, or one per target stage when the
  semi-final qualifies to several and "Show qualifier target stages" is on
  (`split`), each headed "Qualified for the {stage}" and numbered on from the
  last. Also `nextPlace`, `activeSection` (where the next pick goes) and
  `latestSection`.
- **Several target stages** (e.g. 1-10 to the final, 11-16 to a wildcard
  round): the picks fill the target stages one after another, so the first
  10 named go to the final whoever they are. The store keeps that true:
  `pickQualifier` swaps votes with the last entry that would take the open
  places of the target stage being filled (`getOpenPlacesInActiveSection`;
  with one target stage that's every place left, as before), Random and the
  split screen's anchor reveal one of those entries, and
  `getRankedCountriesWithPoints` ranks with the same comparator (ties
  included) that hands the qualifiers out when the stage ends. While picking,
  the list groups by pick order; once over, by rank
  (`qualification/useQualifierSections`, shared with the results modal),
  which comes to the same. Captions name the target stage ("Grand Final,
  4 of 10"): the latest qualifier's under its name, the next pick's over the
  split screen.
- **Board** (`QualifierBoard`, rendered by `BoardStage` instead of `Board`):
  the line-up in running order as the theme's qualification rows
  (`CountryQualificationItem bare as="button"`), in the board's own structure
  (`.container-wrapping-flipper > div > .dp-scoreboard-font > button`, names
  with `data-entry-name`) so the zoom, the phone fit, the spacing taps and the
  hint's `boardTapped` all work unchanged. A qualified row stays in place,
  dimmed, as in the classic mode (nothing reflows); the split screen's
  candidates get an accent outline; once the stage is over the qualifiers are
  back in full colour and the rest take the theme's non-qualifier colours.
  Rows rise in like the board's when a stage starts.
- **Window** (`QualifierWindow`): the latest qualifier with "4 of 10
  qualified" and the progress line (the jury progress setting); before the
  first pick the hosting heart and the stage's name; with split screen on,
  the candidates as flush tiles (`SplitTiles`, tap one to qualify it; it plays
  the theme's `qualifierReveal` sound and the `qualifierCards` haptic, as the
  old modal did); once the stage is over the qualifiers' flags as a mosaic
  (`QualifiersFlagGrid`). `flagMosaic.ts` measures the box and splits the
  flags into rows (or columns) of different lengths, each line sized 1/n, so
  every flag has the same landscape shape near 3:2 and no cell stays empty:
  10 in the 3:2 window are columns of 3, 3 and 4, and 10 on the phone's
  118px strip are two rows of 5. Lines with fewer (bigger) flags come first,
  and no line holds more than twice the flags of another. The tiles are
  positioned absolutely, so a re-plan on resize doesn't remount them. The
  grid is part of the column, so the "Show qualifiers popup" setting
  (`showQualificationModal`) doesn't touch it; that setting still governs
  the popup (`QualificationResultsModal`) in the classic layout and after a
  semi-final with points. The popup names the target stages the same way:
  a "Qualified for the {stage}" title over each target stage's qualifiers
  (grouped by rank) when target stages show and they aren't all going to
  the Grand Final, no label on the rows.
- **Column** (`QualifiersColumn`): window, the hint (until the first row is
  tapped), "Qualified for the Grand Final" as numbered places in two columns
  filled top to bottom (`QualifiedList`, compact theme rows, dashed outlines
  for empty places, the next one in the accent; one such list per target
  stage when split, instead of a target label on every row), At random
  ("Next qualifier" or "One of these 3", "All 6 left"), Present pinned at the
  bottom. Over: the window's grid, the full list, Share, Continue.
- **The places as flags** (`PlaceChips`): one row while every circle can be
  22px or more, otherwise more rows (a contest with 20-odd places); an empty
  place's number is 46% of its circle (`cqi`, the circle is a size
  container).
- **Phones** (`QualifiersSheet`, on the shared `BottomSheet`): the peek is the
  latest qualifier, Random and the places as flags; the split
  screen floats above the sheet instead of growing the peek, because a
  taller peek would change the board's fit (one column, two columns) at
  every step. Open: the list, At random, Board columns, Present. Unlike the
  voting sheet, At random's next qualifier keeps the sheet open (as the
  peek's Random does); only "All left" closes it. Over: the peek shows the
  qualifiers' flags, Share and Continue, and the sheet still pulls up, to
  the full list (the desktop column's).
- **Minimal view** (`SimStripe mode="qualifiers"`): the latest qualifier,
  the places as flags in the jury strip's slot, a split Random (next; the
  chevron for all left), Present, options, leave; the split screen floats
  above the stripe. Results use `ResultsPanel` without Stats (`hideStats`:
  the picked semi-final's points stay hidden).
- **Random**: `useQualifierRandom().next` picks among the split's candidates
  while it shows (`pickQualifierFromSplitScreenCandidatesRandomly`),
  otherwise `pickQualifierRandomly`; `pickAllQualifiersRandomly` fills every
  place left (also F in this mode).
- **Split screen auto-open** (`qualification/useSplitScreenStep`): shared
  with the classic `PickQualifiersSimulation`; mounted once per layout. A
  presentation opens and resolves it itself (`usePresentationLoop`).
