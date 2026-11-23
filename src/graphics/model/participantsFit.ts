/**
 * Layout of the participants element (`type: 'participants'`): every
 * country as a chip as wide as its name, in centred lines, like the
 * official "participating countries" graphics. Pure: chip widths come in
 * row heights (the renderer measures the names), and the fit returns the
 * row height and which chips share a line.
 *
 * The largest row height whose lines fit the box wins; the chips are then
 * spread evenly over that many lines, so the last line isn't left with one
 * country.
 */

export const CHIP_METRICS = {
  /** Between chips on a line, on top of how far a flag reaches left. */
  gapX: 0.4,
  /** Between lines. */
  gapY: 0.42,
} as const;

export const MAX_CHIP_HEIGHT = 72;
export const MIN_CHIP_HEIGHT = 10;

export interface ChipFitInput {
  /** Each chip's width, in row heights, in display order. */
  widths: number[];
  /** How far a chip's flag reaches left of it, in row heights. */
  overhang: number;
  width: number;
  height: number;
}

export interface ChipFit {
  rowHeight: number;
  /** Chip indexes per line, top to bottom. */
  lines: number[][];
}

/** Greedy lines no wider than `maxRh` (row heights). */
export function packLines(
  widths: number[],
  gap: number,
  maxRh: number,
): number[][] {
  const lines: number[][] = [];
  let line: number[] = [];
  let used = 0;

  widths.forEach((w, i) => {
    const next = line.length === 0 ? w : used + gap + w;

    if (line.length > 0 && next > maxRh) {
      lines.push(line);
      line = [i];
      used = w;
    } else {
      line.push(i);
      used = next;
    }
  });
  if (line.length) lines.push(line);

  return lines;
}

const gapOf = (overhang: number) => CHIP_METRICS.gapX + overhang;

/** Height of `count` lines, in row heights. */
const linesHeightRh = (count: number) =>
  count + Math.max(0, count - 1) * CHIP_METRICS.gapY;

function fits(input: ChipFitInput, rh: number): boolean {
  const maxRh = (input.width - input.overhang * rh) / rh;

  if (input.widths.some((w) => w > maxRh)) return false;
  const lines = packLines(input.widths, gapOf(input.overhang), maxRh);

  return linesHeightRh(lines.length) * rh <= input.height + 0.5;
}

/**
 * The chips in exactly `count` lines no wider than `maxRh`, as even as
 * possible: the split (in order) whose line widths stray least from their
 * average (least squares, by dynamic programming; n is a contest's worth).
 */
function balance(
  widths: number[],
  gap: number,
  maxRh: number,
  count: number,
): number[][] {
  const n = widths.length;
  const prefix = [0];

  widths.forEach((w, i) => prefix.push(prefix[i] + w));
  const lineWidth = (from: number, to: number) =>
    prefix[to] - prefix[from] + (to - from - 1) * gap;
  const mean = (prefix[n] + (n - count) * gap) / count;
  // best[k][j]: the cost of the first j chips in k lines; from[k][j]: where
  // the k-th line starts.
  const best = Array.from({ length: count + 1 }, () =>
    new Array<number>(n + 1).fill(Infinity),
  );
  const from = Array.from({ length: count + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );

  best[0][0] = 0;
  for (let k = 1; k <= count; k += 1) {
    for (let j = k; j <= n; j += 1) {
      for (let i = j - 1; i >= k - 1; i -= 1) {
        const w = lineWidth(i, j);

        // A single chip wider than the box still gets a line of its own.
        if (w > maxRh && j - i > 1) break;
        const cost = best[k - 1][i] + (w - mean) ** 2;

        if (cost < best[k][j]) {
          best[k][j] = cost;
          from[k][j] = i;
        }
      }
    }
  }
  if (!Number.isFinite(best[count][n])) return packLines(widths, gap, maxRh);
  const lines: number[][] = [];

  let end = n;

  for (let k = count; k > 0; k -= 1) {
    const start = from[k][end];

    lines.unshift(Array.from({ length: end - start }, (_, x) => start + x));
    end = start;
  }

  return lines;
}

export function fitChips(input: ChipFitInput): ChipFit {
  if (input.widths.length === 0) return { rowHeight: 36, lines: [] };
  let lo = MIN_CHIP_HEIGHT;
  let hi = MAX_CHIP_HEIGHT;

  if (fits(input, hi)) lo = hi;
  else if (fits(input, lo)) {
    for (let i = 0; i < 24 && hi - lo > 0.1; i += 1) {
      const mid = (lo + hi) / 2;

      if (fits(input, mid)) lo = mid;
      else hi = mid;
    }
  }
  const rowHeight = Math.max(MIN_CHIP_HEIGHT, Math.floor(lo));
  const maxRh = (input.width - input.overhang * rowHeight) / rowHeight;
  const gap = gapOf(input.overhang);
  const greedy = packLines(input.widths, gap, maxRh);

  return {
    rowHeight,
    lines: balance(input.widths, gap, maxRh, greedy.length),
  };
}
