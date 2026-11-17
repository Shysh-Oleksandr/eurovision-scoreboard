# Keyboard shortcuts

The simulation's common actions run from the keyboard. Buttons show their
key as a shortcut hint, and Settings → Keyboard shortcuts lets people change
any key or turn shortcuts off. Terms: `GLOSSARY.md` ("keyboard shortcut",
"shortcut hint"; never "hotkey" in copy or new code). Code: `src/shortcuts/`.

## 1. The keys

| Key | Action (`ShortcutId`) | Where it runs |
|---|---|---|
| Space | `random`: the one-tap Random | Jury: the scope picked last (`simViewStore.quickRandom`); televote: this country; lowest-to-highest reveal: the next points; Pick qualifiers: the next qualifier; jury scale reveal: its Random |
| N / V / F | `randomNext` / `randomVoter` / `randomAll` | The At random scopes. N and V become the quick scope, like clicking them. F also fills every qualifier place left and finishes the jury scale reveal |
| ⌘Z / Ctrl+Z | `undo` | When Undo is available (`canUndo`) |
| R | `restart` | Asks first (confirmation key `restart-simulation`); the ⋯ menu's Restart doesn't |
| Enter | `continue` | The results panel's filled button: Continue to the next stage, or View scoreboard after the final reveal; the jury scale reveal's Continue / Show results |
| S | `setup` | Opens Event Setup |
| P | `present` | Present / Pause |
| M | `minimalView` | Toggles the minimal view (column layout) |
| T | `stats` | The results panel's Stats |
| ? | `shortcutsHelp` | Opens Settings → Keyboard shortcuts (website, mouse or trackpad) |
| ⌘S / Ctrl+S | `startStage` | The stage modal's Start (works in its modal and in fields) |
| none | `share`, `fullscreen`, `cancel` | Bindable in settings |

Why these defaults: Random is pressed a hundred times per contest, so it gets
the biggest key, the one presentation tools use for "next". Enter stays on
"continue", so pressing Space over and over never skips a semi-final's
results. Single keys are the fastest and what app-like pages use (YouTube,
Gmail, Figma). ⌘/Ctrl combinations collide with the browser, so only Undo
and Save use them, as every OS does.

## 2. How a key press runs

`<KeyboardShortcuts />` (mounted once in `views/Main.tsx`) owns the only
listener (window `keydown`, bubble phase):

1. Nothing happens with `settings.enableKeyboardShortcuts` off.
2. `bindingFromEvent` (`binding.ts`) turns the press into a `Binding`.
3. `getActionForBinding` (`actions.ts`) looks it up in the effective keys
   (the defaults merged with `settings.keyboardShortcuts`).
4. `shouldIgnoreShortcut` (`guard.ts`) drops it (rules below).
5. `getShortcutHandler` (`registry.ts`) finds the handler the action's owner
   registered. The listener calls `preventDefault`, so Space doesn't scroll
   and ⌘S doesn't open the save dialog, then runs the handler.
6. If no handler is registered while the simulation is on screen, Space and
   Enter on a button a mouse click left focused are still swallowed, so they
   never press that button again (Setup would reopen).

### Bindings (`binding.ts`)

A binding is a platform-free string: modifiers in a fixed order (`Mod`,
`Ctrl`, `Meta`, `Alt`, `Shift`), then the key: `"Space"`, `"F"`,
`"Shift+R"`, `"Mod+Z"`, `"?"`, `"Enter"`. `Mod` is ⌘ on Apple platforms and
Ctrl elsewhere, so a binding synced from a Mac works on Windows. A
single-key binding never matches while ⌘, Ctrl or Alt is held, so ⌘R and
Ctrl+F stay the browser's.

- **Letters match by character** (`event.key`), so Z is the key labelled Z
  on AZERTY or QWERTZ, and the hint stays true.
- **Non-Latin layouts match by place** (`event.code`). That covers
  Ukrainian, Greek, ⌥ on a Mac (⌥F types ƒ) and dead keys. S still opens
  setup without switching layout.
- **Shift is part of a letter's binding** (`Shift+R`), but not of a symbol's.
  `?` needs Shift on some layouts and not on others.
- **Some keys can't be bound.** Escape and Tab belong to the page, and a bare
  modifier or an IME composition is never a binding.

### The guard (`guard.ts`)

A press is ignored when:

- it was already handled (`defaultPrevented`), it repeats (a held key runs
  once), or an input method is composing;
- a blocking overlay is open (below): the keys are the overlay's;
- focus is in a text field, textarea, select or contenteditable;
- Space or Enter is pressed while a button, link, menu item or checkbox has
  *keyboard* focus (`:focus-visible`): the key presses that element. Focus
  left by a mouse click doesn't count.

There are two exceptions:

- **The televote points field** (`data-shortcut-field="numeric"` on its
  input) keeps only what it can type or handles itself: digits `. , - + e`,
  Backspace, Delete, the arrow keys, Home, End, Enter (its own Vote) and Tab.
  It also keeps ⌘/Ctrl combinations while it holds text (copy, paste, undo
  the typing). Everything else reaches the shortcuts. In the televote you
  can type 12 and press Enter, or press Space for random, without leaving
  the field.
- **`worksInFields` actions** (`startStage`) run inside their own modal and
  in fields when the binding has ⌘/Ctrl. If someone gives one a plain key,
  it still leaves fields alone.

### Blocking overlays

`useBackHandler` (`src/hooks/useBackHandler.ts`, also the Android back
stack) counts open overlays on every platform:

- Modals (confirmations included), menus, popovers, the ⋯ sheet, the
  graphics editor and the live-update blocking screens register while open.
- `hasShortcutBlockingOverlay()` is true while any of them is.
- Layers that are controls rather than overlays pass
  `{ blocksShortcuts: false }`: the minimal view's stripe and the
  simulation's `BottomSheet`. Shortcuts keep working while they're open.

The back stack itself still registers only in the apps (`openOverlayCount`
keeps its meaning).

### Who registers what (`useShortcut(id, handler, enabled)`)

- **The handler belongs to the component that owns the action.** It
  registers while the action is available, which means its button is there
  and would work. The latest `handler` is called (it's kept in a ref).
- **The latest enabled registration wins.** A screen on top can take a key.
- **`SimulationShortcuts`** (`components/simulation/`, mounted in both
  layouts) registers the actions that don't belong to one button, once,
  whichever of the column, sheet or stripe shows the buttons: the At random
  scopes, Present, Minimal view, Fullscreen, Undo, Restart, Setup, Cancel
  and `?`. It also calls `useShortcutScope()`. Random waits while
  presenting, once the stage is over, and while the jury scale reveal runs.
- **The results panels** register Continue and Stats: `ResultsPanel`,
  `QualifierResultsActions` and the classic `PhaseActions`.
- **Each layout** registers Share (`SimulationColumnLayout`, the classic
  `SimulationHeader`).
- **The jury scale reveal's `RevealControls`** register Random, Finish
  randomly and Continue.
- **`PostSetupModal`** registers `startStage` while it's open.

Adding an action:

1. Add an id to `SHORTCUT_ACTIONS`. The ids are stored in settings, so never
   rename one.
2. Add its label `settings.shortcuts.actions.<id>` in all nine locales.
3. Call `useShortcut` where the handler lives.
4. Put `shortcut="<id>"` on its `Button`, or `ShortcutHint` /
   `useShortcutHintFormatter` on custom controls and menu rows.

## 3. Shortcut hints (`hints.tsx`)

- **On a labelled `Button`** (`shortcut` prop): small text in the top-right
  corner (10px, the button's own colour at 55%, never uppercase, no
  keycap). Buttons of 40px and less get 22px right padding so the label
  stays clear of it.
- **On an icon-only `Button`**: the key goes in the tooltip, as
  "Minimal view (M)".
- **In menu rows** (the ⋯ menu's `trailing`, the At random popovers):
  right-aligned. In the stripe's split button it sits inline after
  "Random".
- **The column's At random group** puts the Space hint on the scope Space
  would run, which is the one `quickRandom` holds. It moves after a whole
  vote.
- **Space is drawn as ␣** (`ShortcutHintText`, an inline SVG, since the
  font's glyph sits too low). A spelled-out "Пробіл" or "Leertaste" collides
  with a country name in the narrow At random buttons. Enter is ↵. The
  settings list spells Space out.
- **When hints show** (`useShortcutHintsVisible`): on the website
  (`!IS_NATIVE_APP`), with `(hover: hover) and (pointer: fine)`
  (`useHasFinePointer`), and with both shortcuts and `showShortcutHints` on.
  A narrow desktop window, which uses the phone sheet layout, still shows
  them; phones, tablets and the apps never do. The keys work everywhere (an
  iPad with a keyboard).
- **Screen readers**: buttons with a shortcut get `aria-keyshortcuts`
  whatever the pointer, client side only, since the platform decides
  between ⌘ and Ctrl.

## 4. Settings

The Settings → General category is `shortcuts`, between Audio and
Confirmations. It has `Category.when`, so it shows only on the website with
a fine pointer. The settings model's env has `hasFinePointer`.

- **`enableKeyboardShortcuts`** (on). WCAG 2.1.4 asks for a way to turn
  single-key shortcuts off.
- **`showShortcutHints`** (on), a child of the first.
- **`KeyboardShortcutsList`** (`settings/general/custom/`): one row per
  action, with its key as a recorder button.
  - Click it, then press the new key. Escape cancels, Backspace or Delete
    clears it to "Not set", and Tab moves on.
  - It listens on the window in the capture phase, so neither the modal nor
    the shortcuts see the keys.
  - A key already in use moves to the new action (`assignBinding`). The
    action that lost it says where it went.
  - A changed row gets a reset button, and the list a "Reset all keys".
- **`keyboardShortcuts`** stores only overrides (`id → Binding | null`).
  Overrides equal to the default are dropped, so a default changed later
  reaches everyone who kept it.
- **All three sync with the account** (`SYNCED_SETTINGS_KEYS`; the backend's
  `preferences.settings` is free-form).
- **`?` opens this category over the simulation**
  (`useSettingsModalStore.openAt('shortcuts')`). The settings modal's open
  state lives in that store, and `EventSetupModal` renders the modal outside
  the setup modal.

## 5. Dialogs and Enter

`ConfirmationModal` confirms on Enter (capture phase, ahead of any field
underneath), except for `type: 'danger'`. A keyboard-focused button or
checkbox keeps its own Enter. That makes R then Enter a restart, and lets
the manual-televote warning confirm with Enter from the points field.
