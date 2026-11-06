# Haptics (native apps)

The apps play haptics through the simulation (a tap for each award, a
signature for the douze, the board climbing, the final reveal's heartbeat,
the winner's fireworks) and around it: drag and drop, shuffles, the stage
start, the allocation draw, tabs, sliders, switches, the graphics studio's
snapping, success / warning / error toasts and confirmations. The website has
none. Added 2026-11-06; needs the store build that ships the DouzeHaptics
plugin (§2).

The flow is **moment → cue → pattern → platform**. Call sites name a moment
(`playHaptic({ id: 'douzeHit' })`) at the frame it becomes visible;
`src/native/haptics/` builds the cue's pattern, decides whether it may play,
renders it for the platform and sends it to the native plugin.

## 1. Files

| File | What |
|---|---|
| `src/native/haptics/types.ts` | The neutral pattern format |
| `src/native/haptics/cues.ts` | The cue catalog: one pure builder per moment |
| `src/native/haptics/render.ts` | Pure renderers: iOS events, Android steps, fallback presets |
| `src/native/haptics/simple.ts` | Simple mode: one device effect per cue, or none |
| `src/native/haptics/index.ts` | Runtime: `playHaptic`, admission, backend, live rumble, the reveal heartbeat, the debug log |
| `src/native/haptics/haptics.test.ts` | Cue, renderer and admission tests |
| `src/state/scoreboard/votingHaptics.ts` | Award helpers the voting actions call |
| `src/components/board/hooks/boardMoveHaptics.ts` | The climb cue for a board reorder |
| `src/components/simulation/hooks/useSimulationHaptics.ts` | Engine warm-up, winner fireworks |
| `ios/App/App/DouzeHapticsPlugin.swift` | iOS plugin (Core Haptics); registered in `SceneDelegate.swift` |
| `android/.../DouzeHapticsPlugin.java` | Android plugin (composition primitives); registered in `MainActivity.java` |
| `src/hooks/useSliderHaptics.ts` | Detent ticks for range inputs |
| `src/app/dev/haptics-lab/page.web.tsx`, `src/components/dev/haptics/HapticsLab.tsx` | The dev-only Haptics lab (§5) |

## 2. Patterns and platforms

A pattern is a list of events, times in ms from the cue's start:

- **tap**: one knock, `intensity` and `sharpness` 0–1.
- **hum**: a sustained vibration with a `duration` and a `shape`
  (`flat`, `rise`, `fall`, `swell`).

Events can pick an Android primitive by hand (`android: 'thud'`) or leave a
platform out (`only: 'ios'`). A pattern also has a `priority` (§4), an
optional `holdMs` and an optional hand-written `fallback`.

**iOS** (`renderIos`): taps become Core Haptics transients, flat hums
continuous events. Shaped hums are stepped into 40 ms continuous events of
changing intensity, because a Core Haptics parameter curve scales every
event playing at the time and would dim the taps laid over a hum. The plugin
keeps one `CHHapticEngine` running while the app is active (no auto
shutdown, so a tap is felt on the frame it is sent; the system stops it in
the background and the next call restarts it), on one serial queue.
`interrupt` (priority 2+) stops the players still ringing. A live player
(`startLive` / `updateLive` / `stopLive`, a looping 30 s continuous event
driven by `hapticIntensityControl`) carries the final reveal's rumble.
iPads and the simulator report `supportsHaptics: false` and play nothing.

**Android** (`renderAndroid`): taps become `CLICK` / `TICK` (sharp) or
`THUD` / `LOW_TICK` (dull); hums `QUICK_RISE` / `SLOW_RISE`, `QUICK_FALL`,
rise + fall for a swell, or a train of low ticks 45 ms apart for a flat
rumble. Compositions play primitives one after another, so the renderer
drops a step that starts deep inside the previous one, and the plugin turns
the absolute times into delays using the device's real primitive lengths
(`getPrimitiveDurations`). Missing primitives are swapped along a chain
(`lowTick → tick → click`, `slowRise → quickRise → click`, …). A composition
is split where the gap passes 400 ms or it reaches 16 primitives, and the
parts are scheduled on the main looper. Without composition support (Android
10 and older, or a motor with no primitives, like the realme RMX3630, which
also has no amplitude control) knocks become the device's own predefined
tick / click / heavy click (one-shot pulses on Android 8–9), and rises,
falls and spins a pulse whose length carries their weight (40–80 ms); pulses
closer than 50 ms are dropped. Every vibration uses
`USAGE_MEDIA` (Android 13+; `USAGE_GAME` audio attributes before), so the
system's media-vibration setting governs it, not touch feedback. A new
vibration always replaces the running one, which is why the priorities exist.
Android has no live parameter control: the live methods are no-ops.

**Simple mode** (`simple.ts`, decided in `currentMode()`): on Android
without composition primitives (`getCapabilities().composition` false, a
motor that can only knock, like the realme RMX3630) and with the fallback
backend, every cue becomes at most one of the device's own effects: tick
(an award, controls), click, heavy click (the 12, a lock-in, the reveal's
crossing), double click (the winner, success). The busy moments play
nothing: board moves, page turns, zones and slots passed in a drag, the
hearts, the reveal's heartbeat, the score count, the draw's pick and chips.
Decided 2026-11-06 after full patterns on that phone felt like constant
buzzing. A strength below 0.5 also drops the ticks. The lab can force either
mode. Phones with composition support (Pixels) and iPhones keep the full
patterns.

**Fallback** (`renderFallback`): a binary without the DouzeHaptics plugin
(`Capacitor.isPluginAvailable` false) gets `@capacitor/haptics` presets: at
most 6 per cue, 70 ms apart, light / medium / heavy by intensity unless the
cue lists its own (`success` for the winner). Bundles built after the plugin
landed don't reach older binaries (native runtimes, native-apps.md §11), so
this mainly covers development builds.

**Leading silence**: a pattern whose first event comes later (the hearts'
first heartbeat at 120 ms) is sent only at that moment
(`rebasePattern`), so it doesn't cut the cue still playing (the douze hit a
frame earlier) before it has anything to play.

**Strength**: `settings.hapticsStrength` (0.3–1, Settings → Effects, under
"Haptic feedback") multiplies every intensity. Below 0.5 the fallback presets
step down one level.

## 3. The cues

Timings follow the animations; the comments in `cues.ts` name the constant or
timeline each one tracks.

| Cue | Fired from | Priority |
|---|---|---|
| `points` (graded by value) | `giveJuryPoints` (also predefined and presentation awards) | 0 |
| `pointsFlurry` (ends with the douze hit when it includes one) | grouped points, `giveRandomJuryPoints` | 1 / 2 |
| `douzeHit` | the 12's award, same call sites | 2 |
| `douzeBloom` `hearts` / `sweep` | `HeartsGridAnimation` mount / `useAnimatePoints` parallelograms | 2 |
| `climb` (ticks per place, double tap for the lead, a rise for the douze) | `useBoardAnimations`: the teleport timeline's start, or the FLIP move | 1 / 2 |
| `televote` (longer for a bigger share of the maximum) | `giveTelevotePoints` (not for the final reveal's buffered award) | 1 |
| `nulPoints` | `giveTelevotePoints` with 0 | 1 |
| `votingRush` | both "Finish randomly", jury scale "Finish randomly" | 2 |
| `scaleStep`, `spokespersonDouze` | `advanceJuryScaleReveal` | 1, 2 |
| `nextJury` (page turn) | `resetLastPoints`, when the board clears | 0 |
| `undo` | the header's undo button | 1 |
| `qualifierCards` | `SplitScreenQualifierModal` timeline start | 1 |
| `qualifierLockIn`, `nonQualifiers` (600 ms after the last pick) | `pickQualifier`, `pickQualifierRandomly` | 2, 1 |
| `revealBeat` (via `createHapticHeartbeat`) | `useRevealAnimation` phase 2a | 1 |
| `revealCross` / `revealFall`, then `revealWinnerFlash` / `revealHold` 1 s later | `useRevealAnimation` timeline labels | 3 / 2 |
| `winnerFireworks` | `useSimulationHaptics`, on the confetti's gate | 3 |
| `winnerReveal`, `winnerScore` | `WinnerModal` open and count-up | 3, 2 |

Outside the simulation:

| Cue | Fired from | Priority |
|---|---|---|
| `dragLift`, `dragOver` (each new zone), `dragDrop` / `dragCancel` | `LineupDndProvider` (lineup tiles: stages, pool, groups) | 1, 0, 1 |
| `dragLift`, `dragSlot`, `dragBoundary`, `dragDrop` / `dragCancel` | `SortableList` (every sorted list: running order, voters, points system, stage order, rank lists). `hapticBoundary` marks the running order's halves; non-row children carry `data-sortable-ignore` | 1, 0, 1, 1 |
| `dragBoundary` | "Move to the other half" (`useRunningOrder`) | 1 |
| `shuffle`, `sortSweep` | running order and voters quick sorts, Draw halves | 1 |
| `curtainUp` | `startEvent`, `continueToNextPhase` (eventActions), with the board's rise-in | 2 |
| `drawPot`, `drawPick`, `drawChip`, `drawFlight` | `useDrawCeremony` step timelines, durations divided by the draw speed; "Draw next" skips a reveal's cues and plays one short landing | 1, 1, 0, 1 |
| `drawDone` | the ceremony's `finish` (last reveal, Skip to result, Instant result) | 2 |
| `selection` | `Tabs`, `RelSegmented`, the studio's `Seg` | 0 |
| `sliderTick` (firmer at the ends and detents) | `RangeSlider`, `DivergingSlider` (0 is a detent), the studio's `RangeField`, via `useSliderHaptics`: every step, or every 5% past 40 steps | 0 |
| `toggle` (on: a knock and a catch; off: one softer knock) | `ToggleButton`, settings `SwitchRow` row clicks, `Checkbox`, the studio's `Toggle` | 0 |
| `snap` | the studio's `useGestures`: a new snap guide, straight rotation, each 15° stop with Shift | 0 |
| `success`, `warning`, `error` | every toast of that type (`toast-root.tsx`, `toast.onChange`), unless another cue played within 300 ms before or 80 ms after it (the action already had its own cue: a drop that moved a country) | 1 |
| `warning` | `useConfirmation` opening an alert or danger dialog | 1 |

Measured in the 2026 theme (teleport) for a 12 to the last-placed country:
`douzeHit` at the tap, `climb` at 1.04 s as the row fades out (landing tap at
1.64 s with the fade-in), `douzeBloom` at 2.07 s with the hearts, `nextJury`
at 5.04 s when the board clears. In flip themes the overlay mounts with the
award, so the bloom follows the hit and the row moves at 1 s. Final reveal:
the heartbeat from the fill's start, the outcome at the end of phase 2a
(9 s at speed 1), the gold flash 1 s later, the fireworks when the reveal
completes, the modal's ta-da 3 s after.

**Rules for new call sites:**

- Fire at the frame the user sees the moment: in the store action for an
  award, in the GSAP timeline (`timeline.call` at an absolute position, which
  never lengthens it) or the mount effect for an animation.
- Don't ride on theme sounds. `playThemeSound` events fire on their own
  schedule (the douze sound comes with the overlay, the winner sound 1 s after
  the stage ends even under the final reveal); haptics used to follow them and
  landed late.
- Skip theme previews (`isThemePreview`).

## 4. Admission

`admitHapticCue` (pure, tested) refuses a cue while a stronger one is held
(`holdMs`, defaulting to the whole pattern) and spaces priority-0 ticks at
least 35 ms. Equal or stronger cues play. Then the setting
(`enableHaptics`), a hidden page, and the backend. `stopHaptics()` clears the
hold.

## 5. Haptics lab and the debug log

`/dev/haptics-lab` (development only, `page.web.tsx`): every cue with its
parameters, the board's sequences at the measured timings (douze in teleport
and flip themes, a whole jury at presentation pace, the winner, both final
reveal outcomes), the strength setting, a pattern editor (edit the JSON, play
it, copy it into `cues.ts`) and a log of what played or was dropped. In the
app shell: `yarn dev:native` + `yarn cap:dev ios --lan` (or `android`), then
Settings → Effects → Haptics lab (dev builds only).

`localStorage['dp-haptics-debug'] = '1'` (development only) logs every cue to
the console and `window.__dpHapticsLog` with its `performance.now()` time,
also on the website's dev server where nothing plays. That is how the timings
above were checked against the DOM.

## 6. Testing

- `npx vitest run src/native/haptics`.
- Haptics can only be felt on a real phone; the iOS simulator has no haptic
  hardware (status "No haptics (no-hardware)" in the lab).
- Android emulator: the plugin really runs. Call it from the WebView
  (native-apps.md §10's DevTools recipe):
  `Capacitor.nativePromise('DouzeHaptics', 'play', { steps: [...] })`, then
  `adb shell dumpsys vibrator_manager` lists each vibration with its
  primitives, delays and usage. Checked 2026-11-06 on `Pixel_6a_API_34`
  (all eight primitives, a split at a 600 ms gap, `Usage=MEDIA`).
- A phone over USB: `adb logcat | grep -E "DouzeHaptics|vibrate is"` shows
  each plugin call and (on realme/ColorOS) each call reaching the vibrator
  service; `dumpsys vibrator_manager` lists its capabilities (`mSupportedPrimitives`,
  `mCapabilities`) and each vibration's status. `ignored_background` means the
  app wasn't in front (screen locked): media vibrations only play for the
  foreground app.

## 7. Adding a cue

1. Add it to the `HapticCue` union and `buildHapticPattern` in `cues.ts`,
   with a comment naming the animation it follows.
2. Add a sample to `SAMPLE_CUES` in `haptics.test.ts` (the `Record` type
   fails to compile without it) and a row to the lab's `GROUPS`.
3. Call `playHaptic` at the moment (§3 rules) and add the row to §3.
4. Tune it on a phone in the lab.

## 8. Not covered

- Theme sounds still fire on their old schedule (the douze sound with the
  overlay, the winner sound 1 s after the stage ends, under the final
  reveal).
- One-off segmented controls and switches that don't use the shared
  components (`Tabs`, `RelSegmented`, `ToggleButton`, `Checkbox`, the
  studio's controls) are silent; route new ones through those.
