'use client';
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useShallow } from 'zustand/shallow';

import FinalTelevoteReveal from '../FinalTelevoteReveal';

import QualifierBoard from './QualifierBoard';
import { PhoneBoardColumns, useSimViewStore } from './simViewStore';

import Board from '@/components/board/Board';
import BoardHeader from '@/components/board/BoardHeader';
import {
  BoardLayoutContext,
  BoardLayoutOverride,
} from '@/components/board/BoardLayoutContext';
import { getShortCodes } from '@/data/countries/shortCodes';
import { useScoreboardStore } from '@/state/scoreboardStore';

/** Narrowest column (in the board's own px) at which names still read well. */
const MIN_COLUMN_WIDTH = 360;
/** Widest column before rows look stretched; extra room becomes margin. */
const MAX_COLUMN_WIDTH = 520;
const COLUMN_GAP = 16;
/**
 * The board grows with the screen, but never more than this much past the
 * chrome around it (header, column), so it stays big without crowding the
 * edges: 1.25 at 1440 × 900, about 1.9 at 2560 × 1440.
 */
const MAX_ZOOM_OVER_CHROME = 1.25;
/** Share of the free height the board may take: the rest is air. */
const HEIGHT_FILL = 0.96;
/**
 * The zoom is fitted as if the board had at least this many rows (a final in
 * two columns), so a semi-final's rows are as big as the final's instead of
 * filling the screen.
 */
const MIN_SCALE_ROWS = 13;
/** Line-ups from this size use three columns when the board has the width. */
const THREE_COLUMNS_FROM = 32;
/** How long rows snap instead of animating after the layout changed. */
const RELAYOUT_MS = 220;

interface RevealProps {
  revealData: {
    leaderCode: string;
    lastCode: string;
    pointsNeeded: number;
  } | null;
  isRevealAnimationComplete: boolean;
  onRevealComplete: () => void;
}

/** Where the board sits in its scroll container, in screen px (desktop). */
export interface BoardBox {
  /** Top edge, from the top of the scrolled content. */
  top: number;
  height: number;
  /** Height of the scroll container's viewport. */
  viewportHeight: number;
}

interface BoardStageProps extends RevealProps {
  /** Pick qualifiers mode: the line-up to pick from instead of the board. */
  qualifiers?: boolean;
  isDesktop: boolean;
  /** Desktop: reports the board's box (the column sizes itself to it). */
  onBoardBox?: (box: BoardBox) => void;
  /** Desktop chrome scale on big screens (caps the board's zoom). */
  chromeZoom: number;
  /** No column next to the board (minimal view, show mode, the reveal). */
  wide: boolean;
  /** Pixels kept clear under the board (the sheet's peek, the stripe). */
  bottomReserve: number;
}

type ZoomedElement = HTMLElement & { __dpZoomRect?: true };

/**
 * react-flip-toolkit measures rows with getBoundingClientRect (zoomed, on
 * screen) but animates them with transforms in the board's own px, which the
 * zoom scales again, so moves would overshoot. Rows report their rect in the
 * board's own px instead; differences are all FLIP needs.
 */
const patchRowRects = (
  root: HTMLElement,
  zoomRef: React.MutableRefObject<number>,
) => {
  root.querySelectorAll<ZoomedElement>('[data-flip-id]').forEach((el) => {
    if (el.__dpZoomRect) return;

    el.__dpZoomRect = true;
    el.getBoundingClientRect = function getUnzoomedRect(this: Element) {
      const rect = Element.prototype.getBoundingClientRect.call(this);
      const zoom = zoomRef.current;

      return zoom === 1
        ? rect
        : new DOMRect(
            rect.x / zoom,
            rect.y / zoom,
            rect.width / zoom,
            rect.height / zoom,
          );
    };
  });
};

/**
 * The phone fit's steps. Auto tries one column, then two; when two columns
 * would cut a name off it settles on one column after all (the board
 * scrolls a little) rather than shrinking names below the theme's size.
 * Two columns asked for keep them, with sports codes ("NOR") in place of
 * names when a name doesn't fit.
 */
const STEPS = {
  one: { columns: 1, names: 'normal' },
  two: { columns: 2, names: 'wrap' },
  oneAfterAll: { columns: 1, names: 'normal' },
  twoCodes: { columns: 2, names: 'code' },
} as const;

type StepId = keyof typeof STEPS;

const STEP_ORDER: Record<PhoneBoardColumns, StepId[]> = {
  auto: ['one', 'two', 'oneAfterAll'],
  '1': ['one'],
  '2': ['two', 'twoCodes'],
};

/** Phones: rows grow into spare height up to a comfortable tap target. */
const MAX_PHONE_ROW_HEIGHT = 44;
/** Rows never spread further apart than this. */
const MAX_PHONE_ROW_GAP = 6;
/** How much wider a flag may get in a taller row (the rest is cropped). */
const MAX_FLAG_GROWTH = 6;

const ROW_SELECTOR = '.container-wrapping-flipper > div > .dp-scoreboard-font';

/**
 * Whether a name's text is wider than its box. scrollWidth rounds to whole
 * pixels, so a 0.3px overflow (enough to draw an ellipsis) would pass; the
 * text's own range is measured instead. Wrapped names report their widest
 * line.
 */
const nameOverflows = (name: HTMLElement) => {
  const range = document.createRange();

  range.selectNodeContents(name);

  const style = getComputedStyle(name);
  const box =
    name.getBoundingClientRect().width -
    parseFloat(style.paddingLeft) -
    parseFloat(style.paddingRight);

  return range.getBoundingClientRect().width > box + 0.01;
};

const overflowingNames = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('[data-entry-name]')).filter(
    nameOverflows,
  );

interface PhoneFit {
  columns: 1 | 2;
  /**
   * `wrap`: two columns, where a long name may take two lines. `code`: two
   * columns showing short codes instead of names.
   */
  names: 'normal' | 'wrap' | 'code';
  /** Row height when there is spare height to give them, else undefined. */
  rowHeight?: number;
  /** Flag width that keeps the flag's shape at that row height. */
  flagWidth?: number;
  /** Spacing between rows for the height the rows don't take. */
  rowGap?: number;
  /** The fit has finished for the current line-up and space. */
  settled: boolean;
}

/**
 * Phones: one column while the whole board fits the screen (the most
 * readable), otherwise two columns so the last places stay in view, as long
 * as every name still fits at the theme's size (a long name may wrap to two
 * lines). If one doesn't (a narrow phone, a long single word), one column
 * after all: names never shrink. Rows then grow into the height left over.
 * Re-measured when the line-up, the space or the fonts change, not on every
 * award. Names are styled from the board's `data-names`, never per row, so
 * rows remounted by a new entrance need no re-measuring.
 */
const usePhoneColumnFit = (
  ref: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
  lineupKey: string,
  bottomReserve: number,
): PhoneFit => {
  const phoneColumns = useSimViewStore((state) => state.phoneColumns);
  const [space, setSpace] = useState({ width: 0, height: 0 });
  const [fontsVersion, setFontsVersion] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;

    if (!el || !enabled) return undefined;

    const read = () => {
      // The window's width, not the board's: a scrollbar appearing while a
      // step is measured would change the board's and restart the fit, over
      // and over. The names are measured at the board's real width anyway.
      const width = window.innerWidth;
      // Rounded so the sheet's small height changes don't re-measure.
      const height =
        Math.round(
          (window.innerHeight -
            el.getBoundingClientRect().top -
            bottomReserve) /
            8,
        ) * 8;

      setSpace((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    };

    read();

    const observer = new ResizeObserver(read);
    const onFonts = () => {
      read();
      setFontsVersion((version) => version + 1);
    };

    observer.observe(el);
    // The header above can change height (a title wrapping once the theme
    // font loads), which moves the board without resizing it.
    const root = el.closest('.dp-sim');

    if (root) observer.observe(root);
    window.addEventListener('resize', read);
    document.fonts?.addEventListener('loadingdone', onFonts);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', read);
      document.fonts?.removeEventListener('loadingdone', onFonts);
    };
  }, [ref, enabled, bottomReserve]);

  const order = STEP_ORDER[phoneColumns];
  const lastStep = order.length - 1;
  const key = `${lineupKey}|${space.width}|${space.height}|${phoneColumns}|${fontsVersion}`;
  const [fit, setFit] = useState<{
    key: string;
    /** Index into `order`. */
    step: number;
    /**
     * `rows`: natural rows, choose the column count and the row height.
     * `names`: taller rows applied, fit the names. `done`: settled.
     */
    phase: 'rows' | 'names' | 'done';
    rowHeight?: number;
    flagWidth?: number;
    rowGap?: number;
  }>({ key: '', step: 0, phase: 'rows' });

  // A new line-up or space starts over from the first step, at the natural
  // row height (derived state: React re-renders before painting, so a wrong
  // step never shows).
  if (enabled && fit.key !== key) {
    setFit({ key, step: 0, phase: 'rows' });
  }

  useLayoutEffect(() => {
    const el = ref.current;

    if (!enabled || !el || fit.phase === 'done' || fit.key !== key) return;

    const board =
      el.querySelector<HTMLElement>('.container-wrapping-flipper > div') ?? el;
    const stepId = order[Math.min(fit.step, lastStep)];
    const { columns } = STEPS[stepId];

    if (fit.phase === 'rows') {
      // Rows are measured at rest: the host renders `data-relayout` until
      // the fit is done, which switches the theme's row transitions off.

      // One column only while the whole board fits the screen (one column
      // after all takes whatever height it needs).
      if (stepId === 'one' && fit.step < lastStep) {
        if (board.offsetHeight > space.height) {
          setFit({ ...fit, step: fit.step + 1 });

          return;
        }
      }

      // Give the spare height to the rows: bigger tap targets, no dead
      // space. Margins are read off the same row at the same moment, so a
      // row still easing back from a previous height can't skew it.
      const rowCount = Math.ceil(board.children.length / columns);
      const firstRow = el.querySelector<HTMLElement>(
        `${ROW_SELECTOR} > button`,
      );
      let rowHeight: number | undefined;
      let flagWidth: number | undefined;
      let rowGap: number | undefined;

      if (rowCount > 0 && firstRow?.parentElement) {
        const gap = parseFloat(getComputedStyle(board).rowGap) || 0;
        // Per-row space beyond the row itself (margins, a taller neighbour
        // in the same grid row), from the board's natural height.
        const overhead =
          (board.offsetHeight - (rowCount - 1) * gap) / rowCount -
          firstRow.offsetHeight;
        const fitted =
          Math.floor((space.height - (rowCount - 1) * gap) / rowCount) -
          overhead;
        // The board's own phone row heights: h-8, md:h-9 (CountryItem).
        const natural = window.innerWidth >= 768 ? 31.5 : 28;

        if (fitted >= natural + 2) {
          rowHeight = Math.min(MAX_PHONE_ROW_HEIGHT, fitted);

          // Flags keep the shape the theme gives them: they may widen a
          // little with the row (the names need that width more), so the row
          // stops growing where the flag would turn into a cropped slice.
          const flag = firstRow.querySelector<HTMLImageElement>(
            'img:not(.rounded-full)',
          );

          if (flag?.offsetHeight && flag.offsetWidth) {
            const ratio = flag.offsetWidth / flag.offsetHeight;
            const widest = flag.offsetWidth + MAX_FLAG_GROWTH;

            rowHeight = Math.min(rowHeight, Math.floor(widest / ratio));
            flagWidth = Math.min(widest, Math.round(rowHeight * ratio));
          }

          // Height the rows can't take becomes even spacing between them,
          // so the board still reaches the sheet instead of leaving a gap.
          if (rowCount > 1) {
            const pitch = rowHeight + overhead;

            rowGap = Math.min(
              MAX_PHONE_ROW_GAP,
              Math.max(
                gap,
                Math.floor((space.height - rowCount * pitch) / (rowCount - 1)),
              ),
            );
          }
        }
      }

      setFit({ ...fit, phase: 'names', rowHeight, flagWidth, rowGap });

      return;
    }

    // Names, measured at the final row and flag sizes (two lines allowed):
    // a name still cut off sends Auto back to one column, and two columns
    // asked for on to codes.
    if (
      stepId === 'two' &&
      fit.step < lastStep &&
      overflowingNames(el).length > 0
    ) {
      // The next step's rows are sized afresh (one column has its own).
      setFit({ key: fit.key, step: fit.step + 1, phase: 'rows' });

      return;
    }

    setFit({ ...fit, phase: 'done' });
  }, [enabled, fit, key, lastStep, order, ref, space.height]);

  const step = STEPS[order[Math.min(fit.step, lastStep)]];
  const applied = fit.phase !== 'rows';

  return {
    columns: step.columns,
    names: step.names,
    rowHeight: applied ? fit.rowHeight : undefined,
    flagWidth: applied ? fit.flagWidth : undefined,
    rowGap: applied ? fit.rowGap : undefined,
    settled: fit.phase === 'done' && fit.key === key,
  };
};

/**
 * Rows snap to a new layout instead of animating into it: while the window
 * is being resized (`data-resizing`, set straight on the DOM so it lands
 * before the browser restyles) and for a moment after the column count or
 * the row size changed (`data-relayout`, rendered with the change itself).
 * CSS switches the theme's row transitions off; `Board` skips FLIP moves.
 */
const useRelayoutFlags = (
  hostRef: React.RefObject<HTMLDivElement | null>,
  signature: string,
) => {
  const [settledSignature, setSettledSignature] = useState(signature);

  useEffect(() => {
    if (signature === settledSignature) return undefined;

    const id = window.setTimeout(
      () => setSettledSignature(signature),
      RELAYOUT_MS,
    );

    return () => window.clearTimeout(id);
  }, [signature, settledSignature]);

  useEffect(() => {
    let id: number | undefined;
    const onResize = () => {
      hostRef.current?.setAttribute('data-resizing', '');
      window.clearTimeout(id);
      id = window.setTimeout(
        () => hostRef.current?.removeAttribute('data-resizing'),
        RELAYOUT_MS,
      );
    };

    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(id);
    };
  }, [hostRef]);

  return signature !== settledSignature;
};

/**
 * The board area: picks the column count, scales the whole board to the
 * screen on desktop (zoom, so row proportions never change) and shows the
 * final televote reveal in its place.
 */
const getScrollParent = (el: HTMLElement) => {
  let node = el.parentElement;

  while (node && node !== document.body) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
    node = node.parentElement;
  }

  return document.scrollingElement as HTMLElement | null;
};

const BoardStage = ({
  qualifiers = false,
  isDesktop,
  onBoardBox,
  chromeZoom,
  wide,
  bottomReserve,
  revealData,
  isRevealAnimationComplete,
  onRevealComplete,
}: BoardStageProps) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const scaledRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const [zoom, setZoom] = useState(1);
  const [zoomMeasured, setZoomMeasured] = useState(false);
  const [localWidth, setLocalWidth] = useState<number | undefined>();

  const { stageId, countriesCount, showAllParticipants } = useScoreboardStore(
    useShallow((state) => {
      const stage = state.getCurrentStage();

      return {
        stageId: stage?.id ?? '',
        countriesCount: stage?.countries.length ?? 0,
        showAllParticipants: state.showAllParticipants,
      };
    }),
  );

  const showRevealPanel = revealData !== null;
  // The reveal replaces the rows: fit them again when they come back.
  const lineupKey = `${stageId}|${countriesCount}|${showAllParticipants}|${showRevealPanel}`;
  const phoneStep = usePhoneColumnFit(
    hostRef,
    !isDesktop,
    lineupKey,
    bottomReserve,
  );

  let columns: BoardLayoutOverride['columns'] = 2;

  if (!isDesktop) {
    ({ columns } = phoneStep);
  } else if (wide && countriesCount >= THREE_COLUMNS_FROM) {
    // The board scales to the screen, so two columns stay roomier than
    // three until a line-up gets really long.
    columns = 3;
  }

  const appearReady = isDesktop ? zoomMeasured : phoneStep.settled;
  const showCodes = !isDesktop && phoneStep.names === 'code';
  // Every entry of the event, so a custom entry keeps one code across
  // stages and with the non-qualifiers shown. A string, so awards (new
  // stage objects) don't recompute it.
  const eventEntries = useScoreboardStore((state) =>
    showCodes
      ? state.eventStages
          .flatMap((stage) =>
            stage.countries.map((c) => `${c.code}\u0000${c.name}`),
          )
          .join('\u0001')
      : '',
  );
  const shortCodes = useMemo(
    () =>
      eventEntries
        ? getShortCodes(
            eventEntries.split('\u0001').map((entry) => {
              const [code, name] = entry.split('\u0000');

              return { code, name };
            }),
          )
        : undefined,
    [eventEntries],
  );
  const layout = useMemo<BoardLayoutOverride>(
    () => ({ columns, appearReady, shortCodes }),
    [columns, appearReady, shortCodes],
  );

  zoomRef.current = zoom;

  // Desktop: fit the board to the space left by the header and the column.
  useLayoutEffect(() => {
    const host = hostRef.current;
    const scaled = scaledRef.current;

    if (!isDesktop || !host || !scaled) {
      setZoom(1);
      setLocalWidth(undefined);
      setZoomMeasured(false);

      return undefined;
    }

    const measure = () => {
      const flipper = scaled.querySelector<HTMLElement>(
        '.container-wrapping-flipper',
      );
      // offsetHeight is in the board's own px, whatever the zoom.
      let naturalHeight = Math.max((flipper ?? scaled).offsetHeight, 1);
      const rowCount = flipper
        ? Math.ceil(
            (flipper.firstElementChild?.childElementCount ?? 0) / columns,
          )
        : 0;

      // Scale a short line-up as if it had a final's rows.
      if (rowCount > 0 && rowCount < MIN_SCALE_ROWS) {
        naturalHeight = (naturalHeight / rowCount) * MIN_SCALE_ROWS;
      }

      const hostWidth = host.clientWidth;
      const availableHeight =
        (window.innerHeight -
          host.getBoundingClientRect().top -
          bottomReserve) *
        HEIGHT_FILL;
      const minWidth = columns * MIN_COLUMN_WIDTH + (columns - 1) * COLUMN_GAP;
      const maxWidth = columns * MAX_COLUMN_WIDTH + (columns - 1) * COLUMN_GAP;
      const next = Math.min(
        MAX_ZOOM_OVER_CHROME * chromeZoom,
        Math.max(
          1,
          Math.min(availableHeight / naturalHeight, hostWidth / minWidth),
        ),
      );
      const rounded = Math.floor(next * 100) / 100;

      setZoom(rounded);
      setLocalWidth(Math.floor(Math.min(hostWidth / rounded, maxWidth)));
      setZoomMeasured(true);
    };

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(host);
    observer.observe(scaled);
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [isDesktop, chromeZoom, columns, bottomReserve, revealData]);

  // Desktop: tell the column where the board is and how tall it shows.
  useLayoutEffect(() => {
    const scaled = scaledRef.current;

    if (!isDesktop || !scaled || !onBoardBox) return undefined;

    const scroller = getScrollParent(scaled);
    const report = () => {
      const rect = scaled.getBoundingClientRect();
      const scrollerTop = scroller?.getBoundingClientRect().top ?? 0;

      onBoardBox({
        top: Math.round(rect.top - scrollerTop + (scroller?.scrollTop ?? 0)),
        height: Math.round(rect.height),
        viewportHeight: scroller?.clientHeight ?? window.innerHeight,
      });
    };

    report();

    const observer = new ResizeObserver(report);

    observer.observe(scaled);
    window.addEventListener('resize', report);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', report);
    };
  }, [isDesktop, onBoardBox, zoom, localWidth]);

  // Keep FLIP moves right under the zoom (rows mount per stage).
  useEffect(() => {
    const scaled = scaledRef.current;

    if (!scaled || !isDesktop) return undefined;

    patchRowRects(scaled, zoomRef);

    const observer = new MutationObserver(() => patchRowRects(scaled, zoomRef));

    observer.observe(scaled, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [isDesktop]);

  // Wide modes centre the board on what is visible: the rounded rows keep an
  // empty lane for the latest points on their right, which would otherwise
  // push the board left of centre.
  const [centreShift, setCentreShift] = useState(0);

  useLayoutEffect(() => {
    const scaled = scaledRef.current;

    if (!isDesktop || !wide || !scaled) {
      setCentreShift(0);

      return;
    }

    const rect = (el: Element) =>
      Element.prototype.getBoundingClientRect.call(el);
    let left = Infinity;
    let right = -Infinity;

    scaled.querySelectorAll(ROW_SELECTOR).forEach((row) => {
      const points = row.querySelector('[data-points-current]');

      left = Math.min(left, rect(row).left);
      right = Math.max(right, rect(points ?? row).right);
    });

    // No rows (the final reveal): nothing to correct.
    if (!Number.isFinite(left)) {
      setCentreShift(0);

      return;
    }

    const box = rect(scaled);
    const shift = (box.right - right - (left - box.left)) / 2;

    // In the board's own px: `left` on a zoomed element is scaled by it.
    setCentreShift(Math.round(shift / zoom));
  }, [isDesktop, wide, zoom, localWidth, columns, stageId, showRevealPanel]);

  const rowHeight = isDesktop ? undefined : phoneStep.rowHeight;

  /**
   * Phones: the spacing between taller rows is part of the rows' tap area.
   * A tap there (or on a row's place badge) counts as a tap on the row it
   * is closest to, so every row's target spans the full row pitch.
   */
  // The first points given by tapping a row retire the voting hint (an
  // enabled row only takes clicks when tapping it gives points).
  const onRowTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (useSimViewStore.getState().boardTapped) return;

    if ((e.target as HTMLElement).closest(`${ROW_SELECTOR} > button`)) {
      useSimViewStore.getState().setBoardTapped();
    }
  };

  const onBoardSpacingClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDesktop) return;

    const target = e.target as HTMLElement;

    if (target.closest('button')) return;

    const halfGap = (phoneStep.rowGap ?? 0) / 2 + 1;
    const row = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>(ROW_SELECTOR),
    ).find((candidate) => {
      const rect = candidate.getBoundingClientRect();

      return (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top - halfGap &&
        e.clientY <= rect.bottom + halfGap
      );
    });

    row?.querySelector('button')?.click();
  };
  const flagWidth = isDesktop ? undefined : phoneStep.flagWidth;
  const rowGap = isDesktop ? undefined : phoneStep.rowGap;

  const relayout =
    useRelayoutFlags(
      hostRef,
      `${isDesktop}|${columns}|${rowHeight}|${flagWidth}|${rowGap}|${phoneStep.names}`,
    ) ||
    (!isDesktop && !phoneStep.settled);

  return (
    <div
      ref={hostRef}
      className="dp-sim-board relative min-w-0 flex-1"
      data-names={isDesktop ? undefined : phoneStep.names}
      data-tall={rowHeight ? '' : undefined}
      data-relayout={relayout ? '' : undefined}
      style={
        rowHeight
          ? ({
              '--sim-row-h': `${rowHeight}px`,
              '--sim-flag-w': flagWidth ? `${flagWidth}px` : undefined,
              '--sim-row-gap': rowGap ? `${rowGap}px` : undefined,
            } as React.CSSProperties)
          : undefined
      }
    >
      <div
        ref={scaledRef}
        onClick={onBoardSpacingClick}
        onClickCapture={onRowTap}
        // Next to the column the board starts at the page's edge (lined up
        // with the header's logo); alone it is centred.
        className={`relative ${wide ? 'mx-auto' : ''}`}
        style={
          isDesktop
            ? {
                zoom,
                width: localWidth ? `${localWidth}px` : undefined,
                left: centreShift || undefined,
              }
            : undefined
        }
      >
        {/* The teaser over the reveal; afterwards "View scoreboard" lives
            with the results (column, sheet or stripe). */}
        {showRevealPanel && !isRevealAnimationComplete && (
          <BoardHeader revealOnly revealActive />
        )}
        <BoardLayoutContext.Provider value={layout}>
          {showRevealPanel && revealData ? (
            <FinalTelevoteReveal
              leaderCountryCode={revealData.leaderCode}
              lastCountryCode={revealData.lastCode}
              pointsNeeded={revealData.pointsNeeded}
              onRevealComplete={onRevealComplete}
            />
          ) : qualifiers ? (
            <QualifierBoard />
          ) : (
            <Board />
          )}
        </BoardLayoutContext.Provider>
      </div>
    </div>
  );
};

export default BoardStage;
