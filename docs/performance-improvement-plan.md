# Performance: runtime-smoothness findings and phased improvement plan

Date: 2026-08-29. Companion to [mobile-performance-investigation.md](./mobile-performance-investigation.md)
(that doc covers the load path; this one covers in-use smoothness — the priority — and
lays out the execution plan). Raw traces in `../../perf-artifacts/`; re-analyze any of
them with `node scripts/perf/analyze-trace.mjs <trace>`.

Priorities this plan optimizes for, in order: **simulation smoothness (mobile first)**,
setup/theme/browsing responsiveness, then load metrics. Constraint: the voting/animation
choreography is intricate and must not change behavior — phases below are designed so
that timing constants, sequencing, and store semantics stay identical while the
*delivery mechanism* gets cheaper.

## Part A — Runtime investigation

### Method

Same environment as part 1 (production preview at `localhost:8787`, Chrome 151
DevTools MCP). New measurements:

- `trace-autorun-mobile.json.gz` — 97 s, mobile emulation (390x844x3, 4x CPU,
  Slow 4G): full Semi-Final 1 auto-run ("finish randomly" through jury + televote to
  the qualifiers reveal).
- `trace-autorun-desktop.json.gz` — 69 s, desktop (1440x900x1, no throttle):
  same flow on Semi-Final 2.
- `trace-interaction.json.gz` (from part 1) — manual voting, one click per point.
- An in-page microbenchmark of the theme CSS-variable injection path.
- Backend (`douze-points-backend`, local :8001 against Atlas) was running; public
  themes/contests browsing loads but the DB has no public content, so list/scroll
  performance is **unprofiled** (see §A7).

### A1. The felt lag is concentrated in phase transitions — confirmed on both platforms

The worst seconds of the mobile auto-run drop to **2–6 fps**:

| Moment | Task size | Evidence (mobile 4x) |
|---|---|---|
| Start stage → board mounts | 244 + **386** + 256 ms back-to-back | interaction trace @40.6s |
| Jury phase ends → televote UI | **214 ms** commit, 6 fps second | autorun trace t=22s |
| Televote finish → reveal/results | **407 ms** commit, 2 fps second, 89% busy | autorun trace t=70s |

All three big tasks attribute to the React framework chunk (render + commit of a large
subtree in one shot). Desktop shows the same shape, smaller: one 108 ms task and a
13 fps dip at the same transition. This matches the subjective "laggy, especially the
simulation" — the stalls land exactly at the dramatic moments. INP 475 ms (pointerdown,
372 ms presentation delay) from part 1 is the same phenomenon on the manual-vote path.

### A2. During sequences the main thread is saturated but (just) keeping up

Windowed analysis of the 97 s mobile auto-run: in animation windows the median fps is
**50–60 even at 4x CPU** — but busy sits at 50–100%, i.e. **zero headroom**; any extra
work (GC, a douze-points overlay, a weaker phone) turns into dropped frames. Totals over
the trace: style recalc **4,858 ms across 2,871 recalcs** (~27/s sustained), paint
2,079 ms across 8,731 paints, 19,297 small `FunctionCall`s totalling 2.2 s, 22,506
`UpdateLayer` events. Layout is a non-issue (90 ms total) — the animations correctly
use transform/opacity. The cost is *churn*, not geometry.

### A3. Why the churn: the animation pipeline routes per-frame state through React at board scope

Verified by source reading, consistent with the trace shape:

- The teleport choreography in
  [useBoardAnimations.ts:304-391](../src/components/board/hooks/useBoardAnimations.ts#L304-L391)
  uses a GSAP timeline purely as a scheduler for `timeline.call(...)` callbacks that
  do `setTeleportStateByCode(...)` — **up to 5 React state updates per moved country
  per cycle**, all landing in `Board`-level state, so each tick re-renders the board
  subtree. The visuals themselves are CSS class flips (`transition-all duration-[400ms]`
  via `getCountryAnimationClassName`,
  [useBoardAnimations.ts:554-583](../src/components/board/hooks/useBoardAnimations.ts#L554-L583)).
- `React.memo(CountryItem)` cannot bail during voting:
  [useCountryDisplay.ts:15](../src/components/board/hooks/useCountryDisplay.ts#L15)
  subscribes to the whole `eventStages` array, and every award recreates the stage's
  `countries` array and objects, so every item's `country` prop is a fresh reference on
  every store update. Board also re-subscribes to `eventStages` directly
  ([Board.tsx:22](../src/components/board/Board.tsx#L22)).
- Every mid-timeline `setDisplayOrder` changes `flipKey`, making `react-flip-toolkit`'s
  `Flipper` re-measure all children (`getBoundingClientRect` reads interleaved with
  React's DOM writes) — the source of the **478 ms of forced reflow** the part-1 trace
  attributed to the gsap/flip chunks, and of the repeated 145–200 ms frames during
  manual voting.
- Toggling `will-change-transform` classes per phase contributes to the 22.5k
  layer-update events (layer creation/destruction churn).

Confidence: high on the mechanism (code + numbers agree); the exact ms split between
React reconciliation, style recalc from class flips, and FLIP measurement inside each
145–200 ms frame is not isolated — Phase 2 should re-profile after each sub-change.

### A4. `.animated-border` burns ~half the (throttled) main thread while completely idle

The infinite conic-gradient border
([styles.css:815-874](../src/styles.css#L815-L874), animating the registered custom
property `--border-angle`, 4 s linear infinite) sits on the "continue"
CTAs — [PhaseActions.tsx:129](../src/components/simulation/PhaseActions.tsx#L129),
[QualificationResultsModal.tsx:170](../src/components/simulation/qualification/QualificationResultsModal.tsx#L170),
[RevealControls.tsx:100](../src/components/simulation/juryScaleReveal/RevealControls.tsx#L100).
Measured: with the results screen just sitting there (`document.getAnimations()` = 2 ×
`bg-spin`, no JS running), the mobile-throttled trace shows **~50% busy at 60 fps —
~115 ms style recalc + ~50 ms paint per second** (autorun trace t=85s, t=101s).
Because `--border-angle` `inherits: true`, each animation frame invalidates style for
the button's subtree, and the two conic-gradient paints repeat at 60 Hz. This runs on
every between-phases screen — prime "the app feels hot/laggy on my phone" material,
and it steals headroom from the reveal animations that run at the same time.

### A5. Theme editing: the mechanism is fine when scoped, expensive at root — picker unverified

`applyCustomTheme` ([themeUtils.ts:213-282](../src/theme/themeUtils.ts#L213-L282))
rewrites a `<style>` tag per call. Measured in the live page (1,035 DOM elements, 4x
CPU): **~1 ms/tick** when the selector matches nothing (the `custom-preview` scoped
path used by the live preview) vs **~29 ms/tick** when it matches the document root
(the applied-theme path, also `--prim-hue` on `<html>`). So applying a theme once is
fine; anything that hits the root path per drag tick would jank badly on mobile.
What I could NOT verify (Google-auth wall): the render cost of
`react-best-gradient-color-picker` during a drag — a known-heavy component and my main
suspect for editor lag. Phase 4 starts by profiling that with a logged-in session.

### A6. Desktop vs mobile summary

| Metric (same auto-run flow) | Mobile 4x CPU, DPR 3 | Desktop 1x, DPR 1 |
|---|---|---|
| Tasks >100 ms | 9 (worst 407 ms) | 1 (worst 108 ms) |
| Worst-second fps | 2 | 13 |
| Style recalc total | 4,858 ms / 97 s | 556 ms / 69 s |
| Paint total | 2,079 ms | 242 ms |
| Idle-with-CTA busy | ~50% | not measured, proportionally ~10–15% |

Desktop is acceptable today; every fix below helps it anyway. Mobile is the design
target — treat "4x CPU + DPR 3" as the reference device.

### A7. Not profiled / suspected only

- **Browsing public themes/contests**: works against the local backend but zero public
  rows in the DB — list rendering, image loading, and scroll behavior unmeasured.
  Needs seeded data or a session against the prod API (Phase 4).
- **Theme editor drag** (auth wall, §A5). **Douze-points hearts grid** (up to 100
  animated SVG hearts) was inside the busy windows but not isolated from the teleport
  cost. **Grand Final televote reveal** and **jury scale reveal** were not traced —
  same architecture, assume same profile until measured.
- The stats modal, share-image generation, and spreadsheet import were not touched.

## Part B — Phased plan

How this addresses the stated priorities: Phases 0–2 are entirely about in-use
smoothness of the simulation (the top concern); Phase 1 also fixes the "tap → wait"
feel of setup. Load metrics (part 1's list) are deliberately parked in Phase 3.
Libraries: nothing needs wholesale replacement for smoothness — GSAP, flip-toolkit,
zustand all stay; the problem is how state flows through them. (Candidates for
*dropping* if Phase 4 measures badly: `react-best-gradient-color-picker`; and the
duplicated `xlsx` chunk regardless.)

**Ground rules for every phase** (this is how we avoid the painful-post-refactor-fix
scenario):

1. Before touching code, re-run the relevant scripted flow and save a "before" trace;
   after, the same flow, same emulation, and compare with `scripts/perf/analyze-trace.mjs`.
2. `yarn lint:types-cli` plus targeted vitest must stay green (global lint/test is
   noisy — see the verification-landscape note in the project memory).
3. Visual parity check for animation work: screen-record the auto-run before/after at
   normal speed and eyeball side-by-side (timings and sequencing must be
   indistinguishable).
4. One phase per PR-sized change set; land or park before starting the next.

### Phase 0 — Cheap wins with outsized smoothness impact (effort: S, risk: low)

**Status: DONE (2026-08-29).** Results, measured against the rebuilt preview:

1. **`.animated-border` rewritten** to a compositor transform: Button gained an
   `animatedBorder` prop that renders an `.animated-border-spin` layer (a clipped,
   rotating conic-gradient square + static interior cover); the three call sites
   (PhaseActions, RevealControls, QualificationResultsModal) use the prop. The old
   `--border-angle` `@property` animation is gone. A/B prototype: paint 444 ms → 0 ms,
   recalc 737 ms → 51 ms per 14 s. Real results screen (two CTAs spinning, @4x):
   idle busy ~50% → **6–15%**, paint 0 ms/s, steady 60 fps
   (`trace-results-idle-fixed.json.gz`). `prefers-reduced-motion` now disables the
   spin. Known small visual delta: the faint interior sheen no longer rotates (border
   sweep unchanged). The 10px/7px radii in the CSS are coupled to Button's
   `rounded-[10px]`.
2. **`PresentationPanel` dynamic import got a height-reserving `loading` skeleton**
   (mirrors the panel's `min-h-[120px]` box). Note: the original CLS 0.34 could not be
   re-reproduced with warm chunk cache (only an 11 px echo of the same pattern —
   content above the panel settling); the skeleton removes the late-mount pop, but a
   cold-cache re-check of transition CLS should happen alongside Phase 1.
3. **A11y: 90 → 100.** Button forwards `aria-label` (falls back to `title` for
   icon-only buttons — this alone fixed all 19 button-name failures, confirming the
   tooltip mode was stripping the only accessible name) and the widget description
   contrast went `text-white/50` → `text-white/75`.
4. Perf scripts checked in at `scripts/perf/analyze-trace.mjs`.

Verification: `yarn lint:types-cli` clean; ESLint clean on changed files; stylelint
adds no new errors (the file has ~96 pre-existing ones); vitest 93/95 — the 2 failures
are pre-existing stale tests unrelated to these changes (`SwitchRow.test.tsx` expects a
`role="switch"` the component never renders; `QualifierTargetsSection.test.tsx` runs
without i18n messages so name queries miss).

### Phase 1 — Phase-transition stalls and tap latency (effort: M, risk: medium-low)

Target: no >150 ms main-thread task at stage start, jury→televote, televote→reveal;
INP <200 ms @4x on voting taps.

1. Split the three big commits (§A1). Techniques, applied per profile rather than
   blanket: `startTransition` for the non-urgent half of the transition (stats
   preparation, next-phase prefetch), mounting the qualification/reveal modals in a
   deferred effect, memoizing `ControlsPanel`/`PresentationPanel` subtrees so the
   transition re-renders the board only.
2. Kill the tap→board chunk waterfalls: preload the simulation chunk batch (gsap,
   board, reveal) with idle-time `import()` during setup, and split
   zod+react-hook-form (270 KB) out of the ПОЧАТИ path
   ([usePostSetupStageForm.ts](../src/components/setup/post-setup/hooks/usePostSetupStageForm.ts)).
3. Re-measure the manual-voting INP; if presentation delay is still >200 ms, the
   remainder belongs to Phase 2 (render fan-out), not more work here.

Nothing in this phase touches choreography or store semantics.

### Phase 2 — Board animation delivery mechanism (effort: L, risk: medium; the big one)

Target: style recalcs during a full auto-run cut ≥3x (2,871 → <1,000 per 97 s
equivalent), no 145–200 ms frames during manual voting, visual parity per ground
rule 3. **The choreography (constants, phase order, queueing, tiebreak-driven
ordering) must not change** — only how phase state reaches the DOM. Read
`theme-animations-and-specifics.md` and `running-order-and-tiebreaking.md` first.
Sub-steps, each independently shippable and re-profiled:

1. **Stop routing per-frame animation state through Board-level React state.** The
   `timeline.call` callbacks in `useBoardAnimations` currently `setTeleportStateByCode`
   (≤5 setStates × moved countries per cycle). Replace with direct class application
   to the item DOM nodes via a `Map<code, HTMLElement>` ref registry — same classes,
   same timing, zero React renders per tick. React state keeps only cycle start/end
   (`displayOrder`, running flag) so the queueing/`votingActions` interplay is
   untouched.
2. **Make `CountryItem` memo effective.** Narrow `useCountryDisplay`'s subscription
   (select the viewed stage's `countries` only), and keep country object references
   stable for untouched countries when `votingActions` writes points (update-in-place
   mapping: reuse the old object when nothing changed). This is a store-adjacent change
   — it must preserve `votingActions` semantics exactly; the existing
   rank/totals/juryScaleReveal unit tests plus a recorded full-run state snapshot are
   the guard.
3. **Tame FLIP re-measurement**: with (1) in place, `flipKey` changes once per cycle
   instead of mid-timeline; verify forced-reflow total during a session drops from
   ~478 ms to near zero, and replace `transition-all` with explicit
   `transition: transform, opacity` on board items.
4. Only if still needed after 1–3: make `will-change` static on board items during a
   stage (layer churn), and isolate the douze-points hearts overlay cost.

### Phase 3 — Load path (effort: M, risk: low-medium)

Execute part 1's mechanical table (preload `Main` chunks / static import, eager-chunk
diet, i18n namespace split, xlsx dedup). Decide *after* Phases 1–2 whether the SSR
shell (the only route to ~2.5 s mobile LCP) is still worth a project-sized effort —
the user cares about metrics least, so default is to stop at ~4.5–5 s LCP from the
mechanical wins.

### Phase 4 — Editor and browsing (effort: M, risk: low; needs auth + data)

1. Log in (real Google account, or a seeded local user) and profile a theme-editing
   drag on mobile emulation. If `react-best-gradient-color-picker` dominates, options:
   throttle its onChange to rAF, memo-isolate the preview subtree (the scoped CSS-var
   path is already cheap, §A5), or swap the picker for a lighter one (it is lazy-loaded,
   so this is UX-driven, not bundle-driven).
2. Seed public themes/contests (or point the frontend at the prod API read-only) and
   profile browse + scroll; virtualize lists only if measurement says so.
3. Re-check `SnowfallAnimation` cost when seasonal effects are active.

### Splitting across Claude Code chats

One phase = one chat, each started fresh with this exact context recipe:

> Read `eurovision-scoreboard/docs/performance-improvement-plan.md` (this file) and
> the phase-N section; read `mobile-performance-investigation.md` for background;
> read the animation/tiebreaking docs listed in the phase if it touches the board.
> Reproduce the "before" numbers for the phase's target flow (preview server ×
> mobile emulation, flows described in Part A method), implement the phase's steps
> in order, re-measure after each step, and stop at the phase boundary.

Practical notes for those chats:

- `yarn preview` serves the production build at :8787; the backend runs from
  `douze-points-backend` with `npm run start:dev` on :8001. Emulation reference:
  390x844x3 mobile+touch, 4x CPU, Slow 4G.
- The chrome-devtools MCP writes files only inside the workspace root; Turbopack
  source maps are found via the `sourceMappingURL` tail comment, not the chunk name.
- Phases 0, 1, 3 are independent of each other. Phase 2 wants Phase 1's profiling
  residue as its baseline. Phase 4 is independent but needs auth/data prep.
- After Phase 2 (the risky one), run `/code-review` on the diff before considering it
  done, and do the side-by-side recording check with fresh eyes.

Suggested order: **0 → 1 → 2 → 4 → 3** if simulation feel is strictly the priority;
move 3 earlier if first-visit numbers start to matter (e.g. sharing links publicly).
