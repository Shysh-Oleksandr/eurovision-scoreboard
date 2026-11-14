'use client';
import React, { useLayoutEffect, useState } from 'react';

import type { BoardBox } from './BoardStage';

/** Breathing room under the board (and the column) on desktop. */
export const DESKTOP_BOTTOM_GAP = 40;
/** The voter window never gets shorter than half its width (`WINDOW_CLASS`). */
const MIN_WINDOW_RATIO = 0.5;

/**
 * The least height the voting column can take without its controls
 * overflowing: the window at its 2:1 minimum, the caption, the fixed parts
 * (`COLUMN_PART`) and the spacer's minimum. In the column's own px (offset
 * sizes ignore its zoom). The same in every mode, so measuring never loops.
 */
const measureVotingNeed = (column: HTMLElement) => {
  const aside = column.querySelector('aside');
  const win = aside?.querySelector<HTMLElement>('.dp-sim-window');
  const frame = win?.closest<HTMLElement>('aside > *');

  if (!aside || !win || !frame) return 0;

  const parts = Array.from(
    aside.querySelectorAll<HTMLElement>(':scope > [data-col-part]'),
  ).reduce((sum, part) => sum + part.offsetHeight, 0);
  const spacer = Array.from(aside.children).find(
    (child) => child !== frame && !child.hasAttribute('data-col-part'),
  ) as HTMLElement | undefined;
  const spacerMin = spacer ? parseFloat(getComputedStyle(spacer).minHeight) : 0;
  const borders = aside.offsetHeight - aside.clientHeight;
  // The caption and progress line under the window. Summed one by one: a
  // frame squeezed below its content reports less than they take.
  const underWindow = Array.from(frame.children).reduce(
    (sum, child) =>
      child === win ? sum : sum + (child as HTMLElement).offsetHeight,
    0,
  );

  return Math.ceil(
    underWindow +
      win.offsetWidth * MIN_WINDOW_RATIO +
      parts +
      (spacerMin || 0) +
      borders,
  );
};

interface ColumnFit {
  style?: React.CSSProperties;
  /** The column stays put while a long board scrolls (so do the actions). */
  sticky: boolean;
}

interface ColumnFitOptions {
  columnRef: React.RefObject<HTMLDivElement | null>;
  boardBox: BoardBox | null;
  chromeZoom: number;
  enabled: boolean;
  /** Results: keep the natural height (nothing in them stretches). */
  natural: boolean;
}

/**
 * Desktop: sizes the spokesperson column against the board.
 *
 * - The board fits the screen: the column is as tall as the board (or as tall
 *   as its controls need, if the board is short).
 * - The board is taller than the screen (many participants): the column takes
 *   the screen's height under the header and stays put (sticky) while the
 *   board scrolls, unless its controls don't fit that height, in which case
 *   it scrolls along at the height they need.
 *
 * Results keep their natural height and stick the same way when they fit.
 */
export const useColumnFit = ({
  columnRef,
  boardBox,
  chromeZoom,
  enabled,
  natural,
}: ColumnFitOptions): ColumnFit => {
  const [need, setNeed] = useState(0);

  useLayoutEffect(() => {
    const column = columnRef.current;

    if (!enabled || !column) return undefined;

    const measure = () => {
      const next = natural ? column.offsetHeight : measureVotingNeed(column);

      setNeed((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    };

    measure();

    // Parts come and go (the televote field, Pause), so watch the subtree
    // for both size and structure changes.
    const resizeObserver = new ResizeObserver(measure);
    const observeAll = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(column);
      column
        .querySelectorAll('aside, aside > *')
        .forEach((el) => resizeObserver.observe(el));
    };
    const mutationObserver = new MutationObserver(() => {
      observeAll();
      measure();
    });

    observeAll();
    mutationObserver.observe(column, { childList: true, subtree: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [columnRef, enabled, natural]);

  if (!enabled || !boardBox) return { sticky: false };

  // Board sizes are on-screen px; the column's are its own (zoomed) px.
  const toColumn = (px: number) => px / chromeZoom;
  const availableScreen =
    boardBox.viewportHeight - boardBox.top - DESKTOP_BOTTOM_GAP;
  const boardFits = boardBox.height <= availableScreen + 1;
  const available = toColumn(availableScreen);
  const sticky: React.CSSProperties = {
    position: 'sticky',
    top: toColumn(boardBox.top),
  };

  const isSticky = !boardFits && need <= available;

  if (natural) {
    return { style: isSticky ? sticky : undefined, sticky: isSticky };
  }

  if (boardFits) {
    return {
      style: { height: Math.max(toColumn(boardBox.height), need) },
      sticky: false,
    };
  }

  return isSticky
    ? { style: { ...sticky, height: available }, sticky: true }
    : { style: { height: need }, sticky: false };
};
