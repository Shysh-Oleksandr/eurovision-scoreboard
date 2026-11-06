import { RefObject, useContext, useLayoutEffect, useRef } from 'react';

import { DndSwapContext } from './dnd/DndComponentsContext';

const ENTRANCE_KEYFRAMES: Keyframe[] = [
  {
    opacity: 0,
    transform: 'translateX(-12px)',
    clipPath: 'inset(0 100% 0 0)',
  },
  { opacity: 1, transform: 'none', clipPath: 'inset(0)' },
];

const DURATION_MS = 420;
const STEP_MS = 30;
/** Long stages tighten the step so the last tile still starts by this delay. */
const MAX_SPREAD_MS = 600;

/** Entrances still playing, so the drag-and-drop swap can wait them out. */
const running = new Set<Animation>();

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Slides tiles in one after another, like rows joining the board. */
const playEntrance = (tiles: HTMLElement[]) => {
  if (tiles.length === 0 || prefersReducedMotion()) return;

  const step = Math.min(STEP_MS, MAX_SPREAD_MS / Math.max(tiles.length - 1, 1));

  tiles.forEach((tile, index) => {
    const animation = tile.animate(ENTRANCE_KEYFRAMES, {
      duration: DURATION_MS,
      delay: index * step,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      // `backwards` only: a kept end state would keep clipping the outline.
      fill: 'backwards',
    });
    const forget = () => running.delete(animation);

    running.add(animation);
    animation.finished.then(forget, forget);
  });
};

/**
 * Calls `callback` once no tile entrance is playing (right away when none
 * is). Returns a cancel function. `LineupDndBoundary` waits on it because
 * swapping in drag-and-drop remounts every tile, which would cut the
 * entrance off.
 */
export const afterTileEntrances = (callback: () => void) => {
  let cancelled = false;

  const check = () => {
    if (cancelled) return;
    if (running.size === 0) {
      callback();

      return;
    }

    void Promise.allSettled([...running].map((a) => a.finished)).then(check);
  };

  check();

  return () => {
    cancelled = true;
  };
};

/**
 * The stage tiles' staggered entrance. All tiles play it when the grid first
 * mounts (opening the setup, expanding a stage for the first time), when the
 * whole line-up is replaced (another contest) and when `replayKey` changes
 * (expanding the stage again); otherwise only countries that just landed in
 * the list play it. Tiles are found by their `data-code`.
 *
 * Effects re-run when a hidden `<Activity>` is shown again; the refs make
 * that a no-op, so reopening the setup doesn't replay anything. A grid
 * remounted by the drag-and-drop swap (`DndSwapContext`) skips it too: its
 * tiles already entered.
 */
export const useTileEntrance = (
  gridRef: RefObject<HTMLElement | null>,
  codes: string[],
  { enabled, replayKey }: { enabled: boolean; replayKey: number },
) => {
  const swapping = useContext(DndSwapContext);
  const previousCodes = useRef<ReadonlySet<string> | null>(null);
  const previousReplayKey = useRef(replayKey);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    const previous = previousCodes.current;
    const replay = previousReplayKey.current !== replayKey;

    previousCodes.current = new Set(codes);
    previousReplayKey.current = replayKey;

    if (!enabled || !grid || (!previous && swapping.current)) return;

    const tiles = Array.from(grid.querySelectorAll<HTMLElement>('[data-code]'));
    const wholesale =
      !previous ||
      (previous.size > 0 && !codes.some((code) => previous.has(code)));

    if (replay || wholesale) {
      playEntrance(tiles);

      return;
    }

    playEntrance(tiles.filter((tile) => !previous.has(tile.dataset.code!)));
  }, [gridRef, codes, enabled, replayKey, swapping]);
};
