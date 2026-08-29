# Mobile performance investigation

> **Follow-up:** the runtime-smoothness investigation and the phased execution plan
> live in [performance-improvement-plan.md](./performance-improvement-plan.md) —
> start there; this document is the load-path background.

Date: 2026-08-29. Research only — no fixes applied. Raw artifacts (traces, Lighthouse
reports, screenshots, filmstrips) are in `../../perf-artifacts/` at the monorepo root.

## 1. Method

Everything below was measured against the **production build served by the Cloudflare
Workers preview** (`yarn preview` = `opennextjs-cloudflare build && opennextjs-cloudflare
preview`, Next.js 16.0.1 / Turbopack, wrangler 4.48.0, `http://localhost:8787`), not the
dev server. Two tool stacks:

- **Chrome DevTools MCP traces** (Chrome 151): viewport `390x844x3,mobile,touch`,
  CPU throttle 4x, network "Slow 4G" (DevTools preset). Used for observed traces of
  cold load, repeat load, and a scripted interaction session (start contest → full
  jury vote 1–12 → one "vote randomly" juror). Traces:
  `trace-preview-cold-firstvisit.json.gz`, `trace-preview-repeat.json.gz`,
  `trace-interaction.json.gz`.
- **Lighthouse 12.8.2 CLI** (`npx lighthouse@12 http://localhost:8787 --form-factor=mobile
  --screenEmulation.width=390 --screenEmulation.height=844 --screenEmulation.deviceScaleFactor=3
  --throttling-method=simulate`): simulated RTT 150 ms / 1.6 Mbps / 4x CPU, storage and
  HTTP cache cleared per run — this is the honest "first visit on mobile" number.
  Report: `lighthouse-preview.report.{html,json}`.

Chunk attribution was done from the Turbopack source maps in
`.open-next/assets/_next/static/chunks/` (note: map filenames do **not** match chunk
filenames; follow the `sourceMappingURL` comment at the end of each chunk).

Two environment caveats that qualify individual findings below:

- **The local preview does not compress responses.** Production does (verified:
  `curl -I https://douzepoints.app/` returns `content-encoding: br`). Lighthouse's
  "enable text compression, 106 KiB" finding is a local-preview artifact.
- Both DevTools traces show a reproducible **~580 ms gap between `navigationStart` and
  the document request being sent** (578 ms and 582 ms). Lighthouse shows no such gap
  (server response 10 ms). I could not attribute it to the app; it is most likely a
  trace-start/reload artifact of the MCP tooling. DevTools-trace LCP numbers below
  include it; treat them as ~0.6 s pessimistic.

## 2. Baseline: dev vs. production preview

| Metric (mobile, Slow 4G, 4x CPU) | `yarn dev` (prior baseline) | `yarn preview` (this run) |
|---|---|---|
| Lighthouse Performance | 67 | **74** |
| LCP (Lighthouse, cold first visit) | 9411 ms | **6.4 s** |
| — TTFB portion | 35 ms | 459 ms (simulated) |
| — render delay portion | 9376 ms (99%) | **5917 ms (92%)** |
| FCP | 0.9 s | 2.6 s |
| TBT | 350 ms | **60 ms** |
| Speed Index | 3.1 s | 2.6 s |
| CLS (load) | 0.00 | 0.00 |
| A11y / BP / SEO | 90 / 100 / 100 | 90 / 96 / 91 |
| DevTools trace LCP, warm HTTP cache | — | 2052 ms (repeat visit: 2060 ms) |

Where they disagree, and why it matters:

- **Dev overstates LCP by ~3 s and TBT by ~6x.** The dev-transpiled bundles inflate
  both download and eval. The prior LegacyJavaScript finding largely evaporates in the
  production build (13 KiB remains, and it lives in the Next framework chunk, not our
  transpile config). Conclusions drawn from dev traces about *magnitude* are unreliable;
  the *shape* (render delay ≈ all of LCP) is the same in both.
- **TBT 60 ms in production means the main thread is not the load bottleneck.** The 6.4 s
  LCP is almost entirely a serialized network waterfall (see finding 1).
- BP 96 and SEO 91 in preview are environment noise: the BP hit is a 429 from
  `gateway.umami.is` (analytics rate-limiting localhost), and the meta-description
  failure did not reproduce when fetching the document manually (it is present in the
  served HTML) — unexplained, see §5.
- Interaction metrics (preview, DevTools trace): **INP 475 ms** (pointerdown:
  5 ms input delay / 98 ms processing / **372 ms presentation delay**) and
  **CLS 0.34** during the setup→voting transition.

What the load actually looks like (cold trace, warm HTTP cache): HTML finishes ~1.4 s
(101 KB uncompressed locally) → hydration task 152 ms → *then* the client fetches the
`Main` chunks (~1.5 s in) → second render task 86 ms → FCP = LCP at ~2.05 s. Cold-cache
(Lighthouse) stretches the same chain to 6.4 s because ~300 KB gz of JS must download
before anything meaningful renders, and the LCP element needs a *second* round trip
after that.

## 3. Weak points, ranked by measured impact

### 3.1 The entry route is 100% client-rendered behind a two-level dynamic-import chain — ~5.9 s of the 6.4 s LCP

Evidence: Lighthouse LCP breakdown — TTFB 459 ms, load delay 0, load time 0, **render
delay 5917 ms**. The LCP element is plain static text (`<p class="text-sm text-white/50
text-center">`, a widget description from
[WidgetContainer.tsx:39](../src/components/common/WidgetContainer.tsx#L39)) that exists
nowhere in the server HTML. The chain: HTML → 19 render-critical chunks (~1.05 MB raw /
~300 KB gz) → hydrate → `dynamic(() => import('views/Main'), { ssr: false })` in
[page.tsx:5-7](<../src/app/(main)/page.tsx#L5-L7>) triggers a **second network round
trip** for the Main/EventSetupModal chunks (`95ec…` + `031e…`, visible in the trace
starting only at ~1.43 s, ~750 ms after the initial chunks finished) → client renders the
setup modal. `views/Main.tsx` adds a third level for `Simulation` the same way.

The server (OpenNext on Workers) is already doing SSR work — it just renders an empty
shell because the page opts out. TTFB is 10–35 ms everywhere measured; all the budget is
burned client-side. Confidence: high (this is the direct reading of both tools).

### 3.2 "Start contest" pays two lazy-chunk waterfalls plus a ~900 ms main-thread block

Evidence, interaction trace: clicking **ПОЧАТИ** fetches 5 chunks, ~470 KB raw, taking
~1.3 s on Slow 4G before the running-order dialog is complete. 270 KB of that is a single
chunk that is ~85% **zod + react-hook-form**, pulled in statically by
[usePostSetupStageForm.ts](../src/components/setup/post-setup/hooks/usePostSetupStageForm.ts)
via the (correctly lazy) `PostSetupModal` at
[EventSetupModal.tsx:66](../src/components/setup/EventSetupModal.tsx#L66). Another 71 KB
chunk is pure **gsap**, loaded here before any animation runs.

Clicking **ПОЧАТИ SEMI-FINAL 1** then fetches 7 more chunks (~140 KB, ~650 ms) and hits
the worst main-thread cluster of the whole session: back-to-back tasks of **244 ms +
386 ms + 256 ms** (React mounting the board + GSAP setup) — this is also where the
measured INP interaction (475 ms, 372 ms of it presentation delay) and the CLS burst
live. On a mid-range phone the tap-to-board delay is roughly 2 s. Confidence: high for
the numbers; the 386 ms task attributes to the framework chunk (React commit), so the
split between React mount and GSAP init inside it is inferred, not proven.

### 3.3 GSAP board animation forces synchronous reflows — 478 ms of forced layout, 145–200 ms frames during voting

Evidence: the ForcedReflow insight attributes **478 ms** of forced synchronous layout to
a function inside the gsap chunk (chunk `75f9959c…` is 100% gsap per its source map),
called from React effects. During the vote sequence the trace shows repeated long tasks
of 145–200 ms (five-plus in a row at each board reorder), and style recalculation totals
**1851 ms** across the ~2-minute session (plus 419 ms layout). At 4x throttle that is
~5–7 fps during the teleport choreography. The likely site is the teleport mode's
measure/animate cycle in
[useBoardAnimations.ts](../src/components/board/hooks/useBoardAnimations.ts) (it is the
GSAP-driven board path per `docs/theme-animations-and-specifics.md`), with
`react-flip-toolkit` (flip mode, separate chunk `d01ff47…`) also reading layout.
Confidence: high that GSAP-driven reflow is the cost; **medium** on the exact hook —
I did not step through frames to separate teleport vs. FLIP vs. douze-points overlay.

### 3.4 CLS 0.34 when the simulation view mounts

Evidence: a single layout-shift cluster, score **0.3418**, whose impacted element is the
`div` with `qualified-countries-panel--rounded` + `bg-gradient-to-tr from-primary-950
to-primary-900` — the presentation panel container at
[PresentationPanel.tsx:281](../src/components/presentationPanel/PresentationPanel.tsx#L281).
`PresentationPanel` is dynamically imported in
[Simulation.tsx:33-35](../src/components/simulation/Simulation.tsx#L33-L35) with no
reserved space, so when its chunk arrives (~650 ms after the board on Slow 4G) it lands
into the layout and shoves the board. Load-time CLS is 0.00; this is purely the
setup→voting transition. Confidence: high on the element (class match is exact), medium
on the mechanism (late-mounting dynamic import is the timing-consistent explanation; the
insight itself reported "no root cause identified").

### 3.5 The eager bundle carries the entire scoreboard engine before first paint

Evidence: the render-critical chunk `0214ed…` (267 KB raw / 73 KB gz) contains, per
source map: `state/scoreboard/votingActions.ts` (62 KB source — the largest file in the
app), `theme/themes.ts` (50 KB — all 30+ year themes), `generalStore`, `countriesStore`,
plus **axios** (104 KB src), **@tanstack/query-core**, **lodash** (35 KB src), zustand,
idb. This is reachable from `layout.tsx` → `AppBootstrap` → hooks → `scoreboardStore`,
so it must download and evaluate before hydration completes — i.e., before finding 3.1's
second round trip can even start. Lighthouse flags ~58 KiB of it unused at load (50% of
`0214ed…`). Total script eval on the cold load is ~700 ms at 4x CPU (bootup-time:
381 ms in the framework chunk, ~100 ms here, rest spread). Impact is real but secondary
to 3.1: it fattens the first hop of the waterfall rather than adding hops.
Confidence: high (source maps + request timing).

### 3.6 ~96 KB of every HTML response is the full i18n catalog

Evidence: the served document is ~101 KB (curl) / 143 KB (Lighthouse transfer), of which
96 KB is inline `self.__next_f.push` flight data — dominated by the complete next-intl
message catalog for the active locale (`messages/en.json` alone is 80 KB; `uk.json`
119 KB). Every route pays this on every navigation. In production this compresses to
roughly 15–25 KB wire (brotli), so the user-facing cost is parse + the fact that it
inflates the first, render-blocking hop; locally it added ~700 ms to the document
download in the DevTools trace. Confidence: high on composition; the *production* wire
cost is estimated, not measured.

### 3.7 Accessibility 90: one component explains 19 of the failures

- **19 × "button has no accessible name"**: every failing node has the class signature of
  [common/Button.tsx](../src/components/common/Button.tsx#L67-L77). Icon-only usage
  relies on `title` — which the component *removes* when its own tooltip is shown
  (`title={showTooltip ? undefined : title}`), and it neither accepts nor forwards
  `aria-label` (the `aria-label="Setup"` passed in
  [Main.tsx:46](../src/views/Main.tsx#L46) is silently dropped — it is not in `Props`).
- **2 × contrast 3.78:1**: the same widget-description `<p>` as the LCP element
  (`text-white/50` over the gold widget background,
  [WidgetContainer.tsx:39](../src/components/common/WidgetContainer.tsx#L39)).

### 3.8 Minor, measured, post-LCP

- **~40 individual flag/logo requests** (`/hostingCountryLogos/*.svg|png`) saturate the
  throttled connection from ~1.6 s to ~5.6 s after navigation on the setup screen, and 15
  more `flags/*.svg` load at board mount. All post-LCP; partial lazy-loading already
  exists ([CountrySelectionListItem.tsx:110](../src/components/setup/CountrySelectionListItem.tsx#L110)).
- **xlsx is bundled twice**: chunks `a17aa5…` and `796fac…` are each 412 KB raw and each
  contain the full 875 KB-source xlsx library (reached from `voteSpreadsheet.ts` via two
  different dynamic subtrees). Lazy, so it costs nothing at boot — but anyone touching
  spreadsheet import pays double, and it doubles deploy weight.
- Fonts are fine: `font-display: swap` on all 52 faces, no preload. Montserrat finished
  77 ms before LCP in the warm trace, but with swap it cannot have gated the text paint.
- The anti-FOUC inline script is **not** a problem: first-visit and repeat-visit LCP are
  within 8 ms of each other (2052 vs 2060 ms); the script itself is microseconds and only
  helps repeat visits (background image starts immediately).

## 4. Proposed fixes

### Safe / mechanical (no theme, tiebreaking, or animation pipeline involvement)

| Fix | Expected gain | Effort | Risk |
|---|---|---|---|
| Kill the second round trip: keep `ssr: false` but emit `<link rel="preload">`/`modulepreload` for the `Main` + `EventSetupModal` chunks (or import `Main` statically inside the already-client page and rely on Next's chunking) | ~0.7–1.5 s LCP on Slow 4G (one full RTT+download level removed) | S | Low |
| Split zod + react-hook-form out of the post-setup path (lazy-import the resolver, or validate the running-order dialog without zod) | ~0.8 s off the ПОЧАТИ tap on Slow 4G (270 KB → ~10 KB for that chunk) | S–M | Low |
| Reserve space for `PresentationPanel` (min-height skeleton in `Simulation`'s layout) | CLS 0.34 → ~0 for the transition | S | Low |
| `Button.tsx`: accept and forward `aria-label` (default it to `title` for icon-only), keep `title` present | +~8 a11y points (19 failures → 0) | S | None |
| Bump widget description contrast (`text-white/50` → `/70` or a token) | remaining a11y contrast failures | S | Visual review needed |
| Deduplicate xlsx into one shared async chunk (single dynamic entry point re-exporting it) | −412 KB deploy / one-time saving for spreadsheet users | S | Low |
| Trim the eager chunk: drop lodash (per-method imports or native), consider fetch wrapper vs axios | ~15–25 KB gz off the critical first hop | M | Low–Med |
| Split i18n messages by namespace so the document only inlines what the shell needs | ~10–20 KB wire + less flight parse; bigger win for uk/gr locales | M | Med (touches every `useTranslations` namespace assumption) |

### Touching the theme / animation / store pipeline (needs care + the docs in this folder)

| Fix | Expected gain | Effort | Risk |
|---|---|---|---|
| Server-render the first-visit shell (setup modal frame + widget cards are static text; hydrate state-dependent parts). This attacks the 92% render delay directly | plausibly 2–3 s LCP; FCP and LCP converge | L | High — the whole tree assumes client-only (localStorage-driven stores, `suppressHydrationWarning` theming); hydration mismatches are the failure mode |
| Batch GSAP reads/writes in the teleport choreography (measure all positions first, then mutate; `gsap.ticker`/`quickSetter`), and audit `useBoardAnimations` for read-after-write | removes up to ~478 ms forced reflow per sequence; smoother voting on mid-range phones | M–L | High — `docs/theme-animations-and-specifics.md` choreography is intricate; needs visual regression across flip/teleport themes |
| Lazy-init year themes: load only the active year's theme object instead of all of `themes.ts` eagerly | ~10 KB gz off eager chunk + less eval | M | Med — `resolveThemeSpecifics*` and the FOUC path read theme objects synchronously |
| Decouple `scoreboardStore` (votingActions et al.) from the boot path so hydration doesn't need the voting engine | shrinks first hop; helps every route | L | High — store wiring is the app's spine |

Suggested order if picking a few: rows 1–4 of the mechanical table are independent,
low-risk, and together should take Slow 4G LCP from ~6.4 s to roughly 4.5–5 s and fix
CLS and most of a11y; the SSR-shell work is the only thing that gets LCP near 2.5 s but
is a project, not a patch.

## 5. Suspected but not confirmed

- **~580 ms navigationStart→request gap in both DevTools MCP traces.** Reproducible
  (578/582 ms), absent under Lighthouse. Presumed tooling artifact; if it were real,
  every DevTools number above improves by ~0.6 s. Not attributed to the app.
- **The exact split of the 386 ms board-mount task** between React commit, GSAP init, and
  first layout is unattributed — the trace only names the framework chunk. Would need a
  dev-server profile (readable frames) reproduced against preview.
- **Which animation path forces the reflows** (teleport out/in phases vs. FLIP fallback
  vs. douze-points overlay measuring). GSAP is proven; the calling hook is inferred.
- **Lighthouse's "no meta description"**: the served HTML contains one (verified via
  curl, English locale). Possibly locale- or timing-dependent; did not reproduce
  manually. Ignore until seen again.
- **Production edge numbers.** Everything here is local preview; real Cloudflare adds
  brotli (helps) and real-world RTT to the edge + R2/CDN assets (hurts). CrUX had no
  data for the origin, so there is no field baseline to calibrate against. Worth
  re-running Lighthouse against https://douzepoints.app before/after fixes.
- **`react-snowfall` / seasonal effects** (`SnowfallAnimation` in `Main.tsx`) rendered
  nothing in these traces (out of season?); cost unmeasured, could matter when active.
