# DouzePoints Design System

> v1.0 — June 2026. This is a living document. Update it when a new pattern is established in production or a new design session introduces a new token or component.

---

## 1. Philosophy

DouzePoints is a dark, jewel-toned scoreboard simulator with a strong Eurovision personality. The design language is **cinematic, night-time, and communal** — it feels like watching a live broadcast with other fans.

Three principles guide every decision:

1. **The scoreboard is the product.** Every modal, card, and widget exists to serve the scoreboard. UI chrome should be dark and recessive; the scoreboard art should be vivid.
2. **Themed surfaces, not themed icons.** User-created themes manifest in gradient card backgrounds and an accent color — not in random splash colors elsewhere. The modal chrome always reads as "the same app" regardless of which theme is active.
3. **Social, not transactional.** Counts (likes, saves, copies) surface prominently. Creators get visible credit. Actions are weighted: one clear primary, then restrained icon buttons, then an overflow menu.

---

## 2. Color

### Dynamic palette (OKLCH)

The full dark palette and accent color are derived from a single CSS variable `--prim-hue` (0–360°) that is updated via JS when a theme is applied. This ensures every hue looks equally vivid at every background lightness — something HSL cannot guarantee.

```
--p-950  oklch( 8%  0.06  H)   deepest background, behind modals
--p-900  oklch(12%  0.09  H)   modal background
--p-800  oklch(17%  0.11  H)   card surface
--p-750  oklch(21%  0.13  H)   elevated surface, active tab
--p-700  oklch(25%  0.14  H)   avatar background, raised elements

--accent  oklch(65%  0.28  H+55°)   primary accent — always vivid, readable
--accent-2 oklch(60%  0.22  H−40°)  secondary accent — calmer
```

Default hue: **300** (deep purple, the DouzePoints brand hue).

### Applying a theme color from JS

```ts
import { oklch } from 'culori'; // or any OKLCH-capable library

function applyThemeColors(interfaceColorHex: string) {
  const { h = 300 } = oklch(interfaceColorHex) ?? {};
  document.documentElement.style.setProperty(
    '--prim-hue',
    String(Math.round(h)),
  );
}
```

### Ink (text on dark surfaces)

| Token      | Alpha | Use                                       |
| ---------- | ----- | ----------------------------------------- |
| `--ink`    | 100%  | Headlines, primary labels, active icons   |
| `--ink-70` | 72%   | Body text, badge labels                   |
| `--ink-55` | 55%   | Secondary labels, handles, inactive tabs  |
| `--ink-40` | 40%   | Dates, placeholder text, decorative icons |
| `--ink-25` | 25%   | Disabled states, very subtle dividers     |

### Borders

- `--hair` (10% white) — standard card/input border
- `--hair-2` (16% white) — slightly elevated borders (active inputs, follow button)

### Semantic badge colors

Eight pre-defined tint sets (bg / border / ink): **purple** (points system), **pink** (theme), **amber** (custom entries), **green** (in progress), **red** (not started), **gold** (winner trophy), **violet** (special), **default** (neutral metadata). See `tokens.css`.

### Per-theme card tint

Each custom theme card carries its own CSS variables (`--t-a`, `--t-b`, `--t-bd`, `--t-acc`, `--t-acc-d`, `--t-acc-ink`) set inline. The gradient from `--t-a` → `--t-b` is the card background; `--t-acc` is the accent and the active state color on that card. Contest cards always use the default night palette.

---

## 3. Typography

**Font:** Plus Jakarta Sans (Google Fonts) — a geometric sans with strong weights and good tabular numerals.

```
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500&display=swap');
font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
```

### Scale

| Token         | Size      | Weight  | Use                                            |
| ------------- | --------- | ------- | ---------------------------------------------- |
| `--text-2xs`  | 10px      | 800     | Section labels, code captions                  |
| `--text-xs`   | 11px      | 700–800 | Kickers, badge labels, toggle text             |
| `--text-sm`   | 12–12.5px | 600–700 | Date, handle, tooltip, small count             |
| `--text-md`   | 13.5px    | 600     | Body text, badge text, description             |
| `--text-base` | 14–14.5px | 700–800 | Buttons, creator name, action labels           |
| `--text-lg`   | 15px      | 700     | Tab labels, search input, filter section heads |
| `--text-xl`   | 18px      | 800     | Found-count heading                            |
| `--text-2xl`  | 19–21px   | 800     | Card title                                     |
| `--text-3xl`  | 27–32px   | 800     | Modal-level headings                           |

Always use `letter-spacing: -.01em` to `-.025em` on extrabold headings. Use `text-wrap: pretty` on multiline body text.

---

## 4. Spacing

4px base grid. Key values: 4 · 6 · 8 · 9 · 10 · 12 · 14 · 16 · 18 · 22 · 24. Prefer `gap` on flex/grid containers over per-element margins.

---

## 5. Border Radius

| Token      | Value | Use                                         |
| ---------- | ----- | ------------------------------------------- |
| `--r-full` | 999px | Pills (badges, Follow button, filter chips) |
| `--r-card` | 18px  | List cards (ThemeCard, ContestCard)         |
| `--r-lg`   | 14px  | Modal container, tab strip                  |
| `--r-md`   | 12px  | Inputs, Create button, status panels        |
| `--r-sm`   | 9px   | Small icon chips                            |
| `--r-xs`   | 7px   | Toggle items, menu rows                     |

---

## 6. Elevation / Shadows

| Token              | Use                                           |
| ------------------ | --------------------------------------------- |
| `--shadow-card`    | `0 10px 30px rgba(0,0,0,.32)` — list cards    |
| `--shadow-modal`   | `0 20px 60px rgba(0,0,0,.50)` — modal window  |
| `--shadow-menu`    | `0 16px 40px rgba(0,0,0,.55)` — overflow menu |
| `--shadow-btn`     | primary button (fill + top highlight inset)   |
| `--shadow-preview` | scoreboard preview panel                      |

Inset highlights: cards and elevated surfaces use `inset 0 1px 0 rgba(255,255,255,.08)` as a top-edge shimmer.

---

## 7. Components

### Button hierarchy

1. **Primary** — filled with `linear-gradient(180deg, var(--t-acc), var(--t-acc-d))`. One per action group. `font-weight: 800; text-transform: uppercase; letter-spacing: .02em`. Height 44px, `border-radius: var(--r-xs)`.
2. **Icon button** — `44×44px` (or `44px × auto` with padding for count). `background: rgba(255,255,255,.06); border: 1px solid var(--hair)`. Always paired with a **hover tooltip** for icon-only variants.
3. **⋯ Overflow menu** — `44×44px`, same surface as icon button. Consolidates rare actions: Duplicate · Copy link · Share · Quick select · Report / Delete. Opens above the trigger.
4. **Follow / pill button** — `border-radius: 999px; padding: 6–8px 11–14px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em`. Ghost style when "Following".
5. **Create** — `height: 46px; padding: 0 18px; font-weight: 700; background: gradient(p-750→p-800)`.

### Tooltip

Appears **above** the trigger, centred. 100ms delay on hover. `background: #0c0714; border: 1px solid var(--hair-2); border-radius: 7px; padding: 6px 10px; font-size: 12px; font-weight: 600`. Down-pointing caret via CSS border trick.

### Modal shell

Three-zone layout: chrome (tabs + search + filters) / scrollable body / footer (pagination or close). Background is a two-radial-gradient + linear dark base. Body scrolls independently; chrome and footer are `position: sticky`.

### Pill tab strip

Container: `background: rgba(0,0,0,.25); border: 1px solid var(--hair); padding: 5px; border-radius: 14px`. Active tab: gradient `p-700→p-800` with inset top highlight.

### Filter chip row

Each row prefixed by a faint icon (filter / calendar). Pills: `padding: 7px 14px; border-radius: 999px`. Active: hot-pink gradient with glow. Single-select per row.

### Badges

Pill-shaped. Semantic colour sets (purple/pink/amber/green/red/gold). Always `display: inline-flex; align-items: center; gap: 6px` with a leading icon.

### Scoreboard preview

A standalone component that renders a single scoreboard entry + jury points row in the theme's own colours. It reads the theme's CSS variables from its parent card. State (Jury/Televote/Active/Finished/Unqualified) is controlled by the state toggles below it.

### State toggles

Segmented control (`flex-wrap: nowrap` inside a card column). Active segment filled with `var(--t-acc)`.

### Compact creator row

`Avatar (30px) + name/handle block + Follow button`. Max-width constrained to prevent stretching; name truncates with ellipsis.

---

## 8. Motion

- Standard transition: `0.2s ease` for color/background/border-color changes
- Fast transition: `0.16s ease` for button hover, toggle active
- Menu: fade in `opacity 0→1` over `0.14s`
- Tooltip: `opacity + translateY(-2px)` over `0.15s`
- Avoid infinite decorative animations on list content (accessibility: `prefers-reduced-motion`)

---

## 9. Icons

**Lucide** icon set. Stroke-width **1.7**, 20×20 viewBox. Render as inline SVG. Scale with `width`/`height` props. Never rasterise.

Common icons: `palette`, `trophy`, `thumbs-up`, `bookmark`, `copy`, `share-2`, `more-horizontal`, `plus`, `check`, `search`, `filter`, `calendar`, `mic`, `map-pin`, `list`, `users`, `user-cog`, `user-star`, `circle-dashed`, `loader-2`, `pencil`, `trash-2`, `link`, `flag`, `pin`, `bar-chart-2`, `chevron-down`, `x`.

---

## 10. Design Principles for Claude Design

When asking Claude Design to work on a new part of the app, include this system doc and `tokens.css`. Then say:

> "Follow the DouzePoints design system. Use only the tokens defined in `design-system/tokens.css`. The dark palette is OKLCH-derived from `--prim-hue`. Accent is `--prim-hue + 55°`. Typography is Plus Jakarta Sans. All components should read as dark, jewel-toned, cinematic. The scoreboard is the hero — chrome is always recessive."

The design files in `design_handoff_*/` are the reference implementation.

---

## 11. File Map

```
design-system/
  tokens.css           ← import at app root; all CSS custom properties
  DESIGN_SYSTEM.md     ← this file

design_handoff_widgets_modal/
  README.md            ← full spec for themes & contests modals
  styles.css           ← component-level CSS (reference)
  directions-themes.jsx
  directions-contests.jsx
  chrome.jsx
  mockup-kit.jsx
  Themes and Contests Redesign.html   ← open in browser to explore
```
