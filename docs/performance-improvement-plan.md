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

**Status: DONE (2026-08-29).** Traces in `../../perf-artifacts/phase3/`
(`trace-before-cold*` = pre-phase build, `trace-step1/step2-cold` = per-step,
`trace-after-cold` = final; `lh-before*` / `lh-after*` = Lighthouse reports).

Method note (differs from phases 0–2, and matters): every load number below is a
**cold** load in a *fresh isolated browser context* (new cache + new storage =
a genuine first visit), traced by navigating *into* an already-started
recording. Reloading an already-visited page hides the whole finding — Chrome
serves the late dynamic-import chunks from the memory cache even with
`ignoreCache`, so their round trips cost ~1 ms and the waterfall looks flat.
Two more environment facts: the preview **does** gzip static chunks (the
part-1 "no compression" caveat applies only to the HTML document, which is
still served `identity` locally but brotli in prod), and the ~580 ms
`navigationStart`→request gap is present in every run, so it cancels out in
before/after comparisons.

### Results

Cold first visit, mobile emulation (390x844x3 + touch, 4x CPU, Slow 4G),
2 baseline runs / 2 final runs:

| | before | after |
|---|---|---|
| LCP (= FCP) | 5079 / 5076 ms | **4505 / 4518 ms** |
| render-critical JS round-trip levels | **4** | **2** |
| initial chunk batch | 17 chunks / 272 KB | 18 chunks / 300 KB |
| countries preset fetch | 3830 → 4398 ms | **616 → 1207 ms** |
| load CLS | 0.00 | 0.00 |
| deployed chunk weight | 20 MB | **18 MB** |

Lighthouse (mobile, `--throttling-method=simulate`, 3 runs each) is far noisier
than the trace method — LCP 7.2 / 5.8 / 5.3 s before vs 5.3 / 5.0 / 5.2 s
after, score 73 / 73 / 76 → 77 / 79 / 80, TBT 110 / 80 / 70 → 80 / 30 / 40 ms.
Read it as "~6.1 → ~5.2 s, 74 → 79"; the ±1 s spread means the trace numbers
above are the ones to trust. a11y stayed 100.

### What the "before" waterfall actually looked like

The interesting finding is that §3.1's "two-level chain" was really a
**four-level** one, and the last two levels were nearly free in bytes:

- L1 — 17 render-critical chunks, 272 KB, 606 → 3462 ms.
- L2 — `Main` + `EventSetupModal` (16 + 16 KB), 3637 → 4395 ms. Discovered only
  after hydration, because of `dynamic(() => import('views/Main'), {ssr:false})`.
- L3 — **a 1 KB chunk containing nothing but `SnowfallAnimation.tsx`**,
  4448 → 5035 ms. `Main` wrapped it in a second `dynamic()`, even though the
  component is a 40-line wrapper that *itself* lazy-loads `react-snowfall`. A
  whole round trip, ~590 ms, for a byte-free indirection.
- In parallel with all that, `/data/countries/countries-2026.json` was not
  requested until **3830 ms** — it is fetched by `generalStore`'s
  `onRehydrateStorage`, so it cannot start until the eager bundle has
  evaluated. The setup screen cannot lay out its stages without it.

### Step 1 — kill the render-critical round trips (the whole win)

1. **`Main` is imported statically again.** `app/(main)/page.tsx` renders it
   behind a `useIsClient()` gate (new `src/hooks/useIsClient.ts`) instead of
   `dynamic(..., {ssr:false})`: the server output stays empty (the stores
   rehydrate from localStorage, so server-rendering it would guarantee a
   hydration mismatch) but the code now ships with the initial bundle and
   downloads in parallel with it. L1 grows 272 → 303 KB and its tail moves
   +224 ms; the 758 ms serialized hop disappears.
2. **`SnowfallAnimation` is a static import** in `views/Main.tsx`. `react-snowfall`
   stays lazy inside it, so nothing heavy moved — the third round trip is
   simply gone.
3. **The countries preset is preloaded from the document** —
   `ReactDOM.preload(INITIAL_COUNTRIES_URL, {as:'fetch', crossOrigin:'anonymous'})`
   in the root layout, with the URL built by the new
   `src/data/countries/countriesDataUrl.ts` that `countriesStore` now imports
   too (so the preload can never drift from the fetch). 3830 → **616 ms**.

Step 1 alone: LCP 5079 → 4538 ms, 4 levels → 2.

**A 0.43 first-visit CLS appeared during this step and was fixed by (3).** With
`Main` mounting ~600 ms earlier, the setup screen started painting *before* the
countries JSON arrived: 16 buttons, no stage cards, a "Не беруть участі"
section — then the data landed and the layout jumped. Making
`useInitialLineup` / `useCountryAssignments` layout effects (worth keeping —
their initialisation now lands before paint) was *not* enough, because the
missing input was a network response, not a render pass. Preloading the JSON
removed the intermediate state entirely; load CLS is back to 0.00.

Also fixed here, a **pre-existing latent bug** the new chunk grouping exposed:
`src/app/error.tsx` read `navigator.platform` at module scope, which crashed
the `/about` prerender (`ReferenceError: navigator is not defined`) as soon as
that module landed in a chunk evaluated during SSR. It now reads lazily.

### Step 2 — eager-chunk diet

`@75lb/deep-merge` is gone, replaced by `src/state/deepMerge.ts` (~45 lines,
`src/state/deepMerge.test.ts` covers the semantics). The package is trivial but
reaches its work through `lodash/assignWith`, which dragged **50 lodash modules
plus Next's 34 KB `Buffer` polyfill** (via `lodash/isBuffer` → `_nodeUtil`)
into the render-critical chunk, since both stores are on the boot path. The
replacement is a faithful port — including the quirks (mutates the target,
empty incoming arrays are ignored *unless* the target has no value, `null`
counts as defined) — and was validated by differential-testing it against the
real package over ~13,000 generated structures plus the store-shaped cases:
0 mismatches.

Measured: eager chunk 263 → 255 KB raw / 73 → 70 KB gz, LCP 4538 → 4518 ms
(inside run-to-run noise; the value here is bytes and parse work, not a
visible LCP move).

**The 34 KB `Buffer` polyfill is still there, and it is axios's fault** —
`axios/lib/helpers/toFormData.js` references the free variable `Buffer` in a
branch that only runs under Node, and that one reference makes Turbopack inject
the polyfill. A `turbopack.resolveAlias` mapping `buffer` to a browser stub was
tried and had **zero effect** (byte-identical chunk), so the injection does not
go through user-facing resolution. Removing it therefore means removing axios:
~59 KB raw / ~17 KB gz off the first hop (axios ~25 KB + polyfill 34 KB), at
the cost of porting 103 `api.*` call sites and the 401-refresh interceptor to a
fetch wrapper. Scoped and ready, deliberately **not** done in this phase — see
"left on the table".

### Step 3 — i18n namespace split: measured, then rejected

Built a probe that trims the server catalog to the shell namespaces (drops the
`guide` bodies, `settings.{general2,relations,odds,voting}` and all of
`simulation` — 44 % of the merged catalog, the most aggressive split the app
can support): document **141 → 92 KB**, LCP 4518 → **4435 ms**, i.e. **−83 ms**
locally, where the HTML is uncompressed. In production the document is brotli'd
(~25 KB), so the real saving is roughly a third of that — **~25–40 ms**.

The reason is visible in the waterfall: the document finishes at ~1.7 s while
the JS finishes at ~3.7 s, so the catalog is *not* on the critical path; it
only competes for bandwidth. Shipping the split would mean a route handler
serving the deferred namespaces, a client provider that merges them in, and
failure modes across 9 locales — and the deferrable set shrinks further on
inspection, because shell components reach into supposedly-modal namespaces
(`SetupHeader` uses `settings.general.contest`, `ThemeSoundVolumeHud` uses
`settings.ui`, `GuideButton` uses `guide.title`, and the post-setup tabs use
`settings.odds` / `settings.voting`). **Not worth it.** The probe was reverted.

One safe piece was kept: `src/i18n/request.ts` now memoises the en+locale deep
merge per locale for the life of the isolate, instead of rebuilding a ~70 KB
structure on every request.

### Step 4 — xlsx dedup

`voteSpreadsheet.ts` loads `xlsx` through a single `import()` call site
(`loadXlsx()`) instead of a static import. Because the module is reached from
two different lazy subtrees (the voting-predefinition modal and the final-stats
modal), Turbopack had been emitting the entire library **twice**: two 412 KB
chunks. Now one 403 KB chunk, shared — and it is fetched only when a
spreadsheet is actually read or written, not when either modal opens.
`downloadVoteSpreadsheet` / `exportVotesToSpreadsheet` and their two call sites
became async. Deployed `static/chunks` weight 20 MB → 18 MB. Verified live: the
Export button in the stats modal fetches exactly one new chunk and the download
works.

### SSR shell: not attempted

Per this phase's own instruction, the decision after phases 1–2 was to stop at
the mechanical wins. The mechanical wins landed us at ~4.5 s (trace) / ~5.2 s
(Lighthouse) rather than the hoped ~4.5–5 s Lighthouse figure, and the
remaining LCP is still ~90 % render delay gated by the 300 KB initial bundle.
An SSR shell remains the only route to ~2.5 s and is still a project, not a
patch.

### Left on the table (scoped, with numbers)

- **Drop axios for a fetch wrapper**: ~17 KB gz off the render-critical first
  hop (25 KB axios + the 34 KB `Buffer` polyfill it forces in). 103 call sites,
  plus `parseAxiosError` and the refresh interceptor.
- **The i18n split**: ~25–40 ms in production, moderate risk. Numbers above.
- `themes.ts` (11 KB raw) and `votingActions.ts` (27 KB raw) are still eager
  because the stores are reachable from `layout.tsx`; decoupling them is part 1's
  L-effort/high-risk row and untouched.

### Setup→voting CLS: re-verified, as Phase 2 asked

Phase 2 flagged a 0.49 CLS at the setup→voting transition in all its MCP runs
(including its phase-1-build baseline, where phase 1 had measured 0.02) and
asked for a re-check here. Measured on the final build, same emulation, three
scripted runs of setup → ПОЧАТИ → start SF1: **0.489, 0.037, 0.027**. So it is
real but **intermittent**, it predates phase 3 (phase 2 saw it on the phase-1
build), and the shifting elements are board rows (`data-flip-config`) moving
from their pre-FLIP position to the final one at board mount — an animation
concern, not a load-path one. Load CLS itself is 0.00. Left for a targeted
follow-up rather than smuggled into this phase.

### Verification

`yarn lint:types-cli` clean; ESLint on every changed file at or below its
pre-existing error count (`countriesStore.ts` 14 → 0 and `i18n/request.ts`
3 → 2 after `--fix`, everything else unchanged); vitest **102/104** — the same
2 pre-existing stale failures as phases 0–2, and 9 new `deepMerge` tests.
Functional pass on the rebuilt preview: first visit renders the full lineup
(SF1 15 / SF2 15 / GF 5, qualifiers 10+10) with no intermediate state;
ПОЧАТИ → post-setup → start SF1 mounts the board; two finish-randomly cycles
complete the show; stats modal opens and its spreadsheet Export fetches the
shared xlsx chunk and downloads; reload restores the persisted board through
the new `deepMerge`; continue → SF2 post-setup → SF2 starts; settings and guide
modals open fully translated (Ukrainian); no console errors beyond the known
umami 429 on localhost.

New tooling: `scripts/perf/load-waterfall.mjs` (round-trip levels, per-level
bytes, cache hits, FP/FCP/LCP from a trace) and `scripts/perf/chunk-modules.mjs`
(attribute built chunks to source modules via the Turbopack source maps,
`--find <module>` to locate one across chunks).

Changed files: `app/(main)/page.tsx`, `app/layout.tsx`, `app/error.tsx`,
`views/Main.tsx`, `i18n/request.ts`, `state/countriesStore.ts`,
`state/scoreboardStore.ts`, `components/setup/hooks/useInitialLineup.ts`,
`components/setup/hooks/useCountryAssignments.ts`,
`components/setup/voting-predefinition/{voteSpreadsheet.ts,useVotingPredefinition.ts,VotingPredefinitionModal.tsx}`,
`components/simulation/finalStats/FinalStatsModal.tsx`, `package.json`,
`yarn.lock`; new `hooks/useIsClient.ts`, `data/countries/countriesDataUrl.ts`,
`state/deepMerge.ts` + `state/deepMerge.test.ts`, and the two perf scripts.

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

## Part C — Final assessment (2026-08-29, after phases 0–4)

Measured on the final build, same reference device as always (390x844x3 mobile +
touch, 4x CPU, Slow 4G). Traces in `../../perf-artifacts/final/`.

### Where the app stands, by flow

| Flow | Metric | Now | Was (part A / part 1) |
|---|---|---|---|
| **Manual voting** (10 taps) | longest task | **174 ms** | 145–200 ms frames, five-plus in a row |
| | tasks >100 ms | **3** | 7 |
| | INP | **~155 ms** (phase 2) | 475 ms |
| **Auto-run** (start → jury → televote → qualifiers) | longest task | **393 ms** (stage start) | 414 ms |
| | tasks >100 ms | **5** | 9 |
| | style recalcs | **1,212** | 2,871 |
| | worst-second fps | **12** | 2 |
| **Between phases** (results screen idle) | main thread busy | **6–15 %** | ~50 % |
| **Theme editor** (hue drag) | fps | **59–61**, live preview | 52–58, preview frozen mid-drag |
| **Theme editor** (gradient picker drag) | fps | 35–41 | 31–37 |
| **Browsing** public themes/contests | scroll | 48–60 fps, ≤55 % busy | unmeasured |
| **Cold first visit** | LCP | **4.5 s** | 5.1 s (6.4 s in part 1's older build) |
| **Repeat visit** | LCP | **2.2 s** | 2.05 s |

**The honest summary: the stalls are gone, the saturation is not.** Every
individual freeze the investigation started from has shrunk by 2–3x, and the
50 %-busy-while-idle bug is gone entirely. But during an active voting sequence
the main thread still sits at **75–99 % busy at 4x CPU**. Part A's §A2 finding
("zero headroom") still holds — we made the work cheaper, not asynchronous. On a
phone slower than the 4x reference, or with anything else competing (see
Clarity, below), that headroom is where dropped frames come from.

The one number that did not move: **stage start is still a ~390 ms freeze**.
It is the single worst moment left in regular use, and it is a known,
scoped item (gsap CSSPlugin + countUp + the initial exit-tween for every row,
all in one effect flush).

### Microsoft Clarity: measured

**It is already off.** `Clarity.init()` was commented out in `src/app/clarity.tsx`
in commit `e842712` ("Stop clarity for now as we already have many recordings"),
which predates this whole workstream — so every number in this document was
measured without it, and production has not been paying for it either since
that deploy. What remains is dead weight: an unused `@microsoft/clarity`
dependency and a no-op component (~0 KB shipped).

To answer the question properly it was re-enabled and measured against the
identical scripted auto-run (both traces 45 s of main-thread profile):

| | Clarity off | Clarity on |
|---|---|---|
| clarity.js main-thread JS | — | **2,585 ms (58 ms/s)** |
| main thread idle | 850 ms/s | **746 ms/s** (−104 ms/s) |
| `FireAnimationFrame` total | 636 ms | **2,928 ms** (per callback 0.34 → **1.64 ms**) |
| tasks >100 ms | 5 (worst 393 ms) | **6 (worst 483 ms)** |
| cold LCP | 4505 ms | 4491 ms (no effect) |
| extra network | — | 4 requests, ~26 KB wire, then continuous `collect` uploads |

**Verdict: it costs roughly 10 % of the mobile main thread for the entire
duration of a simulation** — 58 ms/s directly in `clarity.js` plus ~46 ms/s of
extra `(program)` time, taken out of the exact headroom the animations do not
have. It does *not* touch LCP (it initialises in an effect, after hydration).
The mechanism is visible in the rAF numbers: Clarity's DOM-mutation recorder
runs per frame, and this app mutates the DOM on every frame of every
choreography, so it is close to a worst case for session recording.

Recommendation: **delete it** rather than leave it dormant. **DONE
(2026-08-29):** `@microsoft/clarity`, `src/app/clarity.tsx`, the
`<ClarityAnalytics />` mount, the `data-clarity-unmask` body attribute and
`NEXT_PUBLIC_CLARITY_PROJECT_ID` are all gone. If session insight is ever
wanted again it should be sampled (a few percent of sessions) and disabled
outright while a stage is running.

(Note: the measurement runs sent a handful of localhost sessions to the real
Clarity project `xjre9uo6iw`.)

### What the five phases actually bought

- **Phase 0** removed a bug that was burning ~half the throttled main thread
  while the app sat still, and took accessibility 90 → 100.
- **Phase 1** removed the two chunk waterfalls between tapping ПОЧАТИ and
  seeing a board (~610 KB across 12 chunks, fetched at the worst possible
  moment) — nothing is fetched in the setup→SF1→qualifiers flow any more — and
  cut the per-award render fan-out from O(board) to O(changed rows).
- **Phase 2** was the big one: it stopped routing per-frame animation state
  through React. Style recalcs during an auto-run fell 3.1x, compositor commits
  2.4x, manual-voting INP 304 → 159 ms.
- **Phase 4** made the theme editor's live preview actually work (it had been
  silently frozen mid-drag by a debounce that never fired) while raising the
  frame rate, and proved that public browsing and snowfall need no work.
- **Phase 3** removed two full network round trips and a third serialized fetch
  from the first paint, and halved the deployed chunk weight's worst offender.

Two findings mattered more than any single fix: **the trace's task-level labels
lied** (the transition stalls were gsap style writes, not React rendering), and
**several "optimisations" were doing nothing** (a debounce that never fired, a
`dynamic()` around a 1 KB wrapper, a `clearProps` that forced a reflow per run).
Measuring before changing was the whole game.

### What is left, biggest first

Everything below is measured or directly attributable, not speculative.

**1. Nothing paints until 300 KB of JS has arrived and parsed (cold LCP 4.5 s,
90 % of it render delay).** The only structural fix is to server-render or
prerender the shell. This is the redesign hook: today the setup screen's first
paint depends on the stores, so it cannot be prerendered at all. If the
above-the-fold frame (header, widget cards, section chrome) were made
**store-independent by design**, it could ship as static HTML and paint at
~1.4 s instead of 4.5 s, with the interactive parts hydrating after. Project,
not patch — but it is the only route to a ~2 s first visit.

**2. The i18n catalog is the entire cost of a repeat visit.** New measurement:
on a warm cache all 18 chunks come from disk in 60 ms and the *document* is the
only real network work — 141 KB local / ~25–30 KB brotli in production, **every
single visit**, because the catalog is inlined in the RSC flight payload. Phase 3
measured the namespace-split version of this and rejected it (~25–40 ms on a
cold load). The better fix is different: **move the catalog out of the document
into a hashed, immutably-cached static JSON**, so returning users pay for it
once, ever. Given that this app's audience is people who come back to run more
contests, this is worth more than the cold-load number suggested.

**Status: DONE (2026-08-30).** The catalog no longer ships in any document:

- `scripts/generateMessages.ts` (ts-node, wired as `prebuild` so
  `build`/`preview`/`deploy` all regenerate) merges each locale over en,
  writes content-hashed JSON to `public/messages/<locale>.<hash>.json`
  (gitignored) and emits the committed manifest
  `src/i18n/messagesManifest.generated.ts`. `messagesManifest.test.ts`
  recomputes the hashes from `messages/*.json`, and lint-staged regenerates
  the manifest when a translation file is staged. The shared merge/type
  helpers moved to `src/i18n/catalog.ts` (pure) and
  `src/i18n/serverMessages.ts` (per-isolate cached merge, still used by
  `generateMetadata`/`getTranslations`).
- `app/layout.tsx` passes the client an explicit **shell subset**
  (`SHELL_NAMESPACES` in catalog.ts: Metadata, common, error,
  widgets.profile, settings.ui — the inventory of everything that renders
  before the catalog arrives) through the new `AppIntlProvider`; passing
  explicit messages short-circuits next-intl's server-side
  auto-serialization that inlined the full catalog into every flight
  payload. The provider fetches the full catalog (preloaded from the
  document head beside the countries preset, so it downloads in parallel
  with the JS), swaps locale+messages in atomically, falls back to the new
  `/api/messages/[locale]` route (also the dev-mode source — `next dev`
  runs no prebuild) and degrades to shell-only rather than blocking. The
  main page gates on `useCatalogReady()` as a correctness backstop.
- `public/_headers` gained `/messages/* → public,max-age=31536000,immutable`
  — verified live on :8787 that it beats the global `no-store` block, which
  was the entire premise.

Measured (same emulation): **document 141 → 38 KB local** (~25–30 → ~8 KB
brotli in prod), finishing at 781 ms vs 1667 ms; on a repeat visit the
catalog serves from disk cache with **zero transfer and no revalidation**,
so the slim document is the only real network work left. Cold LCP
4252 → 4262 ms (parity — the ~20 KB catalog preload rides level 0 next to
the 274 KB JS and never touches the critical path), load CLS 0.00, L1
unchanged at 18 chunks / 274 KB. The force-static `/about`/`/privacy`
pages, whose views contain zero translations, dropped 111 → 41 KB
prerendered HTML for free. Locale switch verified end to end: the language
select POSTs `/api/locale`, `router.refresh()` hands the provider new
props, the new locale's catalog is fetched (es, 24 KB cold) and the whole
UI swaps with no mixed-locale frame; a fresh Accept-Language visit resolves
uk and renders fully translated from the fetched catalog.

Verification: `yarn lint:types-cli` clean; ESLint clean on all new/changed
files; vitest 118/120 (same 2 stale failures + the manifest guard test).
Known trade-offs: the shell inlines ~6 KB raw of namespaces every visit
(unavoidable — they render before the fetch), and a deploy race lands on
the uncached API route instead of the static file.

**3. The engine boots before the app needs it.** `votingActions.ts` (28 KB raw),
`themes.ts` (12 KB), `common-countries.ts` (9.5 KB), axios, query-core and
zustand middleware are all in the render-critical chunk because
`layout.tsx` → `AppBootstrap` → hooks → stores. Nothing about the setup screen's
first paint needs the voting engine. Decoupling the boot path from
`scoreboardStore` would take ~30–40 KB gz off the first hop; combined with
dropping axios (another ~17 KB gz, and it takes Next's 34 KB `Buffer` polyfill
with it) that is a real dent in item 1's 300 KB.

**Status: DONE (2026-08-30), in three commits.** Cold trace in
`../../perf-artifacts/partc/trace-c3-cold.json.gz` (fresh isolated context,
navigate-into-recording, same emulation): **LCP 4505 → 4252 ms, L1
18 chunks / 300 → 274 KB gz, load CLS 0.00**; the engine chunk loads in the
idle-preload batch at ~4 s, after first paint, never as a pre-paint level.

- **axios → fetch wrapper** (`src/api/client.ts`, ~180 lines): same surface —
  `api.get/post/put/patch/delete` resolving `{ data, status, headers }`,
  errors carrying `response.{status,data}` (what `parseAxiosError` and the
  queryClient retry duck-type), JWT injection, single-flight 401 refresh with
  exactly one retry, refresh-endpoint exclusion, FormData passthrough (caller
  multipart Content-Type dropped so the browser sets the boundary), DELETE
  bodies via `config.data`, `params` serialization. Zero call-site edits —
  audited: the tree uses only `{ params }` (errors.ts) and multipart headers
  with FormData (5 sites). 14 unit tests in `client.test.ts` cover the shape,
  the 401/refresh state machine and single-flight. axios and the Buffer
  polyfill are gone from every chunk (`chunk-modules.mjs --find` empty).
- **Diaspora split**: `diasporaSettings.ts` holds the JSON-free types,
  defaults (defaultOn group ids as a literal, guarded by
  `diasporaSettings.test.ts` against drift) and pure helpers that
  `generalStore`/`syncedSettings` need; `diaspora.ts` keeps the 46 KB presets
  JSON + resolvers and re-exports the light module, so the lazy Relations
  UI / engine consumers are unchanged.
- **Lazy engine injection**: `scoreboardStore` composes only
  eventActions/miscActions/getters + typed stubs
  (`engineStubs.ts`) for the 23 voting / jury-scale-reveal / predefinition
  actions; `installEngine.ts` — reached only through `engineLoader.ts`'s
  memoized `import()` — swaps in the real factories via store-level
  `setState` (routes through the same persist→devtools→temporal chain;
  zundo's data-only partialize means the swap records no history entry). A
  stub call pre-install queues on the loader promise (FIFO) and delegates
  once installed, so stale captured references keep working.
  `startEvent`/`continueToNextPhase` and the contest-snapshot loader `await
  ensureScoreboardEngine()` as the hard ordering guarantee (both call
  `resetJuryScaleReveal`/`predefineVotesForStage` synchronously); the idle
  preloader (`useSimulationChunksPreload`) warms the chunk during setup.
  Severing the two `generalStore`/`countriesStore` → store edges was
  deliberately NOT done: since phase 3 the page chunk statically needs the
  store object at first render (EventSetupModal's selectors +
  `temporal.getState()`), so that cut would only shuffle bytes between two
  render-critical chunks.

Worst case measured (auto-clicker beats the idle preloader on a cold Slow-4G
load): tap start-SF1 → 15-row board in **806 ms** including the on-demand
engine fetch. Punted, as planned: the `themes.ts` per-year split
(`getThemeForYear` is needed synchronously in generalStore's initial state,
persist merge and rehydrate) and `common-countries.ts` (its other consumers
sit in the equally-critical page chunk).

Post-review pass (`/code-review` on the C4+C3 diff; half the finder agents
died on a session rate limit, so the surviving four angles' findings were
verified by hand and the dead angles' ground — axios parity, cross-file
callers — re-checked manually). Confirmed and fixed:

- **Undo-history inversion at stage start** (the review's best catch):
  `startEvent` becoming async silently reordered EventSetupModal's
  `startEvent(); clear();` — the zundo history wipe ran before the stage
  start's writes, leaving the whole start undoable (undo would walk the
  board back to a pre-start state). `startEvent`/`continueToNextPhase` are
  now honestly typed `() => Promise<void>` and `closeAndStartEvent` clears
  after the start resolves.
- **engineLoader cached a rejected promise forever** — one flaky chunk fetch
  would have bricked the simulation until reload; it now retries.
- **engineStubs hardening**: the name list is compile-checked both ways
  against the three factories' exported action types (type-only imports, so
  no eager edge); the queued replay runtime-guards against a still-stubbed
  action (no self-call loop on a drifted build); and the two
  boolean-returning actions (`openSplitScreenQualifierModal`,
  `computeSplitScreenQualifierCandidatesIfNeeded`) kick the load but do NOT
  queue a replay — their callers branch on the return value, so a late
  replay would act on a decision already taken the other way.
- **client.ts**: the 401-refresh decision now runs before the discarded
  error body is parsed, and the retry-token policy is one expression
  (`retry?.token ?? getter() ?? null` — the unit test caught an
  over-simplification that dropped the returned-token parity).
- **contestSnapshot** starts the engine download at the top of a full load
  so it overlaps the countries fetch + decode (deep link into a saved
  contest before the idle preloader fires).
- Cleanups: the thrice-duplicated "clear GSAP styles only on a mid-life
  layout-key change" guard is now one shared `useOnLayoutKeyChange` hook
  (PointsSection's two same-key effects merged into one call); the douze
  shrink-phase start is a module constant (it never varied with column
  count); the diasporaSettings guard-test comment named the wrong file.
  Left as noted, pre-existing: `newDiasporaGroupId` duplicating
  `votingPresetsStore`'s `newId`, and the api modules' hand-rolled query
  builders not yet migrated to the client's `{ params }`.

Verification: `yarn lint:types-cli` clean; ESLint clean on new files, touched
files at or below their pre-existing error counts (`contestSnapshot.ts`
43 → 3 after `--fix`); vitest 117/119 (the same 2 stale failures + 15 new
tests). Functional pass on the rebuilt preview: full SF1 (manual votes, undo
mid-voting, finish-randomly jury + televote), qualifiers modal with correct
totals, continue → SF2 post-setup → SF2 starts; a persisted mid-simulation
rehydrates and the presentation auto-voting drives stubbed actions through
the on-demand engine load; login via minted refresh token (refresh 201 → me →
preferences → custom-entries), authed theme reads incl. a query-param'd list,
logout 201. One pre-existing edge documented while chasing a false alarm: a
ПОЧАТИ tap in the first ~3 s of a cold load, before the stage cards populate,
is silently swallowed by `proceedToPostSetup` (no stage with countries yet) —
present before this work, self-heals on the next tap.

**4. The remaining simulation freezes are all "one big effect flush".**
- *Stage start, ~390 ms*: the initial exit-tween that hides every row's
  last-points block is load-bearing but does not need to be a tween. Render
  those blocks hidden by default (a class or `hidden` attribute) and the whole
  per-item initial tween batch disappears.
- *countUp writes `innerHTML` per tick* — it showed up in phase 1's sample
  attribution. `textContent`, or skipping the count-up for small deltas, is
  cheaper.
- *Douze-points hearts, 150–220 ms*: up to 100 animated SVG hearts, tween setup
  in one go. A single canvas or one CSS-animated sprite layer would be an order
  of magnitude cheaper.
- *The deeper move*: phase 2 took the choreography from "React state per frame"
  to "cheap direct DOM writes per frame". The next step is **no main-thread work
  per frame at all** — express the teleport/FLIP phases as Web Animations
  (`element.animate()` on transform/opacity only) and let the compositor run
  them, so JS schedules once per cycle instead of ticking. That is what would
  finally break the 75–99 % busy ceiling.

**Status: the three concrete fixes are DONE (2026-08-30); the WAAPI move was
deliberately deferred** (decision: land + measure these first; revisit with
fresh baselines if busy stays pinned). Traces in `../../perf-artifacts/partc/`
(`trace-c4-before/after.json.gz`, same flow: stage start → 10 manual awards →
douze, same emulation as always). Results:

- **Stage-start flush 408 → 126 ms.** The before-task attributed to gsap
  CSSPlugin (140 ms) + `removeProperty` clearProps (68 ms) + countUp
  `printValue` (34 ms); the after-task is purely the React board-mount commit.
  Three changes: the last-points blocks render with a plain `opacity-0` class
  (both layouts in `PointsSection`) and `useAnimatePoints` skips the exit
  tweens until the block has been shown once (`hasShownLastPointsRef`); both
  on-mount `clearProps:'all'` effects now run only when `pointsLayoutKey`
  actually changes mid-life (prev-key refs — fresh nodes have nothing to
  clear); and `PointsSection` no longer constructs a `CountUp` at all when
  `startVal === currentPoints` or animation is disabled (the constructor
  itself writes to the element — N no-op constructions per stage start).
- **Douze moment 178 ms → no task ≥90 ms.** The hearts grid choreography moved
  from a per-heart GSAP timeline (2×columns tweens, O(hearts) filters per
  column, per-column `innerWidth` reads) to compositor-run CSS animations
  (`.douze-heart-animated` in styles.css): per-column delays/scale as CSS
  vars, durations from the same `HEARTS_*` constants, grid keyed on `columns`
  so a ResizeObserver change still restarts the run. Grow right-to-left /
  hold / shrink left-to-right, name fade timings, theme fill colors, z-40
  layering and SFX-once semantics preserved; `LegacyParallelogramsAnimation`
  untouched. Per-column random scale is now fixed per mount (was re-rolled
  per timeline rebuild) — invisible.
- **countUp per-tick writes are `textContent`** via the public
  `plugin.render` hook (no fork); the 0.6 s duration is untouched
  (`COUNT_UP_DURATION_MS` coupling).

Verification: `yarn lint:types-cli` clean, ESLint clean on changed files,
stylelint unchanged (96 pre-existing), vitest 102/104 (same 2 stale
failures). Functional pass on the rebuilt preview: rounded (2026) and classic
(2016) themes — last-points enter/exit per award, hidden at stage start with
no flash, reset on juror advance; count-up animates through intermediate
values; douze hearts on the board (frozen mid-grow via `getAnimations()` to
inspect the stagger) and in the public-themes preview cards; undo restores
last-points; restart works. The intermittent setup→voting CLS 0.49 (known
loose thread) appeared in one after-run — pre-existing, unchanged by this
work. Changed files: `PointsSection.tsx`, `useAnimatePoints.ts`,
`DouzePointsAnimation.tsx`, `styles.css`.

**Teleport pop/double-fade fix (2026-08-30, user-reported on a 24-row 2005
Grand Final; a phase-2-era latent bug, not a Part C regression).** During a
multi-row teleport cycle a row could pop back to full opacity at the
mid-timeline reorder, fade out a second time, and start its fade-in from
part-way visible — desynchronizing the grouped choreography. Instrumented
root cause (per-row transition events + style-attribute mutations on a
39-row board): react-flip-toolkit's **`getSnapshotBeforeUpdate`** wipes
inline `opacity`/`transform` on every flip-id element but leaves the
`transition` property live, and its measure pass in `componentDidUpdate`
forces a style recalc in that wiped state — so when phase 2's re-assert
layout effect then restored `opacity: 0` *with the transition attached*, the
browser started a fresh 400 ms fade from the wiped (fully visible) value.
Whether a given row survived was a per-row transition-retargeting artifact,
which is why some rows looked grouped and others didn't. Fix:
`assertTeleportPhaseSettledStyles` — the post-wipe re-assert now writes the
in-flight phase's settled end values with `transition` removed (visually
equivalent: the out fade is ~70 % done, computed ≈0.1, when the flip fires),
leaving nothing to restart; the in-phase writes re-establish their own
transitions. Verified with the same transition-event instrumentation across
four bulk random-juror cycles on the 39-row board: every fade-out starts
from full, every fade-in from zero, no cancels above 0.3 opacity, no
mid-opacity restarts.

**5. Setup screen DOM (redesign hook).** 967 elements, **48 native `<select>`s**
(one per country row, 4 options each) and 37 individually-requested flag/logo
images. A redesign that replaces per-row selects with one shared assignment
control (or tap/drag-to-assign) would cut roughly a third of the DOM and the
matching accessibility tree; a sprite/symbol sheet would collapse ~40 image
requests into one.

**6. The gradient color picker is still the worst interaction in the app**
(35–41 fps). Phase 4 established the cause is inside
`react-best-gradient-color-picker` (its internal throttle is recreated per
event, so it never throttles; plus a per-move `getBoundingClientRect`).
`@uiw/react-color` is **already a dependency** — it drives the hue/shade
sliders that now run at 59–61 fps. Swapping the solid-colour case to it would
remove the bottleneck and a dependency; gradient-enabled overrides would need
either a small custom gradient editor or the heavy picker kept lazily for that
case alone.

**7. Radical option: is Next.js earning its keep here?** The App Router client
runtime is 82 KB raw / 22 KB gz of segment cache, router reducer and PPR
navigation code, for an app that is effectively one page. Add the RSC flight
payload (item 2) and that is a meaningful share of a first paint that renders
nothing on the server anyway. A Vite SPA plus a thin Worker for HTML/meta would
delete both. Against it: Next currently provides the Cloudflare deploy path,
i18n, `next/image`, and metadata/SEO — so this is a multi-week rewrite, and it
only pays off if item 1 (SSR shell) is *not* pursued. Pick one of the two, not
both.

**8. Stop guessing about real devices. DONE (2026-08-29).**
`src/app/web-vitals.tsx` reports LCP / INP / CLS / FCP / TTFB (values plus the
three Core Web Vitals' good / needs-improvement / poor ratings) to Umami as a
single `web-vitals` custom event, via Next's built-in `useReportWebVitals` — no
new dependency, ~3 KB gz added to the critical path. Values are buffered and
sent once on the first `visibilitychange → hidden` (or `pagehide`), because CLS
and INP keep changing while the page is open; a session that is killed without
ever backgrounding reports nothing. It no-ops wherever `window.umami` is absent
(dev, or a blocked analytics script), so it needs no separate env gating.
Everything in this document is still 4x-throttled emulation — the first weeks of
this event are what will say whether any of the remaining items matter to real
users, and on which devices.

### Two loose threads

- **Setup→voting CLS is intermittently 0.49** (measured 0.489 / 0.037 / 0.027
  over three runs; board rows settling from their pre-FLIP position at mount).
  It predates phase 3 and is an animation-timing issue, not a load one.
- **`react-best-gradient-color-picker` overlaps `@uiw/react-color`**, which is
  already in the tree and already drives the sliders that hit 59–61 fps. (The
  third of the trio, `@microsoft/clarity`, is now removed.)

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
