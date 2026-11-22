---
name: add-douze-animation
description: Recreate a contest's douze points (12 points) animation from broadcast footage as a spec in src/douze/, from reading frames to shipping it as a theme mode. Use when adding a douze animation, recreating a year's 12 points animation, or reworking an existing spec.
---

# Add a douze points animation

A broadcast's 12 points animation, rebuilt as a `DouzeAnimationSpec`: layers placed against the row's parts on one clock, played by `DouzeSpecPlayer`. Read `docs/theme-animations-and-specifics.md` §10 before step 4: it holds the model, the layer kinds and options, the player and the board timing. The worked example is 2022: `src/douze/specs/year2022.ts` and its notes in `.scratch/douze-animations/esc-2022-breakdown.md` (v1 to v3, with what the owner rejected and why).

Paths and commands below are relative to the frontend package, `eurovision-scoreboard/`. The skill is also linked into the monorepo root's `.claude/skills/`, so in a session started at the root, run them from `eurovision-scoreboard/` (`yarn`, `node scripts/…`). The backend list in step 8 is in the sibling `douze-points-backend/`.

Names used below:
- **mode**: `year<YYYY>` for ESC (`year2022`); another series gets its own prefix (`jesc2023`). The spec's `id` is the mode.
- **`$S`**: the work folder, `.scratch/douze-animations/<year>/` (gitignored). The clips, `Douze<year>_<n>.mov`, sit in it or one level up.
- **t**: ms from the animation's first changed frame (**t0**), the lab's clock.

## 1. Footage

The owner records the clips; ask for them if they aren't in `.scratch/douze-animations/`. Ask for two or three 12s from the same show:
- different name lengths, and flags with two and three colours;
- ideally one where the row climbs afterwards;
- screen recordings at the broadcast's frame rate, the whole row plus margin, from a second before to a second after.

One clip is enough to start. The second tells design from noise: what repeats in both clips is design (2022's torn edges), and what changes is flag colour or chance.

Done when: the clips are in place and `ffprobe` gives their frame rate.

Screen recordings are often variable frame rate (`avg_frame_rate` well below `r_frame_rate`; 2026's: a 25 fps broadcast captured at 60 Hz). `ref` maps t to frame numbers with `r_frame_rate`, so first make a constant-rate copy and read that: `ffmpeg -i Douze<year>_1.mov -vf fps=60 -c:v libx264 -crf 8 -pix_fmt yuv420p $S/cfr1.mp4`.

## 2. Read the frames

```sh
F="node scripts/douze-frames.mjs"   # header of the script: every option
$F frame <clip> 0 $S/frames/full.png                                     # find the row: crop W:H:X:Y
$F sheet <clip> --crop W:H:X:Y --count 60 $S/frames/c1                   # numbered frames: find t0
$F ref <clip> --crop W:H:X:Y --t0 <n> --to <end> $S/ref/c1               # a frame every 100 ms
$F ref <clip> --crop W:H:X:Y --t0 <n> --step 50 --from <mid> --to <end> $S/ref50/c1
```

t0 is the first frame where anything changes (2022's Serbia clip: n = 3). Read every sheet frame by frame; for small details, crop a frame tighter and scale it 2× with ffmpeg (`scale=iw*2:-1:flags=lanczos`).

For an edge that sweeps (a fill, a wipe), measure it instead of eyeballing: read one pixel line through the row from each frame (`ffmpeg … -vf "select=…,format=rgb24,crop=W:1:X:Y" -f rawvideo -`), find the edge by colour, and fit a `cubic-bezier` to the first frame of each new position (2026's fill and exit are fitted that way).

Done when, for every element you can see, you've written down its start and end time, its place as a share of the row's width (flag, name, last-points box, total), where its colour comes from, and how it moves: direction, speed, ease, whether it stops.

## 3. Breakdown and questions

Write `$S/breakdown.md` with the 2022 breakdown's sections: a `Status:` line, sources with their t0s, positions, a timeline table, fixed vs varies across the clips, how you'd build each layer (an existing layer kind, effect or painter, or a new one), and integration.

Then ask the owner (AskUserQuestion) what the footage can't answer:
- Colours: a fixed palette or each country's flag colours (`paletteFrom: 'flag'`)?
- The 12 box: does the animation own its entrance (a copy with `hideSource` slides in, as in 2022), or does it play over the theme's usual slide?
- Board order: does the row climb after the animation (`reorder: 'after'`) or keep the board's own order (`'before'`)? With `before`, a teleporting board (the default) moves the row first and the animation plays at its new place; a flipping board moves it 1 s in, under the animation. Describe both cases when you ask.
- Parts of the row the app animates on its own: the 12 box enters with every award, so with `before` on a teleporting board it is already out when the animation starts. Restaging its entrance there makes it vanish and come back (2026 sweeps the gold into the box instead).
- The editor label: "<what it looks like> (ESC <year>)", like "Sound waves (ESC 2022)".

Done when: the answers are recorded in the breakdown.

## 4. Build the spec

Register first, so the lab and the tests see it:
- `src/douze/specs/year<YYYY>.ts` exports `year<YYYY>Douze`, with `id: '<mode>'`.
- Add the mode to `DouzePointsAnimationMode` (`src/theme/types.ts`), `DOUZE_POINTS_ANIMATION_MODES` (`src/theme/themeSpecifics.ts`, at its year: the theme editor lists them by the year in their labels, and a test checks it) and `SPECS` in `src/douze/registry.ts`.
- Add it to the lab's `SPECS` (`src/components/dev/douze/DouzeLab.tsx`), with the year whose theme it belongs to.

`src/douze/registry.test.ts` checks every registered spec. Its labels test fails until step 8.

Build in the order the clip plays, comparing as you go (step 5). The **lessons** from 2022:
- **Motion never stops until the end.** Holding a layer in place while it fades reads as the animation slowing down. That was the owner's main reason to reject 2022's v1. Hand the movement on: waves drain into the box while their trailing edge sweeps after them.
- **Explicit opacity.** A layer that starts hidden needs `opacity: 0` at its first keyframe. Each property holds its first value back to t = 0, which showed 2022's strands early and hid its wash.
- **Shape follows the row.** Put everything inside the row in `clipTo: 'row'`, and use `radius: 'anchor'` for fills shaped like the row. When another part draws over a part you copy, use `cutBy` (2022's box sits under the total's curved edge). Check base 2026, where rows are pills.
- **Relative sizes only.** Use shares of anchors plus `…Rh` row heights, never px, so one spec fits phone, board and the zoomed column layout.
- **Deterministic.** Effects are seeded (`mulberry32` in `effects.ts`) and painters are pure functions of the clock, so a held frame matches the playing one.
- **Cheap to play.** Animate only transform, opacity and clip-path. Mark costly layers `heavy`: blurred glows, canvas painters and glitch filters. With Lite on, what's left must still read as the animation, and the parts it takes over (the 12 box) stay.
- **Customizable.** Give every layer that isn't core a `group` and list the groups as the spec's `parts`, in the order the editor should show them; reuse 2022's ids where the meaning matches (`glitch`, `sweeps`, `burst`, `waves`, `flash`, `wash`). Tag glows `intensity: 'glow'` and a white veil `intensity: 'wash'`; give the veil's fill `var(--douze-veil)` and the palette `veil: '#ffffff'`, so its colour can be changed. Try the combinations with the lab's option controls (each part off, Glow and Veil at 0, both speeds' ends).
- **Colours from one.** When the broadcast uses one colour for every country, give the spec a fixed palette and build everything from `c1` and the keys mixed from it (`sheen`, `shade`, `glow`, `ink`), so flag, theme and custom colours keep the look and the editor shows one custom swatch. Set `themeColors` when the theme colour the animation should take isn't the 12 box (2026: the douze colour).
- **Layouts.** Rounded and square rows stack their parts differently (the strip over the points, or under them). Use `cutBy` for every part that may cover the layer's part: only those that do, by paint order, are cut. Check base 2022 in the lab, not only 2026, and a custom theme's look: the lab's row, points-shape (transparent too) and total-colour pickers (a colour with no blue, like dark red, once broke the cuts).
- **Reuse.** Shared helpers (`flash`, `veil`, placements in `year2022.ts`) move to `src/douze/specs/helpers.ts` once a second spec needs them. A new effect, painter or layer option goes in `effects.ts`, `painters.ts` or model + timeline + player, with a test in `timeline.test.ts` and a line in §10.

Done when: the spec plays from t = 0 to its end in the lab and every element in the breakdown has a layer.

## 5. Compare in the lab

Run `yarn dev` (or reuse a running server) and open `/dev/douze-lab` with the chrome-devtools MCP. Set the spec, the clip's country, its base year and width 416. Set Strip step 100, from 0, to the duration. Then:

1. `take_screenshot` with `fullPage: true` and `filePath` set to an absolute path to `$S/lab/strip.png` inside the repo (the MCP only writes inside the workspace).
2. `evaluate_script` with the function below, then Write its JSON to `$S/lab/rects.json`:
   ```js
   () => ({
     dpr: devicePixelRatio,
     rows: [...document.querySelectorAll('[data-lab-t]')].map((el) => {
       const r = el.getBoundingClientRect();
       return { t: Number(el.dataset.labT), x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height };
     }),
   })
   ```
3. Run `node scripts/douze-frames.mjs compare $S/lab/strip.png $S/lab/rects.json $S/ref/c1 $S/compare-v<N>.png` and read the image: the reference is on the left, the lab on the right.

Fix the spec and repeat. Then do the second half at 50 ms: Strip step 50 from mid-animation, against `$S/ref50/c1`. Stills hide pace, so also Play at ×1 and ×0.25 next to the reference video (the lab's file input; its "t=0 at" is t0 in ms).

Also check:
- a two-colour and a three-colour flag, and the second clip's country;
- base 2026 (pill rows);
- Phone (320) width;
- Lite.

Done when: every pair matches its reference within a frame in place, colour and timing, and the second half keeps moving. Any difference left is listed as a known gap in the breakdown.

## 6. On the board

Run a real simulation on the year's theme. Choose it through a custom theme with this mode, or set the year's `themeSpecifics` early (step 8).

Record with the MCP's `screencast_start` / `screencast_stop` into `$S/board.mp4`, plus a slowed copy (`ffmpeg -i board.mp4 -vf setpts=4*PTS board-slow4x.mp4`). The screencast gets no frames while an `evaluate_script` is running or the tab is in the background: start the clicks from an `evaluate_script` that schedules them and returns at once, then start the screencast, and wait with a Bash `node -e 'setTimeout(() => {}, 15000)'`. For timing, sample the row and the player (`data-douze-layer` nodes, their `getAnimations()[0].currentTime`) from inside the page. The 2026 theme's board teleports; to check a flipping board, set `boardAnimationMode: 'flip'` on the year's `themeSpecifics` for the test and revert it. Cover these cases:
- a 12 to a low row;
- a 12 to the leader, whose row doesn't move (the next jury clears the 12 at once; the overlay must still play to its end);
- the same country given 12 twice in a row;
- a jury vote given all at once.

Check the frame rate with `emulate` at 6× CPU throttling. 2022 held about 56 fps.

Done when:
- the animation plays where the row is, with no jump;
- the row climbs only after it ends (with `reorder: 'after'`);
- nothing is left behind once it ends;
- the second 12 plays again;
- the frame rate holds under throttling.

## 7. Owner review

Give the owner the comparison images, the board recordings and the known gaps, and ask them to try it in the lab and on the board. Their feedback sends you back to step 4. Record each round in the breakdown as `## v<N>`: the feedback, what changed, and the new files.

Done when: the owner says it's ready to ship.

## 8. Ship

- [ ] Add the label `widgets.themes.visualDetails.douzePointsAnimations.<mode>` in every `messages/*.json` (translated), and a label under `widgets.themes.visualDetails.douzeOptions.parts` for each new part id, then run `yarn gen:messages`.
- [ ] In the year's entry in `src/theme/themes.ts`, set `themeSpecifics: { douzePointsAnimationMode: '<mode>' }`.
- [ ] Backend: add the mode to `THEME_DOUZE_POINTS_ANIMATION_MODES` (`douze-points-backend/src/themes/theme-douze-modes.ts`), then run `npm test` and `npm run build` there.
- [ ] Docs: add the mode to the list in §5 of `docs/theme-animations-and-specifics.md`, and anything new in the model to §10.
- [ ] Run `yarn vitest run src/douze src/i18n src/theme src/components/countryItem` and `yarn lint:types-cli`, then `npx eslint` on the touched files. Don't run `--fix` on whole files: it reformats unrelated code.
- [ ] Set the breakdown to `Status: done`.

Tell the owner the release order:
1. Deploy the backend first. Until then, saving a custom theme with the mode fails validation.
2. Commit and deploy the website.
3. Suggest the live update: `yarn live-update publish --mode prompt` for a new animation. Never run it yourself.

Older app bundles show the hearts for themes using the new mode.
