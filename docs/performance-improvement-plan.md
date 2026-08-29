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

**Status: DONE (2026-08-29).** Fresh before/after traces (same scripted SF1 flow,
same emulation) are in `../../perf-artifacts/phase1/` (`trace-before-*` vs
`trace-after-*`). Results against the targets:

- **Tap waterfalls: eliminated.** Before, the ПОЧАТИ tap fetched 5 chunks
  (~470 KB, largest arriving ~1.2 s later on Slow 4G) and the start-stage tap 7
  more; after, **zero chunk fetches occur anywhere in the setup→SF1→qualifiers
  flow** — everything is warmed during setup idle time. Two pieces: (a)
  zod+react-hook-form are gone from the post-setup path — the RHF form was a
  single always-valid array, replaced by a ~50-line external-store form in
  `usePostSetupStageForm.ts` (the 270 KB chunk no longer exists on that path);
  (b) an idle-time preloader (`useSimulationChunksPreload`) warms the
  post-setup/gsap/board/reveal batch. Gotcha that cost one iteration: Turbopack
  builds a chunk group per `import()` *call site*, so a preload written as its
  own `import(...)` warms shared chunks but not group-specific ones — the
  `dynamic()` wrappers and the preloader now share thunks in
  `src/hooks/simulationChunkImports.ts` so the preload warms the exact groups.
- **Setup→voting transition CLS 0.42–0.49 → 0.02** (the phase-0 skeleton helped
  only the panel; with every chunk warm nothing mounts late any more).
- **Voting-tap INP 191 ms → 170–171 ms** @4x (individual taps 137–171 ms). Target
  <200 ms met.
- **Per-award render fan-out cut** (helps every second of voting): `Main` now
  subscribes to `eventStages.length > 0` only, so the whole `EventSetupModal`
  hook tree no longer re-renders on every award; `ControlsPanel`,
  `PresentationPanel`, `SimulationHeader` are memoized with narrow
  subscriptions (stage id/isJuryVoting/isOver; undo availability is now read
  reactively from the temporal store instead of relying on parent re-renders).
  The qualification modal mounts via a gate one task *after* the stage-end
  commit (and not at all during voting) instead of living mounted and
  re-rendering per award; `Simulation` mounts through `useDeferredValue` so the
  setup-modal unmount and board mount are separate commits.
- **The three transition tasks remain >150 ms — and are Phase 2's, not this
  phase's.** After the splits: stage-start ~360–460 ms, jury→televote
  ~215–250 ms (interaction 270–353 ms), televote→reveal ~355–415 ms
  (interaction 484–534 ms) — run-to-run spread is the random vote sets changing
  the animation load. CPU-sample attribution (new tool:
  `scripts/perf/attribute-samples.mjs`) shows each is ~70–75 % **gsap
  CSSPlugin style application + style clearing (`removeProperty`) + countUp
  `innerHTML` writes running inside the commit's effects** — React component
  rendering is ~20–30 ms of each. §A1's "React render+commit" attribution was
  the trace's task-level label, not the real cost. This is exactly the
  animation *delivery mechanism* Phase 2 rewrites; splitting further here would
  have meant touching the choreography, which this phase forbids.

Verification: `yarn lint:types-cli` clean; ESLint clean on changed files;
vitest 93/95 (same 2 pre-existing stale failures as phase 0). Functional pass
on the real preview: full SF1 run (manual votes + finish-randomly ×2),
qualifiers modal opens with its usual 3.4 s delay and stagger, continue→SF2
post-setup opens, voters tab add/remove/reset works against the new form, SF2
starts with the saved voters, presentation auto-loop advances and pauses, undo
button enables/disables correctly.

### Phase 2 — Board animation delivery mechanism (effort: L, risk: medium; the big one)

Target: style recalcs during a full auto-run cut ≥3x (2,871 → <1,000 per 97 s
equivalent), no 145–200 ms frames during manual voting, visual parity per ground
rule 3. **The choreography (constants, phase order, queueing, tiebreak-driven
ordering) must not change** — only how phase state reaches the DOM. Read
`theme-animations-and-specifics.md` and `running-order-and-tiebreaking.md` first.
Baseline: Phase 1's `perf-artifacts/phase1/trace-after-*.json.gz` traces, whose
CPU-sample attribution (`scripts/perf/attribute-samples.mjs`) already shows the
remaining transition stalls are ~70–75 % gsap CSSPlugin style writes + clearProps
inside commit-phase effects — start from that, not from §A1's task-level labels.
Sub-steps as originally planned (each independently shippable and re-profiled):

1. **Stop routing per-frame animation state through Board-level React state.** The
   `timeline.call` callbacks in `useBoardAnimations` used to `setTeleportStateByCode`
   (≤5 setStates × moved countries per cycle). Replace with direct style application
   to the item DOM nodes via a `Map<code, HTMLElement>` ref registry — same visuals,
   same timing, zero React renders per tick. React state keeps only cycle start/end
   (`displayOrder`, running flag) so the queueing/`votingActions` interplay is
   untouched.
2. **Make `CountryItem` memo effective.** Narrow `useCountryDisplay`'s subscription
   (select the viewed stage's `countries` only), and keep country object references
   stable for untouched countries when `votingActions` writes points (update-in-place
   mapping: reuse the old object when nothing changed), preserving `votingActions`
   semantics exactly.
3. **Tame FLIP re-measurement**: with (1) in place, `flipKey` changes once per cycle
   instead of mid-timeline; verify forced-reflow total during a session drops from
   ~478 ms to near zero, and replace `transition-all` with explicit
   `transition: transform, opacity` on board items.
4. Only if still needed after 1–3: reduce `will-change` layer churn on board items,
   and isolate the douze-points hearts overlay cost.

**Status: DONE (2026-08-29).** All four sub-steps implemented and measured
(fresh before/after traces of the same two scripted flows, same emulation, in
`../../perf-artifacts/phase2/` — `trace-before-*` = the phase-1 build,
`trace-step1/2/34-*` = per-sub-step, `trace-final-*` = all sub-steps before the
review pass, `trace-after-*` = the definitive post-review build). Choreography
constants, phase order, queueing, and tiebreak ordering are untouched; only the
delivery changed. Results, before → after:

- **Full SF1 auto-run** (start → jury finish-randomly → televote finish-randomly
  → qualifiers): style recalcs **3,585 → 1,142 (3.1x, target met)**, recalc time
  2,099 → 1,195 ms; compositor commits **3,118 (15.9 s!) → 1,274 (3.5 s)**;
  FunctionCall 6,330 → 2,941 ms; tasks >100 ms 6 (worst 426 ms) → 5 (worst
  396 ms); run INP 467 → 253 ms. The qualifiers modal idling behind two
  spinning CTAs went from ~420 ms/s of JS to ~65 ms/s.
- **Manual voting** (stage start + 10 taps + 1 random juror, ~80 s both runs):
  **INP 304 → 159 ms**; **no >100 ms task in the tap window** and steady
  59–61 fps throughout it — the remaining four long tasks (~120 + ~400 ms at
  stage start, 2× ~150–180 ms at douze moments) are gsap CSSPlugin + countUp
  effect batches, see the "left on the table" note below; script-forced reflow
  763 ms/665 hits → 477 ms/369; long tasks 7 → 4. An intermediate build with a
  *static* per-row `will-change` also dropped tap-window busy from ~90 % to
  ~55 %, but was reverted for correctness (stacking contexts, below) — that
  headroom is recoverable later if the douze/glow z-ordering is reworked to
  tolerate per-row stacking contexts.

What each sub-step did (and bought), in order:

1. **Teleport phases → direct DOM writes.** `useBoardAnimations` keeps a
   `Map<code, HTMLElement>` registry (callback refs threaded
   Board → CountryItem → CountryItemBase); the `timeline.call`s now write
   inline opacity/transform/transition to the item node instead of
   `setTeleportStateByCode` — same phases, same timings, zero renders per tick.
   `teleportOnlyByCode` became a ref read by `shouldFlip` at flip time.
   Auto-run commits 3,118 → 1,049 came from this step alone.
2. **`CountryItem` memo made effective.** `stabilizeCountries` (in
   `state/scoreboard/helpers.ts`) restores reference equality for countries an
   award didn't change, applied at the award-map sites in `votingActions`,
   `resetLastPoints`, and `handleStageEnd`; `useCountryDisplay` subscribes to
   the viewed stage's countries only (whole-`eventStages` only in
   all-participants mode); Board/`useVoting`/`CountryItem`/
   `useQualificationStatus` dropped their render-time `getCurrentStage()` reads
   and whole-array subscriptions for primitive/stable-ref selectors;
   `useDouzePointsAnimation` only tracks the teleport flag while its overlay is
   active. Item renders per award are now O(changed countries), not O(board).
   Little effect on 4x-desktop traces (item renders were ~1–2 ms) but it is the
   scaling story for 26-row Grand Finals on real phones.
3. **FLIP verified tame + explicit transitions.** flip-toolkit's forced-reflow
   share is now ~50–70 ms/session (part 1's 478 ms is gone; flipKey changes
   once per cycle). The teleport transition is `opacity …, transform …` instead
   of `all`.
4. **Layer + clearProps churn.** A static `will-change` class was tried and
   **reverted in the review pass** (stacking-context hazard, see below) — the
   phases keep per-phase inline will-change like the old classes did. The
   lasting win here: `useAnimatePoints` no longer `clearProps`es before every
   enter/exit tween — it only `killTweensOf` (the tweens overwrite the only
   two props they ever animate, and clearing wiped gsap's per-element cache,
   forcing a getComputedStyle reflow per run — 605 forced recalcs/638 ms per
   session). The full clear on theme/layout change (`pointsLayoutKey`) and on
   a direction flip is preserved. This halved forced
   reflow and took manual-vote INP from ~290 to ~155 ms.

Known deltas / left on the table:

- Deliberate micro-deltas, all invisible in testing: an interrupted
  enter/exit last-points tween now continues from current values instead of
  snapping to the natural state first (strictly smoother); non-transform/opacity
  properties can no longer accidentally animate during teleport phases; and in
  the rare overlap where a row's leftover FLIP spring (>1 s) collides with a
  new teleport of the same row, the inline-vs-inline transform race resolves
  slightly differently than the old class-vs-inline one (both were races;
  sub-pixel stakes).
- **Stage-start commit is still ~370–420 ms** at 4x: gsap CSSPlugin +
  countUp + initial exit-tweens for all 15 items land in one effect flush. The
  initial exit tween per item is load-bearing (it's what hides the last-points
  block), so shrinking this means changing how those blocks initially hide —
  candidate for a later pass, not this phase.
- **Douze-hearts moments** cost ~150–220 ms tasks (hearts-grid tween setup in
  `DouzePointsAnimation`) — isolated and measured, not optimized.
- MCP runs report CLS 0.49 at the setup→voting transition in *all* phase-2
  runs including the phase-1-build baseline, where phase 1 had measured 0.02 —
  likely a measurement-mode difference (trace running across the tap vs a
  fresh-trace re-check); re-verify alongside Phase 3 before treating it as a
  regression.

Verification: `yarn lint:types-cli` clean; ESLint clean on all touched files
(also removed dead stagger vars this file carried); vitest 93/95 (same 2
pre-existing stale failures as phases 0–1). Functional pass on the real
preview: full SF1 run (manual votes 1–8 + random juror + finish-randomly ×2),
undo reverts the last award and re-enables rows, qualifiers modal lists the
right top 10, continue → SF2 post-setup opens with the voters tab intact, SF2
starts with all 15 countries. Ground-rule 3's side-by-side screen recording
was approximated with live screenshots/board-state snapshots at each phase
(layouts, ordering, glow, and sequencing all correct); a human-eyes recording
pass is still worth doing before deploy.

Post-review pass: per this plan's own rule, `/code-review` (8-agent) ran on the
diff and its confirmed findings were fixed before closing the phase — notably:
the static `will-change` class from sub-step 4 was **reverted** to per-phase
inline writes (a permanent will-change makes every row a stacking context and
would paint the overflowing douze-hearts overlay under the following rows);
the theme-preview direction flip regained its full GSAP clear (the only
`useAnimatePoints` caller without a `pointsLayoutKey`); the old
mode-guard semantics (teleport styles vanish instantly if the animation mode
leaves `'teleport'` mid-cycle) were restored via a mode ref; `winnerCountry`
is re-pointed at the stabilized array so it stays reference-identical to the
stored board entry; `hideDouzePointsAnimation`/`resetLastPoints`/stage-reset
maps skip value-identical writes; `useVoting` subscribes to
`votingCountryIndex` explicitly so `getVotingCountry()` freshness no longer
rides on the countries reference changing; and the per-item selectors were
consolidated into single `useShallow` selectors (one stage resolution per item
per write instead of three).

One user-visible bug shipped past both the review and the parity screenshots
and was fixed after: **teleported rows played their fade-in twice.**
react-flip-toolkit wipes inline `opacity`/`transform` on every flipped element
when `flipKey` changes (to measure final positions) — the old class-based
phase styles survived that wipe, the new inline ones didn't, so at the
mid-timeline reorder the row transitioned back to visible and then faded in
again when the in-phase started. Fix: `useBoardAnimations` tracks the
in-flight phase per code (`activeTeleportPhaseByCodeRef`) and a
`useLayoutEffect` keyed on `flipKey` re-asserts those styles right after the
Flipper commit (child lifecycles run first), before paint. Verified with
transition-event instrumentation: exactly one fade-out and one fade-in per
moved row, for single awards and bulk finish-randomly cycles alike.

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

**Status: DONE (2026-08-29).** Traces in `../../perf-artifacts/phase4/`
(`trace-before-*` = pre-phase build, `trace-after3-look-drag` /
`trace-after2-picker-drag` = final editor states, plus browse/snowfall traces).
Same emulation as always (390x844x3 mobile+touch, 4x CPU, Slow 4G), scripted
synthetic drags (~60 Hz pointer events, identical paths before/after).

**Auth + CORS workarounds** (the blockers this phase had to clear):

- CORS: backend `main.ts` now accepts a comma-separated `FRONTEND_URL` list;
  local `.env` carries `http://localhost:3000,http://localhost:8787`. (Prod
  single-value env behaves identically.)
- Login without Google: `/auth/refresh` matches the raw cookie token by SHA-256
  against `refresh_tokens`, so a session can be minted by inserting a
  refresh-token doc directly in Mongo and setting a non-httpOnly
  `refresh_token` cookie on `localhost` (port-agnostic), then hitting
  `/?provider=google` to force `handlePostLogin`. Scripted in
  `douze-points-backend/perf-seed.tmp.mjs` (also creates the `perf-seed-user`
  profile; `cleanup` arg removes everything it made). **Caution: the local
  backend's Atlas URI is production-scale data** (17k profiles, 19k public
  themes, 45k public contests — the §A7 "no public content" note was stale).
  The 48 seed themes the script created were deleted the same session;
  `perf-seed-user` + its refresh token were kept for future profiling logins.

**Step 1 — editor drag.** Baseline: Look-tab hue/shade drag ran at 52–58 fps
with 91–113 % busy (≈500 ms JS/s) — every pointer-move re-rendered the whole
`CustomizeThemeModal`; picker drag (mobile `ColorEditorPanel`) ran at
**31–37 fps**, 110 % busy, ≈650 ms JS/s. Two systemic finds beyond §A5:

- **The "debounced" live preview never updated during a drag at all.** The
  modal debounced hue/shade/overrides at 40 ms (`useDebounce`), but pointer
  moves arrive every ~16 ms, so the timer reset forever and the preview only
  caught up when the finger paused. The intended "~25x/s" cadence in the old
  comment never existed. All "before" smoothness numbers benefited from this
  accidental freeze.
- **`Tabs` re-measured on every parent render** (measure effect keyed on the
  `tabs` array identity, which parents rebuild per render): 5 forced
  `offsetWidth` reads + a state write + a `fonts.ready`→rAF re-measure per
  modal render — the moment the preview became live this turned into an
  offsetWidth/rAF storm (1.2 s reads + 1.6 s rAF per 20 s trace).

Fixes shipped (all state-flow, no visual/UX change except the preview now
genuinely tracks the drag):

1. `useThrottledEdit` (new hook, custom-themes/hooks): local-echo + 40 ms
   leading/trailing-throttled propagation, used by `ColorEditorPanel`,
   `ColorOverridePicker`, and the new `InterfaceColorSliders` (hue/shade
   extracted out of the modal). Drags re-render only the small editor
   component; modal state updates at ≤25 Hz.
2. The modal's preview values now use `useThrottledValue` (new, src/hooks) at
   100 ms — a real throttle, so the preview updates ~10x/s *during* the drag
   (each tick costs a full-document style recalc, ~20 ms at 4x, since the
   preview `<style>` tag rewrite invalidates everything; 10 Hz is the budget
   that holds 60 fps).
3. `Tabs` measures on `[tab values, activeTab]` instead of array identity;
   `tabItems` memoized in the modal.
4. `useReadableForegroundFromCssVar` reads post-paint (rAF → macrotask) instead
   of inside rAF — reading computed style right after the `<style>` rewrite
   forced a second full recalc per tick.
5. The picker gets the throttled prop value through a `React.memo` wrapper
   (its drag cross is component-local state, so full-rate feedback survives);
   the per-move value echo feeds only the cheap swatch/readout row.

Results (same scripted drags): **Look tab 52–58 fps saturated + frozen preview
→ steady 59–61 fps with a live preview** (JS 500 → ~430 ms/s, rAF storm
1.6 s → 13 ms). **Picker drag 31–37 → 35–41 fps, also now with a live
preview** — the remaining cost is `react-best-gradient-color-picker` itself:
its context provider `setState`s on every move (its internal
`lodash.throttle(250)` is recreated per event, i.e. broken), so the whole
picker subtree re-renders per move, and its per-move
`getBoundingClientRect` forces layout on a style-dirty document (~130 ms/s).
An A/B prototype caching that rect in `node_modules` cut ~100 ms/s JS but did
not move fps (reverted). **Getting the picker flow to 60 fps needs either
patch-package surgery on the lib (hoist the throttle, cache the rect) or a
lighter picker — a UX/product decision, deliberately left open.** Also left on
the table: a one-time ~350 ms React discrete-event commit on the first slider
touch after the modal opens (pre-existing — 309 ms in the baseline trace).

**Step 2 — browsing (real prod-scale data, no seeding needed).** Public themes
(19,189 rows, paginated 10/page): tab-switch mount is one ~470 ms task (React
render of 10 preview cards — `content-visibility: auto` on the cards was tried
and reverted: the cost is render, not layout/paint), scroll 48–60 fps at
≤55 % busy, page flips cheap. Public contests (45,290 rows): worst task 270 ms,
scroll ≤33 % busy. **Verdict: no virtualization warranted**; the lists are
fine.

**Step 3 — snowfall.** `react-snowfall` at intensity 5: ~23 % busy @4x, steady
60 fps, zero paint (canvas); at max intensity 10 (500 flakes): ~24 %.
Cheap — no action. (Note: `enableWinterEffects` is account-synced, so it must
be toggled via the API/UI, not localStorage.)

Verification: `yarn lint:types-cli` clean; ESLint clean on changed files;
vitest 93/95 (same 2 pre-existing stale failures as phases 0–2). Functional
pass on the rebuilt preview: hue drag updates the preview mid-drag and settles
exactly at the thumb; mobile swatch editor edits land in the grid, undo
reverts, back-navigation flushes pending edits; desktop popover picker applies
overrides. Changed files: `Tabs.tsx`, `CustomizeThemeModal.tsx`,
`ColorEditorPanel.tsx`, `ColorOverridePicker.tsx`,
`useReadableForegroundFromCssVar.ts` + new `InterfaceColorSliders.tsx`,
`hooks/useThrottledEdit.ts`, `src/hooks/useThrottledValue.ts`; backend
`main.ts` (CORS list).

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
