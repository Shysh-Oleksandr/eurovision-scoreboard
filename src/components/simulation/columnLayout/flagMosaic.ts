import { RefObject, useLayoutEffect, useState } from 'react';

/*
 * The qualifiers' flags as a mosaic that fills its box: lines of flags
 * (rows, or columns when that fits better), each line split evenly. A line
 * with fewer flags gets proportionally more room (its height is 1/n of the
 * lines' 1/n total), which gives every flag the same shape: lines of 3, 3
 * and 4 fill a 3:2 box with flags a little wider than 3:2, where a 5 × 2
 * grid would cut them to portrait strips and leave a hole for 9.
 */

/** The shape most flags have (3:2); the mosaic aims for it. */
export const FLAG_ASPECT = 3 / 2;

export interface FlagMosaic {
  /** Lines run across (`rows`) or down (`columns`). */
  direction: 'rows' | 'columns';
  /** Flags per line, in order: the bigger flags (fewer per line) first. */
  lines: number[];
}

/** Portrait flags look wrong: being narrower costs more than being wider. */
const NARROW_PENALTY = 1.6;
/** Flags in one line may be at most twice as many as in another… */
const MAX_LINE_RATIO = 2;
/** …and each step towards that costs, so even lines win close calls. */
const SPREAD_PENALTY = 0.5;
/** Rows read in the natural order: columns only when clearly better. */
const COLUMNS_PENALTY = 0.03;

const shapeCost = (aspect: number) =>
  aspect >= FLAG_ASPECT
    ? Math.log(aspect / FLAG_ASPECT)
    : NARROW_PENALTY * Math.log(FLAG_ASPECT / aspect);

/**
 * Every way to split `count` flags into lines, as counts from the fullest
 * line down, no line holding more than MAX_LINE_RATIO times another.
 */
function* lineSplits(count: number): Generator<number[]> {
  function* rest(left: number, max: number, min: number): Generator<number[]> {
    if (left === 0) {
      yield [];

      return;
    }

    for (let line = Math.min(left, max); line >= min; line -= 1) {
      for (const tail of rest(left - line, line, min)) yield [line, ...tail];
    }
  }

  for (let fullest = count; fullest >= 1; fullest -= 1) {
    for (const tail of rest(
      count - fullest,
      fullest,
      Math.ceil(fullest / MAX_LINE_RATIO),
    )) {
      yield [fullest, ...tail];
    }
  }
}

/**
 * The mosaic for `count` flags in a `width` × `height` box (any unit; an
 * unmeasured box counts as 3:2). Gaps are left out: at 2px they don't change
 * the choice.
 */
export const planFlagMosaic = (
  count: number,
  width: number,
  height: number,
): FlagMosaic => {
  if (count <= 1) return { direction: 'rows', lines: count ? [1] : [] };

  const ratio = width > 0 && height > 0 ? width / height : FLAG_ASPECT;
  let best: FlagMosaic = { direction: 'rows', lines: [count] };
  let bestCost = Infinity;

  for (const split of lineSplits(count)) {
    // Lines of n flags, sized 1/n of the total: every flag gets the same
    // shape, wider the more lines share the box's height (rows) or narrower
    // the more share its width (columns).
    const share = split.reduce((sum, line) => sum + 1 / line, 0);
    const spread =
      SPREAD_PENALTY * Math.log(split[0] / split[split.length - 1]);
    const rowsCost = shapeCost(ratio * share) + spread;
    const columnsCost = shapeCost(ratio / share) + spread + COLUMNS_PENALTY;
    const cost = Math.min(rowsCost, columnsCost);

    if (cost < bestCost - 1e-9) {
      bestCost = cost;
      best = {
        direction: rowsCost <= columnsCost ? 'rows' : 'columns',
        lines: [...split].reverse(),
      };
    }
  }

  return best;
};

/** A flag's place in the box, as fractions of its width and height. */
export interface MosaicTile {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Where each flag goes, in order: line by line, along each line. */
export const mosaicTiles = ({ direction, lines }: FlagMosaic): MosaicTile[] => {
  const share = lines.reduce((sum, line) => sum + 1 / line, 0);
  const tiles: MosaicTile[] = [];
  let across = 0;

  lines.forEach((line) => {
    const thickness = 1 / line / share;

    for (let index = 0; index < line; index += 1) {
      const along = index / line;

      tiles.push(
        direction === 'rows'
          ? { x: along, y: across, width: 1 / line, height: thickness }
          : { x: across, y: along, width: thickness, height: 1 / line },
      );
    }

    across += thickness;
  });

  return tiles;
};

const sameMosaic = (a: FlagMosaic, b: FlagMosaic) =>
  a.direction === b.direction && a.lines.join() === b.lines.join();

/** `planFlagMosaic` for the element's box, re-planned as it resizes. */
export const useFlagMosaic = (
  ref: RefObject<HTMLElement | null>,
  count: number,
) => {
  const [mosaic, setMosaic] = useState(() =>
    planFlagMosaic(count, FLAG_ASPECT, 1),
  );

  useLayoutEffect(() => {
    const el = ref.current;

    if (!el) return undefined;

    const update = () => {
      const next = planFlagMosaic(count, el.clientWidth, el.clientHeight);

      setMosaic((current) => (sameMosaic(current, next) ? current : next));
    };

    update();

    const observer = new ResizeObserver(update);

    observer.observe(el);

    return () => observer.disconnect();
  }, [ref, count]);

  return mosaic;
};
