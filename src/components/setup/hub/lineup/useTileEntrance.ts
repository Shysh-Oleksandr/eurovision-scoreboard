import { RefObject, useLayoutEffect, useRef } from 'react';

const ENTRANCE_KEYFRAMES: Keyframe[] = [
  {
    opacity: 0,
    transform: 'translateX(-12px)',
    clipPath: 'inset(0 100% 0 0)',
  },
  { opacity: 1, transform: 'none', clipPath: 'inset(0)' },
];

const STEP_MS = 30;
/** Tiles past this index share the last delay, so a long stage never drags. */
const MAX_STEPS = 12;

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Slides tiles in one after another, like rows joining the board. */
const playEntrance = (tiles: HTMLElement[]) => {
  if (tiles.length === 0 || prefersReducedMotion()) return;

  tiles.forEach((tile, index) => {
    tile.animate(ENTRANCE_KEYFRAMES, {
      duration: 420,
      delay: Math.min(index, MAX_STEPS) * STEP_MS,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      // `backwards` only: a kept end state would keep clipping the outline.
      fill: 'backwards',
    });
  });
};

/**
 * The stage tiles' staggered entrance. All tiles play it when the grid first
 * mounts (opening the setup, expanding a stage for the first time), when the
 * whole line-up is replaced (another contest) and when `replayKey` changes
 * (expanding the stage again); otherwise only countries that just landed in
 * the list play it. Tiles are found by their `data-code`.
 *
 * Effects re-run when a hidden `<Activity>` is shown again; the refs make
 * that a no-op, so reopening the setup doesn't replay anything.
 */
export const useTileEntrance = (
  gridRef: RefObject<HTMLElement | null>,
  codes: string[],
  { enabled, replayKey }: { enabled: boolean; replayKey: number },
) => {
  const previousCodes = useRef<ReadonlySet<string> | null>(null);
  const previousReplayKey = useRef(replayKey);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    const previous = previousCodes.current;
    const replay = previousReplayKey.current !== replayKey;

    previousCodes.current = new Set(codes);
    previousReplayKey.current = replayKey;

    if (!enabled || !grid) return;

    const tiles = Array.from(grid.querySelectorAll<HTMLElement>('[data-code]'));
    const wholesale =
      !previous ||
      (previous.size > 0 && !codes.some((code) => previous.has(code)));

    if (replay || wholesale) {
      playEntrance(tiles);

      return;
    }

    playEntrance(tiles.filter((tile) => !previous.has(tile.dataset.code!)));
  }, [gridRef, codes, enabled, replayKey]);
};
