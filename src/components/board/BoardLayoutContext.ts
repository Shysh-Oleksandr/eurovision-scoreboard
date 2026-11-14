import { createContext, useContext } from 'react';

/**
 * Lets a host layout decide the board's column count instead of the
 * viewport media queries and the 1/2-column setting. The classic simulation
 * renders no provider, so `null` keeps today's behaviour everywhere else.
 */
export interface BoardLayoutOverride {
  /** Columns the rows are laid out in (column-major, like the broadcasts). */
  columns: 1 | 2 | 3;
  /**
   * The host has sized the board (column count, row height, zoom): the rows
   * may make their entrance. Until then they stay hidden, so a board that is
   * still being fitted never shows. With a host, the rows rise in one by one
   * instead of the whole board fading in.
   */
  appearReady: boolean;
  /**
   * Rows show these short codes (keyed by country `code`) instead of names:
   * a phone's two columns too narrow for names (`getShortCodes`).
   */
  shortCodes?: Record<string, string>;
}

export const BoardLayoutContext = createContext<BoardLayoutOverride | null>(
  null,
);

export const useBoardLayoutOverride = () => useContext(BoardLayoutContext);

/**
 * Set on an ancestor of the board while the host changes its layout (column
 * count, row size, a window resize). Rows then jump to their new places
 * instead of animating: the theme's row transitions are switched off in CSS
 * and FLIP moves are skipped (`isBoardRelayout`).
 */
export const BOARD_RELAYOUT_SELECTOR = '[data-relayout], [data-resizing]';

export const isBoardRelayout = (el: Element | null) =>
  !!el?.closest(BOARD_RELAYOUT_SELECTOR);
