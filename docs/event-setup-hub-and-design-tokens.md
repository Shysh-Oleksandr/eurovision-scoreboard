# Event Setup Hub and the hue-derived design tokens

The Event Setup Modal (`src/components/setup/EventSetupModal.tsx`) is the
screen a user configures before running a contest. It was redesigned from the
`design_handoff_event_setup_modal` handoff (direction D "Hub"). This document
covers the parts that are not obvious from the code: the palette that follows
the theme hue, the lineup data flow, drag-and-drop, and dirty tracking. The
visual rules (flat surfaces, board rows, sentence case, fitted layouts, what
counts as an "AI tell") are in `DESIGN.md` at the package root; read it before
changing any UI, in the hub or elsewhere.

## 1. Hue-derived palette (reusable app-wide)

Every surface and accent in the modal derives from a few bare-number CSS
variables computed by `getInterfaceTokens()` in `src/theme/oklch.ts`:
`--prim-hue` (OKLCH hue of `primary.800`), `--prim-l` and `--prim-c`
(lightness and chroma of `primary.900`), `--accent-h/-l/-c`,
`--accent-2-h/-l/-c` and the ink flags `--accent-ink-dark` /
`--accent-2-ink-dark`. The tokens live in `src/design-system/tokens.css`
(imported globally):

| Token                                | Meaning                                                        |
| ------------------------------------ | -------------------------------------------------------------- |
| `--p-950 … --p-700`                  | five OKLCH surface levels (page → highest)                     |
| `--accent`                           | primary accent (CTA, `.is-on` rings, selection, tray, library icons, state dots) |
| `--accent-2`                         | secondary hue for tints (contest card gradient, avatar placeholder) |
| `--accent-ink`, `--accent-2-ink`     | text on an accent fill: white, or deep on-hue for light accents |
| `--gold`                             | fixed, hue-independent (draw-mode pieces)                      |
| `--ink*`, `--hair`, `--hair-2`       | white text and hairlines at fixed alphas                       |

**Surfaces follow the theme's lightness.** `--p-900` sits at the theme's own
`primary.900` lightness (clamped to 17–40 L% so white text stays readable) and
each level above adds a fixed 4.2 L% step; chroma follows `primary.900` too
(clamped to 0.035–0.12, rising slightly with lightness). A light or pastel
theme therefore yields a lighter modal, a dark or gray one a darker/grayer
modal, and cards always separate from their background by the same step.

**Accents are picked by eye, not computed from a rule.** Both accents come
from data in `src/theme/interfaceAccents.ts`:

- `BUILTIN_INTERFACE_ACCENTS`: one hand-picked accent (and optionally an
  `accent2`) per built-in theme, seeded from the theme's own scoreboard
  colours (`animatedBorder`, `douzePointsBg`, `juryLastPointsBg`, …).
- `ACCENT_KEYFRAMES`: the auto curve custom themes use. One row per OKLCH
  hue of the primary (every 30°), one stop per custom-theme shade (35 / 60 /
  85, stored with that shade's `primary.900` lightness as `primL`).
  `getAutoAccents()` interpolates between the two nearest rows and, inside a
  row, between the stops around the theme's lightness, so dragging the
  editor's hue or shade never makes the accent jump. Hue travels the short
  way round the wheel. A stop without `accent2` uses the old hue − 40° rule.

Every accent is gamut-clamped (`clampAccentToGamut`) and gets an ink from
`pickAccentInk()`: white while it reaches 3:1 on the CTA fill, otherwise a
deep on-hue ink (`oklch(22% 0.05 h)`) when that reads better. That is what
lets gold, lime, mint and cream be real accents: the old CTA darkened every
accent to L 66% so white text would pass, which turned them mustard or olive
and left only pinks and blues usable. `.dp-cta`, `.dp-check`,
`.dp-board-check` (selected) and Tailwind's `text-accent-ink` use the ink.
`getCtaStops()[0]` is the `.dp-cta` fill; keep them in sync. The CTA is flat
everywhere (no glow, inset highlight, gradient or text shadow); hover
brightens it, a press scales it. `oklch.test.ts` checks that every shipped
accent reaches 3:1 and that the shipped curve has no jumps.

Cross-hue tints (`dp-contest-card`, `dp-tray`) use `color-mix(in oklab, …)`
so a blue accent on a gold surface does not sweep through green. Everything
else in the hub is flat: stages sit on `--p-900` with a hairline, and hub
buttons drop their shadows (`.dp-hub .dp-act:not(.is-on)`).

### Palette Lab (dev only)

`/dev/palette-lab` (dev server only; the route 404s in production and its
import is compiled out) is the tool for changing those values:

- One row per built-in theme (over its background image) and per keyframe
  cell (12 hues × 3 shades, each rendered on the custom theme the editor
  would produce). Each row shows a full hub mock built from the real `dp-*`
  classes, sliders, and candidate swatches: in code, the old bands, tonal,
  the theme's brand colours, analogous ±45°, triads, splits, complement.
  Hover previews a candidate in the mock, click picks it. The header switches
  between editing `accent` and `accent2`.
- A scrubber and three strips show the interpolated result for any editor
  hue/shade, so jumps between rows are easy to spot.
- Picks persist in `localStorage` (`dp-palette-lab:v1`). **Export** produces a
  Prettier-clean replacement for `src/theme/interfaceAccents.ts`
  (`components/dev/palette/codegen.ts`).
- Open the app with `?palette` for a floating panel
  (`components/dev/palette/PaletteDevPanel.tsx`) that repaints the live
  modal: the active theme, any built-in theme (its background shown behind
  the modal), or any custom hue/shade, with or without the lab's picks, plus
  per-accent sliders. It only writes the interface variables on `<html>`,
  never stores or the server, and restores the active theme's values on
  close.

Previews can sit side by side because `tokens.css` declares the derived
palette on `:root, .dp-palette-scope`: a custom property that reads other
variables is resolved where it is declared, so an element that sets its own
bare numbers must re-declare the palette to see them.

Each colour also has a `*-raw` triplet so Tailwind can append an alpha:
`bg-p-800/50`, `border-accent/40`, `text-accent-2`, `bg-gold` (see
`theme.extend.colors` in `tailwind.config.js`). Shadows `shadow-card`,
`shadow-contest`, `shadow-menu`, `shadow-act` and borders `border-hair`,
`border-hair-2` are registered too.

### Where the interface tokens come from

- **Built-in year themes**: emitted at build time. A Tailwind plugin in
  `tailwind.config.js` writes `.theme-YYYY, [data-theme="YYYY"] { … }` with
  all the interface variables for every `YEARS_WITH_THEME`, using
  `getThemeInterfaceVars()` from `src/theme/oklch.ts` (which applies the
  theme's entry in `BUILTIN_INTERFACE_ACCENTS`). No FOUC.
- **Custom themes**: `applyCustomTheme()` in `src/theme/themeUtils.ts` sets
  them inline on `<html>` from `getCustomThemeInterfaceVars()` (same basis,
  the generated primary ramp, so the shade slider lightens/darkens the modal
  and moves along the accent curve),
  and `clearCustomTheme()` removes them (`INTERFACE_TOKEN_VARS`). The theme
  editor preview block carries its own copy.

`src/theme/oklch.ts` is dependency-free sRGB ↔ OKLab ↔ OKLCH math (plus gamut
and WCAG contrast helpers) and is safe to import from the Tailwind config.

### Component classes

Anything needing `color-mix()`, gradients, pseudo-elements or data-attribute
layouts is a `dp-*` class in `src/styles.css` (`@layer components`; write the
class literally: Tailwind only emits `@layer components` classes it finds
verbatim in the source): `dp-cta` (the primary action, flat accent fill),
`dp-act` (filled buttons, `--strong`, `--feedback`, `.is-on`), `dp-combo` /
`dp-combo-chip`, `dp-lib` / `dp-lib-icon` (library buttons),
`dp-contest-card` (+ the `dp-cc-*` parts), `dp-stage` (`--draw`),
`dp-board-tile` / `dp-board-cap--*` / `dp-board-check` (stage tiles as board
rows), `dp-tile` (quiet tiles in the pool and draw buckets), `dp-drop-on`,
`dp-tray`, `dp-menu`, `dp-pool`, `dp-cat`, `dp-group`, `dp-search`,
`dp-count-pill`, `dp-icon-btn`, `dp-tile-grid` / `dp-pool-grid` (auto-fill
grids driven by `--tmin` / `--pmin`, set per breakpoint on `.dp-hub`).

### Board rows

Stage lists (`stage:<id>`) draw their tiles as the theme's jury-state board
row (`useBoardRowLook` → `CountryTile` `boardRow`): the board's row heights
(`h-8 md:h-9 lg:h-10`, `lg:h-9` when rounded, as in `useItemState`),
`bg-countryItem-juryBg` / `juryCountryText`, the theme's flag shape via
`getFlagPath(country, flagShape, enableMinimalisticFlags)` sized by the
scoreboard's `useFlagClassName`, pill or 3px corners
(`roundedCountryContainer`), uppercase names (`uppercaseEntryName`), the
scoreboard font, and the points box (`pointsContainerShape`; the triangle is
the board's `RoundedTriangle` wedge in front of the box, with a margin
keeping it off the name) holding the menu chevron, or the checkbox while
selecting. The desktop grid keeps 5 columns (`--tmin: 180px`), so the
longest names ("Switzerland", "Montenegro") truncate next to the full-size
flags. Gradient backgrounds go through
`getSpecialBackgroundStyle`. Stage numbers use the place-badge colours. Pool,
"Not qualified" and "To be drawn" tiles stay quiet `dp-tile`s with the heart
flags (`shouldShowHeartFlagIcon`).

`useTileEntrance` plays the staggered entrance with the Web Animations API
(no classes left behind): every row when a grid first mounts, when the
line-up is replaced wholesale, and when the user expands the stage again
(`StageCard` bumps `replayKey`); otherwise only the codes that just arrived.
Its refs make the effect re-run on an `<Activity>` reveal a no-op, so
reopening the setup never replays it. Reduced motion skips it. Every tile
gets its own delay (30ms steps, tightened on long stages so the last one
starts by 600ms); grids remounted by the drag-and-drop swap skip it (§3).

### Fitted layouts

The header and the contest card choose their layout with `useFitStep`
(`src/hooks/useFitStep.ts`): an ordered list of steps (`{ layout: 'row',
tools: 'all', … }`), each written as `data-*` attributes, and the hook picks
the first step at which the element has no horizontal overflow. It measures
by setting each step's attributes plus `data-fit-measuring` (CSS gives every
item its natural width then), reading `scrollWidth`, and restoring React's
attributes, all inside a layout effect, so nothing flashes. It re-measures
after each render of the host, on width changes, on text changes inside
(MutationObserver) and when fonts load.

- Header (`HEADER_STEPS`): one row → combos on the first row with the rest
  stretched across the second → the same with the profile button reduced to
  the avatar.
- Contest card (`CARD_STEPS`, measured on the padding-free `.dp-cc-layout`
  inside the card): one row → short draw label → buttons under the title →
  Reset / Reorder / Add stage into ⋯ → Select without its label → the draw
  toggle into ⋯. Save keeps its label.
- Library row (`LIBRARY_STEPS`, phones only): small icons before the titles →
  above them. It passes `targets: '.dp-lib-head'`, since a title overflowing
  its own grid cell never reaches the row's edge.

`scrollWidth` stops at the padding box, so measure an element without
horizontal padding (that is why the contest card measures an inner
wrapper). Decorations that may poke out carry `dp-fit-ignore` (hidden while
measuring), e.g. the winter snow pile on Save.

The CSS for each step lives next to the component's rules in `styles.css`
("Fitted layouts"). A measuring rule must beat the layout rules
(`!important`), or the shrinkable items squeeze and every step "fits".

`Button` gained variants `cta`, `surface`, `surfaceStrong`, `ghost` and a
`size` prop (`sm|md|lg|xl` = 34/40/46/54px) so the accent CTA and the filled
surfaces can be reused elsewhere. `Modal` accepts `unstyledSurface` to skip its
default gradient. Do not hardcode a font on these surfaces: they inherit the
app's `--dp-font-family` slot.

`Modal` also accepts `fullScreenOnPhone`. Below `2cols` the box stretches to the
overlay, which is always exactly the visible viewport (browser bars, PWA mode),
instead of relying on `vh` math that never matched the screen. The setup modal
and the other screen-like modals (Settings, Themes, Contests, Profile,
leaderboards, stats, share, theme editor, font picker, post-setup, voting
predefinition) use it; short dialogs stay centred. The app runs with
`viewport-fit=cover`, so the full-screen box pads its top by
`env(safe-area-inset-top)` and exposes `--modal-safe-bottom` (the
`--safe-bottom-bar` inset, trimmed on iOS; docs/native-apps.md §4). The iOS status
bar is the opaque `default` style tinted from `theme-color`, which
`useStatusBarThemeColor` keeps on the active theme's `--p-900`:
`black-translucent` gets an iOS 26 Liquid Glass blur band under the status bar
and a standalone viewport that ends short of the bottom by the top inset
(WebKit bug 301108).

Modal footers follow the setup footer: `lg` (46px) ghost Close/Cancel and an
`lg` `cta` primary action that takes the remaining width; `xl` stays reserved
for the setup modal's Start. **A footer passed as `bottomContent` to a full-screen
modal must add `var(--modal-safe-bottom, 0px)` to its bottom padding** (see
`SetupFooter`, `ModalBottomContent`, `ModalBottomCloseButton`), or its buttons
end up under the iOS home indicator / Android gesture bar. Full-page surfaces
outside modals use the plain `.safe-area-padding` class (`#main`, About,
Privacy).

### Breakpoints

Tailwind arbitrary `max-[…]:` variants are **not** generated in this project
(the fluid-tailwind extractor drops them). Write phone-first and add
`2cols:` (576px) for the wider layout, e.g. `grid-cols-1 2cols:grid-cols-3`.

## 2. Lineup data flow

```
useCountryAssignments()  ──►  useLineupModel()  ──►  <LineupProvider>
 (eventAssignments map)        stable code[] per       model + stable actions
                               list, byCode Map        (move, open menus, …)
                                                          │
             StageList ─ StageCard ─ TileGrid ─ Tile ◄────┤
             CountryPool ─ PoolCategory ─ CustomGroupSection ─ TileGrid
             SelectionTray, LineupMenus (one AnchoredMenu for all menus)
```

- **Lists are identified by `ListId`** (`hub/lineup/listIds.ts`): `stage:<id>`,
  `group:NOT_QUALIFIED`, `pool`, `pool:<category>`,
  `pool:Custom:<groupId|__ungrouped__>`. Drop-zone ids are the same strings.
- **Tiles render from `codes: string[]` + `model.byCode`**, and
  `useLineupModel` keeps unchanged code arrays referentially stable, so moving
  one country re-renders only the source and target lists.
- **Transient UI state** (selection mode + selected set, expanded pool lists,
  pool open, search, the active menu, drag state) lives in
  `hub/state/setupUiStore.ts` (zustand, not persisted; `resetUi()` on close).
  Stage cards (`isStageCardList`: stages, "Not qualified", "To be drawn") are
  the exception: `setExpanded` / `toggleExpanded` route them to
  `hub/state/stageAccordionStore.ts`, persisted in localStorage
  (`stage-accordion-storage`) and scoped to the contest
  (`activeContest._id` or `getContestKey(year, contestType)`, set by
  `EventSetupModal`). Collapsed stages stay collapsed across closes and
  reloads; switching to another contest opens them all again.
  Tiles subscribe with `s => s.selected.has(code)`. **Keep DOM nodes and
  React elements out of this state**: the store uses the devtools middleware
  in development, which serializes the whole state on every action, and a
  React-owned element drags the full fiber tree (~20k objects) through the
  Redux DevTools serializer. That is why `openMenu(menu, anchor)` stores the
  anchor element in a module variable read via `getMenuAnchor()`, and
  `activeMenu` holds only plain data.
- **Menus**: `LineupMenus` builds the entries for the tile "Move to", the
  header count pill "Move all to…" and the tray "Move to…" from
  `setupUiStore.activeMenu`, and renders a single
  `src/components/common/AnchoredMenu.tsx` (portal, viewport flip, keyboard,
  outside/scroll close, no entrance animation so it opens on the click).
  Custom-entry extras (regroup, edit, bulk delete) are added when every
  selected code is a custom entry; the Custom category header's "Move all"
  deliberately offers no regroup (it would move every folder's entries).
- **Collapsible headers** (stages, pool, categories, groups) toggle on a click
  anywhere in the header row except on their own controls
  (`hub/lineup/headerToggle.ts`). Stages start expanded (until the user
  collapses one, see above); the pool, every pool
  category (Custom included) and every custom group ("No group" included)
  start collapsed. `toggleExpanded(listId, defaultExpanded)` takes the list's
  default so the first toggle of a list without explicit state flips what is
  on screen.
- **Move semantics**: `LineupProvider.move(codes, group)` assigns, expands the
  target list (and opens the pool when returning countries), and toasts.
  Countries return to their own category (`country.category`), so no "home"
  field is needed. `stage.runningOrder` is never touched by a move.
- **Search** (`useLineupSearch`) is deferred and yields one `matches` set; a
  list with a hit renders expanded regardless of its toggle.
- **GF-only** mode adds a stage-styled "Not qualified" card
  (`CountryAssignmentGroup.NOT_QUALIFIED`) below the final.

## 3. Drag-and-drop

`@dnd-kit/core` is loaded lazily by `hub/lineup/dnd/LineupDndBoundary.tsx`
(its own chunk). Until it arrives the lineup renders plain tiles; the
implementation (`LineupDndProvider.tsx`) swaps draggable tiles / droppable
zones in through `DndComponentsContext`, so the lineup never imports dnd-kit.

That swap remounts the whole lineup (new wrapper, new tile and zone types).
So the boundary waits until no tile entrance is playing
(`afterTileEntrances`), and it sets `DndSwapContext` during its commit, which
makes the remounted grids skip the entrance. Without both, a reload showed the
entrance start, every tile vanish, and the entrance start over.

Sensors: mouse needs 6px of travel, touch a 250ms hold — a plain click or tap
still opens the tile menu (`onClickCapture` suppresses the click that follows a
completed drag). The `DragOverlay` is portaled to `document.body`: the modal
box carries a `transform`, which would otherwise become the containing block of
the overlay's `position: fixed` and offset the dragged tile from the pointer. Collision picks the innermost zone (custom group > category >
pool root). Hovering a collapsed zone for 600ms expands it. Dragging a selected
tile in selection mode moves the whole selection; dropping on a custom group
also regroups the entries.

## 4. "Unsaved changes"

`generalStore.loadedContestFingerprint` holds the fingerprint of the setup as
last loaded from / saved to `activeContest`. `markContestSetupClean()`
(`src/helpers/contestFingerprint.ts`) is called after a snapshot is applied
(`EventSetupModal.handleConfirmLoadContest`, `CreateContestModal` save) and
the field is cleared by `setYear` / `setActiveContest(null)`.
`useContestDirtyState()` recomputes the fingerprint from the stores (deferred)
and the badge shows only while a saved contest is active and the two differ.
The fingerprint covers the snapshot `setup` section (stages sorted by order,
odds sorted by code, points systems) plus contest name/description/year/host;
simulation state and the chosen theme are excluded.

## 5. Sync theme to contest year

`settings.syncThemeWithContest` (default on, synced to the account) makes a
contest-year change apply that year's theme via
`applyThemeForContestYear()` in `src/theme/syncThemeToContest.ts`. Toggling on
applies immediately; picking a theme by hand while it is on switches it off
(toast). Years without a built-in theme are a no-op.

## 6. Keeping the hub mounted

The setup is reopened from the board all the time, so `EventSetupModal`
passes `keepMounted` to `Modal`: after the first open, the content stays
mounted inside `<Activity mode="hidden">` while closed (React keeps the DOM
and state, disconnects effects and renders updates at idle priority). In a
4x-throttled development build, reopening went from ~350ms to show (~250ms
of long tasks rebuilding stages, tiles and drag-and-drop) to ~220ms (~165ms,
mostly effects reconnecting and layout). `Activity` comes from the React
canary bundled with Next.js; `src/types/react-activity.d.ts` declares it
until @types/react catches up, and Vitest's plain React has no `Activity`, so
tests must not render a `keepMounted` modal.

While hidden, the hub still receives store updates (at idle priority), so
keep its selectors narrow: e.g. `useContestField` reads
`eventStages.length > 0`, not `eventStages`, which changes on every vote.

## 7. Widget stats

`GET /profiles/me/summary` (backend `src/profile-summary/`) returns followers,
following, custom/saved themes, private/public contests and published /
public / saved designs in one call; `useMyProfileSummaryQuery` feeds the
three library buttons (Themes, Contests, Graphics) and the followers line of
the header's `ProfileButton` (which replaced the Profile widget on
2026-10-06). From `md` the buttons show two counts ("6 private, 3 public");
below `md` one (`shortStat`: custom themes, all contests, local designs).
Signed out they show just their names. The query is invalidated by follow, theme, contest and design
visibility mutations and cleared on logout.
