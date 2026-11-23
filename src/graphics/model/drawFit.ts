import { DrawElement, DrawEntry, DrawSemi } from './design';

/**
 * Layout of the draw element (`type: 'draw'`): which countries go in which
 * column, and the one row height that fits every semi-final in the box.
 * Pure, so the renderer, the inspector and the tests agree.
 *
 * Every size in the element is a multiple of the row height (`rh`): the
 * semi titles, the half headers, the gaps and the hearts. So the height a
 * layout needs is `rh × units`, and the largest row height that fits is
 * found by a binary search (the voters line can wrap, which is why it is
 * not a plain division).
 */

/** Sizes in row heights. */
export const DRAW_METRICS = {
  titleFont: 0.8,
  titleLine: 1.15,
  titleGap: 0.42,
  headFont: 0.34,
  headLine: 1.3,
  headGap: 0.26,
  rowGap: 0.36,
  columnGap: 0.75,
  /** Between semis side by side / stacked. */
  semiGapRow: 1.4,
  semiGapColumn: 0.9,
  nameFont: 0.44,
  namePadRight: 0.45,
  numberWidth: 1.15,
  numberGap: 0.5,
  votersGap: 0.55,
  voterHeart: 0.72,
  voterFont: 0.34,
  voterLine: 0.85,
  voterLineGap: 0.2,
  voterChipGap: 0.5,
  labelFont: 0.3,
} as const;

/** Rows never grow past this (few countries), nor shrink below MIN. */
export const MAX_ROW_HEIGHT = 64;
export const MIN_ROW_HEIGHT = 10;
/** Rows wider than this many row heights look stretched; the block centres. */
export const MAX_COLUMN_RH = 7.6;
/**
 * Names wider than this (in ems of the name font) may be cut short rather
 * than shrink every row: "BOSNIA & HERZEGOVINA" yes, a 40-letter custom
 * entry no.
 */
export const NAME_EM_CAP = 11;

/** A plain list this long or shorter stays in one column. */
export const SINGLE_COLUMN_MAX = 6;

export interface DrawCell {
  entry: DrawEntry;
  /** 1-based place in the semi's show order. */
  position: number;
}

export interface DrawColumn {
  header: 'firstHalf' | 'secondHalf' | null;
  cells: DrawCell[];
}

/**
 * A semi's columns: First / Second half with `order: 'halves'`, else the
 * list split in two (top to bottom, then the next column), or one column
 * when it is short.
 */
export function drawColumns(
  semi: DrawSemi,
  order: DrawElement['order'],
): DrawColumn[] {
  const cells = semi.entries.map((entry, i) => ({ entry, position: i + 1 }));

  if (order === 'halves' && semi.firstHalfSize !== undefined) {
    const split = Math.max(0, Math.min(cells.length, semi.firstHalfSize));

    return [
      { header: 'firstHalf', cells: cells.slice(0, split) },
      { header: 'secondHalf', cells: cells.slice(split) },
    ];
  }
  if (cells.length <= SINGLE_COLUMN_MAX) return [{ header: null, cells }];
  const perColumn = Math.ceil(cells.length / 2);

  return [
    { header: null, cells: cells.slice(0, perColumn) },
    { header: null, cells: cells.slice(perColumn) },
  ];
}

export interface DrawFitSemi {
  columns: number;
  /** Rows in the semi's longest column. */
  rows: number;
  headers: boolean;
  /** Names on the voters line (empty = no line). */
  voters: string[];
}

export interface DrawFitInput {
  semis: DrawFitSemi[];
  /** Rows start with their running-order number. */
  numbered: boolean;
  /** Where the name starts in a row, in row heights (rowGeometry). */
  lead: number;
  /** How far the flag reaches left of the row, in row heights. */
  overhang: number;
  /** The widest country name, in ems of the name font (measured). */
  nameEm: number;
  /** The voters line's label ("Also voting"), in characters. */
  votersLabelChars: number;
  width: number;
  height: number;
}

export interface DrawFit {
  arrangement: 'row' | 'column';
  rowHeight: number;
  /** Width of every column of rows (number box included). */
  columnWidth: number;
}

export const fitSemiOf = (
  semi: DrawSemi,
  order: DrawElement['order'],
  showVoters: boolean,
): DrawFitSemi => {
  const columns = drawColumns(semi, order);

  return {
    columns: columns.length,
    rows: Math.max(1, ...columns.map((c) => c.cells.length)),
    headers: columns.some((c) => c.header !== null),
    voters: showVoters ? semi.voters.map((v) => v.name) : [],
  };
};

const M = DRAW_METRICS;

/** Lines the voters line takes in a semi `widthRh` row heights wide. */
export function votersLines(
  names: string[],
  labelChars: number,
  widthRh: number,
): number {
  if (names.length === 0) return 0;
  const items = [
    labelChars * 0.7 * M.labelFont,
    ...names.map(
      (name) => M.voterHeart * 0.97 + 0.18 + name.length * 0.6 * M.voterFont,
    ),
  ];
  let lines = 1;
  let used = 0;

  items.forEach((w) => {
    const next = used === 0 ? w : used + M.voterChipGap + w;

    if (next > widthRh && used > 0) {
      lines += 1;
      used = w;
    } else {
      used = next;
    }
  });

  return lines;
}

/** Height of one semi, in row heights. */
export function semiHeightRh(semi: DrawFitSemi, lines: number): number {
  const title = M.titleFont * M.titleLine + M.titleGap;
  const headers = semi.headers ? M.headFont * M.headLine + M.headGap : 0;
  const rows = semi.rows + (semi.rows - 1) * M.rowGap;
  const voters =
    lines > 0
      ? M.votersGap + lines * M.voterLine + (lines - 1) * M.voterLineGap
      : 0;

  return title + headers + rows + voters;
}

/** Narrowest column (row + number box) that fits a long name, in row heights. */
export const columnNeedRh = (input: DrawFitInput): number =>
  (input.numbered ? M.numberWidth + M.numberGap : 0) +
  input.lead +
  Math.min(input.nameEm, NAME_EM_CAP) * M.nameFont +
  M.namePadRight +
  // Rounding and sub-pixel text.
  0.1;

interface Trial {
  ok: boolean;
  columnWidth: number;
}

function tryRowHeight(
  input: DrawFitInput,
  arrangement: DrawFit['arrangement'],
  rh: number,
): Trial {
  const { semis, width, height, overhang } = input;
  const count = semis.length;
  const blockW =
    arrangement === 'row'
      ? (width - (count - 1) * M.semiGapRow * rh) / count
      : width;
  let available = Infinity;
  let widest = 0;
  const heights: number[] = [];

  for (const semi of semis) {
    const own =
      (blockW - overhang * rh - (semi.columns - 1) * M.columnGap * rh) /
      semi.columns;
    const need = columnNeedRh(input) * rh;

    if (own < need) return { ok: false, columnWidth: 0 };
    available = Math.min(available, own);
    widest = Math.max(widest, need);
  }
  const columnWidth = Math.min(available, Math.max(MAX_COLUMN_RH * rh, widest));

  for (const semi of semis) {
    const semiW =
      semi.columns * columnWidth +
      (semi.columns - 1) * M.columnGap * rh +
      overhang * rh;
    const lines = votersLines(semi.voters, input.votersLabelChars, semiW / rh);

    heights.push(semiHeightRh(semi, lines));
  }
  const units =
    arrangement === 'row'
      ? Math.max(...heights)
      : heights.reduce((sum, h) => sum + h, 0) + (count - 1) * M.semiGapColumn;

  return { ok: units * rh <= height + 0.5, columnWidth };
}

function fitArrangement(
  input: DrawFitInput,
  arrangement: DrawFit['arrangement'],
): DrawFit {
  let lo = MIN_ROW_HEIGHT;
  let hi = MAX_ROW_HEIGHT;
  const low = tryRowHeight(input, arrangement, lo);

  if (!low.ok) {
    return {
      arrangement,
      rowHeight: lo,
      columnWidth: Math.max(low.columnWidth, columnNeedRh(input) * lo),
    };
  }
  if (tryRowHeight(input, arrangement, hi).ok) lo = hi;
  else {
    for (let i = 0; i < 24 && hi - lo > 0.1; i += 1) {
      const mid = (lo + hi) / 2;

      if (tryRowHeight(input, arrangement, mid).ok) lo = mid;
      else hi = mid;
    }
  }
  // Whole pixels keep the rows crisp in the export.
  const rowHeight = Math.max(MIN_ROW_HEIGHT, Math.floor(lo));

  return {
    arrangement,
    rowHeight,
    columnWidth: tryRowHeight(input, arrangement, rowHeight).columnWidth,
  };
}

/**
 * The largest row height at which every semi fits `width` × `height`,
 * semis side by side or stacked, whichever gives bigger rows (side by side
 * on a tie). Nothing fits: the smallest rows, overflowing.
 */
export function fitDraw(input: DrawFitInput): DrawFit {
  if (input.semis.length === 0) {
    return { arrangement: 'row', rowHeight: 36, columnWidth: 0 };
  }
  const row = fitArrangement(input, 'row');

  if (input.semis.length === 1) return row;
  const column = fitArrangement(input, 'column');

  return column.rowHeight > row.rowHeight ? column : row;
}
