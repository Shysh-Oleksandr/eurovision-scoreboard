import { ITEM_SIZES, ItemSize } from './design';

/**
 * Auto-fit for scoreboard elements (`fit: 'auto'`): pick the row size and
 * column count that show every row in the space the element has, like the
 * share modals' auto settings but for any canvas size. Pure, so the editor
 * inspector and the renderer agree on the result.
 *
 * Sizes mirror `ShareCountryItem` (row height + bottom margin) and the
 * scoreboard grid's column gaps, in rem; the app's root font size is 14px.
 */

export const ROOT_PX = 14;

interface SizeMetrics {
  /** Row height + bottom margin. */
  pitch: number;
  /** Column gap (`gap-x-*`). */
  gap: number;
  /** Narrowest column that still fits a long name and the points. */
  minWidth: number;
  /** Widest column before rows look stretched; wider areas centre the grid. */
  maxWidth: number;
}

const rem = (n: number) => n * ROOT_PX;

export const SIZE_METRICS: Record<ItemSize, SizeMetrics> = {
  sm: { pitch: rem(2), gap: rem(0.5), minWidth: rem(12), maxWidth: rem(20) },
  md: {
    pitch: rem(2.25),
    gap: rem(0.75),
    minWidth: rem(13.5),
    maxWidth: rem(22),
  },
  lg: {
    pitch: rem(2.5) + 6,
    gap: rem(1.25),
    minWidth: rem(16),
    maxWidth: rem(26),
  },
  xl: {
    pitch: rem(3) + 6,
    gap: rem(1.25),
    minWidth: rem(19),
    maxWidth: rem(30),
  },
  '2xl': {
    pitch: rem(4),
    gap: rem(1.25),
    minWidth: rem(22),
    maxWidth: rem(34),
  },
};

/** The grid's own vertical margin (`my-4`), top + bottom. */
export const GRID_MARGIN_Y = rem(1) * 2;

export const MAX_COLUMNS = 8;

export interface ScoreboardFit {
  columns: number;
  itemSize: ItemSize;
  /** Grid width when the rows would otherwise be stretched; else undefined. */
  width?: number;
}

/** Rendered height of a grid (rows only, no margins / padding). */
export const gridHeight = (count: number, columns: number, size: ItemSize) =>
  Math.ceil(count / columns) * SIZE_METRICS[size].pitch;

const columnWidth = (width: number, columns: number, size: ItemSize) =>
  (width - SIZE_METRICS[size].gap * (columns - 1)) / columns;

/**
 * Largest row size first, then the fewest columns whose rows fit `height`
 * and whose columns are at least `minWidth` wide. When nothing fits, the
 * smallest size with as many columns as the width allows (rows overflow).
 * `height` is the space for the rows themselves.
 */
export function fitScoreboard(
  count: number,
  width: number,
  height: number,
): ScoreboardFit {
  const sizes = [...ITEM_SIZES].reverse();
  const n = Math.max(1, count);
  // Fractional row pitches vs. integer box sizes: allow a pixel of slack.
  const tolerance = 1;
  const widthFor = (columns: number, size: ItemSize) => {
    const { gap, maxWidth } = SIZE_METRICS[size];
    const capped = columns * maxWidth + gap * (columns - 1);

    return capped < width ? capped : undefined;
  };

  for (const size of sizes) {
    for (let columns = 1; columns <= MAX_COLUMNS; columns += 1) {
      if (columnWidth(width, columns, size) < SIZE_METRICS[size].minWidth) {
        break;
      }
      if (gridHeight(n, columns, size) <= height + tolerance) {
        return { columns, itemSize: size, width: widthFor(columns, size) };
      }
    }
  }

  let columns = 1;

  while (
    columns < MAX_COLUMNS &&
    columnWidth(width, columns + 1, 'sm') >= SIZE_METRICS.sm.minWidth
  ) {
    columns += 1;
  }

  return { columns, itemSize: 'sm', width: widthFor(columns, 'sm') };
}

/**
 * Space for the rows of a scoreboard whose element box (or flow slot) is
 * `boxHeight` tall: minus the grid margins and the element's own padding.
 */
export const rowsHeightIn = (boxHeight: number, paddingY: number) =>
  boxHeight - GRID_MARGIN_Y - paddingY * 2;
