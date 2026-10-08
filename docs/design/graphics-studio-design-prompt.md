# Design brief: Graphics studio

## Context

DouzePoints is a Eurovision Song Contest scoreboard simulator. Users set up a
contest in the **Event Setup modal** (the "Hub" you designed earlier), run
the voting on an animated scoreboard, and share the outcome as images. You
designed the Hub and the Allocation draw; both are in production. Attached:
screenshots of the production Hub and scoreboard, the three current share
modals (results, running order, stats) with the images they produce,
`DESIGN_SYSTEM.md`, `tokens.css`, and the phone screenshots.

What sharing looks like today:

- **Share results** (scoreboard header → Share): a full-screen modal with a
  collapsible **Customization** form (title, subtitle, aspect ratio
  1200×630 / 800×800 / 750×1000, columns, row size, max countries, five
  pixel inputs for font sizes and padding, four checkboxes), a live
  **Preview**, a **Generate image** button, then the **Result** with
  Download and Share. Reset restores sensible defaults.
- **Share running order** (Post-setup modal → Running order tab) is the same
  modal with the rows in running order and no points.
- **Share stats** (Final stats → Share): title, border and background
  opacity, "generate on open"; the image is content-sized around one of the
  three stats tables (Breakdown matrix, Split, Summary).

Every image is: title, subtitle, a grid of country rows, the
"DouzePoints.app" branding line, on the active theme's background. Rows are
the app's real scoreboard rows, so they follow the active theme (2026 is
rounded pills with a place number bubble and a heart flag; older themes are
rectangular with a points block on the right). Users already customise the
scoreboard look through **custom themes** (colours, flag shape, points shape,
fonts from a font library) and can publish, like, save and remix themes in a
public gallery.

## The feature

Turn the fixed-form generator into a **small design studio**: a free-form
canvas where users move, resize, rotate, add and remove elements, change
colours, fonts and other properties, add their own images, and bind
scoreboard elements to data (the live scoreboard, a saved contest, or a
manually typed list). **Templates** keep the simple path simple: a template
is a design with a few fields exposed as a form, which is exactly what the
current share modals are. Templates can be published, reused and remixed
like themes. Think Canva, scoped to Eurovision graphics.

The engine exists already (DOM-rendered elements, deterministic export, zod
document). This brief is about the product surface on top of it.

### Element types (v1)

| type | properties the inspector exposes |
|---|---|
| Text | text, font (UI font / scoreboard font / font library), size, weight, colour, align, uppercase, shadow, line height |
| Image | upload / URL / contest logo / theme background, fit (cover/contain), corner radius, mask (none / circle / heart) |
| Shape | rect / ellipse, fill (solid / gradient / theme surface), radius, stroke, shadow |
| Flag | country, shape (rect / round / heart) |
| Scoreboard | data source, columns, row size, show points, show rankings, short names, row limit, status (live colours / uniform), row style overrides (later) |
| Stats | table type (Breakdown / Split / Summary), vote type |
| Branding | size (cannot be deleted; can be moved and resized) |
| Stack (group) | direction, gap, padding, alignment; children edited inside |

Common to all: position, size, rotation, opacity, lock, hide, z-order.

### Data sources

- **Live scoreboard** (the stage on screen, same sort as the board).
- **Saved contest**: the user's or any public contest, choose a stage.
- **Manual**: a small editable table (country, points, flag), with custom
  entries allowed.

Switching the source re-binds every scoreboard/stats element at once.

### Templates

- **Built-in**: Results, Running order, Qualifiers (26 names in three
  columns, like a broadcast "all qualifiers" card), Announcement poster
  (slogan, logo, host city, dates), Stats. Each has 2–5 exposed fields.
- **Community**: anyone can publish a design as a template, choosing which
  fields to expose. Gallery with search, sort (newest / most used), filters,
  likes, saves, "Use template" (clones into My designs, keeps a "remixed
  from" credit).
- Using a template shows **only its fields as a form** plus the preview and
  Generate, so a first-time user never sees the canvas unless they press
  **Open in editor**.

## The design problems

1. **Two audiences, one feature.** Most users want the current two-click
   share. A minority wants a real editor. The simple path must stay as short
   as today (open → generate → download), and the editor must be reachable
   from it in one step without the simple path getting heavier.
2. **A free-form canvas on a phone.** The app is phone-first (most users are
   on phones). Precision dragging is not realistic there. Phones need a
   usable *tap-to-select, edit in a sheet* mode, and the simple path must be
   complete on a phone. Desktop (≥ 1024) gets the full editor.
3. **Data-bound elements are not like Canva's.** A scoreboard element changes
   height with the number of rows and the row size; a stats table decides
   its own width. The editor must make "this element sizes itself" obvious
   and not fight it (show the bound size, offer "fit canvas", don't let
   handles promise a resize that the content will override).
4. **Theme coupling.** Rows take their look from the active theme. The editor
   should say so and link to the theme editor rather than duplicate it; a
   later phase will let designs carry row style overrides. Design the
   inspector so a "Row style" section can be added without re-layout.
5. **Discoverability of templates.** Templates are the growth loop (users make
   graphics for their communities and share them). The gallery needs to feel
   like the Themes and Contests galleries users already know.

## Proposed flow

Validate it, improve it, and push back where something would confuse users.

### 1. Entry points

- **Share results / Share running order / Share stats** keep their modals.
  Replace the long Customization form with the template's few fields
  (title, subtitle, size, columns, rows) and add **Open in editor** next to
  Generate. The current pixel inputs (font sizes, paddings) move into the
  editor's inspector.
- A **Graphics** widget in the Hub, next to Profile / Themes / Contests
  (`dp-widget`, pick a fourth tone): "My designs · Templates". Opens the
  Graphics modal.
- Share dialogs of a saved contest and the profile page may later show
  "Make a graphic", not in scope now.

### 2. Graphics modal (gallery)

Full-screen modal like Themes / Contests, with tabs:

- **My designs**: cards (thumbnail, name, canvas size, data source chip,
  updated time), New blank design, Duplicate, Rename, Delete, Publish as
  template.
- **Templates**: Built-in section first, then Community with search, sort,
  filters (size, has scoreboard, has stats), like / save counts, creator.
  "Use template" → a **template sheet** (fields + preview + Generate /
  Download / Share / Open in editor).
- **Saved** (templates the user saved).

Unsigned users can use built-in templates and edit locally (drafts in the
browser); publishing and cloud saving ask them to sign in.

### 3. Editor (desktop)

Full-screen modal, three columns:

- **Left rail** (56–72 px): Add element (text, image, shape, flag,
  scoreboard, stats), Templates, Layers, Data. Each opens a panel next to
  the rail.
- **Centre stage**: the canvas on a neutral dark surface, zoom-to-fit by
  default, zoom chips (fit / 50 / 100), rulers optional. Selection box with
  8 handles and a rotate knob, snap guides to canvas centre/edges and
  sibling edges, alignment distance hints. Multi-select with Shift.
- **Right inspector** (300–340 px): the selected element's properties, in
  sections (Layout, Style, Content, Data) with the common fields
  (x/y/w/h/rotation/opacity/lock) collapsed by default. Nothing selected →
  canvas properties (size presets + custom, background layers, data source
  summary).
- **Top bar**: name (editable), Undo/Redo, data source chip ("Live · Grand
  Final"), canvas size chip, **Export** (format PNG/JPEG, 1×/2×/3×,
  Download / Share / Copy), **Save**, Close.
- **Layers panel**: ordered list with eye/lock, drag to reorder, groups
  expandable.
- Keyboard: arrows nudge, Shift ×10, ⌘Z/⇧⌘Z, ⌘D, Delete, [ ] z-order, Esc.

### 4. Editor (phone)

- Stage fills the width; pinch to zoom; tap selects; a bottom **sheet** with
  the inspector for the selected element (sections as segmented tabs).
- Moving: drag with one finger after selection (coarse), plus arrow nudge
  buttons in the sheet for precision. Resize/rotate through numeric fields
  and ± steppers, not handles.
- Add element and Layers live in the sheet's "+" and "Layers" actions.
- Export is one button; result shows as the current modals do.

### 5. Data panel

- Source switcher: Live / Saved contest / Manual. Saved contest shows a
  picker (mine, public, search) and a stage dropdown. Manual shows an
  editable table with Add row, flag picker, import from live.
- A note under the switcher: "Scoreboard and stats elements use this data."

### 6. Publish as template

A short sheet: name, description, visibility, **Exposed fields** (checkbox
list of the design's editable values, grouped by element, with a label each
— pre-ticked: text contents, data source), preview of the resulting form,
Publish. Published templates show a "remixed from" credit when they were
made from another template.

## States to design

Desktop is 1280 wide and phone 375, unless noted.

1. Share results modal, new version: template fields + preview + Generate,
   with **Open in editor**. Desktop and phone.
2. Hub with the Graphics widget.
3. Graphics modal: My designs (with cards and empty state), Templates
   (built-in + community, with filters), Saved.
4. Template sheet (fields + preview + actions). Desktop and phone.
5. Editor, desktop: a text element selected; a scoreboard element selected
   (showing the "sizes to content" hint); nothing selected (canvas
   properties); Layers panel open; Data panel open on Saved contest; the
   Export popover.
6. Editor, phone: stage with a selected element and the bottom sheet (Style
   tab); the "+" add sheet; Layers; Export result.
7. Snap guides mid-drag; multi-select; a rotated element with the knob.
8. Publish as template sheet, before and after choosing fields.
9. Sign-in prompt when saving to the cloud or publishing.
10. Errors: export failed (one retry already happened) with "Try again" /
    "Try the other engine"; an image too large to upload; a template whose
    data source is a contest the viewer can't access (fallback to live /
    manual).
11. Empty states: no designs yet; no community templates match.

## Constraints

- **Palette:** use the design system and tokens (`--p-950…--p-700`,
  `--accent`, `--accent-2`, `--gold`, ink and hair tokens). The stage
  background must stay neutral so the user's design reads true; check the
  editor at hue 300, the 2026 gold theme and a light custom theme.
- **Reuse components:** modal shell (`fullScreenOnPhone`, footer pattern
  with ghost Close and `cta` primary), `dp-widget`, `dp-act` filled buttons,
  `dp-menu` anchored menus, `dp-count-pill`, `dp-badge-pill`, the gallery
  card pattern from Themes / Contests, the `Select`/`Input`/`Checkbox`
  controls, the colour picker and gradient picker already used in the theme
  editor, the font picker from the font library.
- **Layout:** phone-first with breakpoints at 576px (`2cols`) and 1024px
  (desktop editor). No horizontal page scroll.
- **Font:** never hardcode a font; surfaces inherit the app's font slot.
- **Canvas truth:** the stage is the real DOM that gets exported; chrome
  (handles, guides, labels) must sit outside the exported node. Zoom is a
  CSS scale; handles keep constant pixel size.
- **Motion:** minimal. Panels slide, menus open instantly, selection changes
  are immediate. Respect `prefers-reduced-motion`.
- **Accessibility:** full keyboard operation on desktop (Tab through
  elements, arrows nudge, Enter edits text), visible focus on handles, 4.5:1
  text contrast in chrome, labels on every icon button, a live region for
  "Image generated".
- **Copy:** "Design", "Template", "Element", "Canvas", "Data source",
  "Publish as template", "Open in editor", "Use template". Avoid "layer" in
  user-facing text except for the Layers panel title, and avoid
  "artboard", "asset", "binding".

## Data for the prototype

- Eurovision 2026 Grand Final, 26 rows, with points (any plausible numbers).
- Semi-Final 1 running order, 15 rows, no points.
- A Breakdown stats matrix, 15×15.
- A custom contest "Nordic Vision 2027" with 8 entries and two custom flags.
- Built-in templates: Results (1200×630), Running order (1200×630),
  Qualifiers (1920×1080, three columns of pill rows with heart flags),
  Announcement poster (1080×1350: slogan, contest logo, host city, dates),
  Stats (content-sized).
- Community templates: six, with creators, likes, saves and one "remixed
  from" credit.

## Deliverables

1. **An interactive HTML prototype**, in the same style as the Hub prototype:
   the share modal with Open in editor, the Graphics modal, the template
   sheet, and the editor on desktop and phone. Explore up to two directions
   for the editor's desktop layout (for example "rail + inspector" and
   "floating toolbar + bottom properties") and one for the phone. The stage
   can use static mock renders of the scoreboard rows.
2. **Screenshots** of every state listed above, at 1280 and 375.
3. **A handoff README** like the previous ones: measurements and tokens,
   final copy, which existing component each new piece extends, the
   inspector field order per element type, and the phone sheet behaviour.
4. **A first-time-user walkthrough** for two people: one who only wants to
   share results on a phone, and one who wants to make a "qualifiers" card
   from a saved contest and publish it as a template. Where could each get
   stuck, and how does the design prevent it? Call out any part of this
   brief you believe hurts clarity, and what you'd do instead.
