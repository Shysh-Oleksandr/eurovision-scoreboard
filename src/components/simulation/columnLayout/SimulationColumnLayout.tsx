'use client';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import dynamic from 'next/dynamic';
import { useShallow } from 'zustand/shallow';

import { useSplitScreenStep } from '../qualification/useSplitScreenStep';

import BoardStage, { BoardBox } from './BoardStage';
import QualifiersColumn from './QualifiersColumn';
import QualifiersSheet from './QualifiersSheet';
import ResultsPanel from './ResultsPanel';
import SimHeader, { SimHeaderActions, SimHeaderTitle } from './SimHeader';
import SimStripe from './SimStripe';
import { useSimViewStore } from './simViewStore';
import { DESKTOP_BOTTOM_GAP, useColumnFit } from './useColumnFit';
import { useIsDesktopLayout } from './useSimLayout';
import VotingColumn from './VotingColumn';
import VotingSheet from './VotingSheet';

import { usePresentationLoop } from '@/components/presentationPanel/usePresentationLoop';
import { useShortcut } from '@/shortcuts/registry';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

const ShareResultsModal = dynamic(() => import('../share/ShareResultsModal'), {
  ssr: false,
});

/**
 * Desktop chrome (header, column, stripe) grows with big screens so it keeps
 * its proportion to the scaled board: 1 up to 1920 × 960, 1.5 at 2560 × 1440.
 */
const useChromeZoom = (isDesktop: boolean) => {
  const read = () =>
    typeof window === 'undefined'
      ? 1
      : Math.round(
          Math.min(
            1.5,
            Math.max(1, window.innerWidth / 1700, window.innerHeight / 960),
          ) * 100,
        ) / 100;
  const [zoom, setZoom] = useState(read);

  useEffect(() => {
    if (!isDesktop) return undefined;

    const onResize = () => setZoom(read());

    onResize();
    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, [isDesktop]);

  return isDesktop ? zoom : 1;
};

/** Space between the board's last row and a floating sheet or stripe. */
const FLOATING_GAP = 18;
/** After the final reveal, the controls come back this much later. */
const REVEAL_RETURN_DELAY_MS = 1400;

interface SimulationColumnLayoutProps {
  /**
   * `qualifiers`: a semi-final in Pick qualifiers mode (no points: the board
   * is the line-up, the column the qualifiers so far).
   */
  mode?: 'vote' | 'qualifiers';
  revealData: {
    leaderCode: string;
    lastCode: string;
    pointsNeeded: number;
  } | null;
  isRevealAnimationComplete: boolean;
  onRevealComplete: () => void;
  onBackToScoreboard: () => void;
}

/**
 * The final televote reveal has the stage to itself once the last points are
 * in: the controls (column, sheet or stripe) step aside while the bar runs,
 * since the results they would show give the winner away, and come back a
 * moment after it ends. Until the last points are given they stay: the
 * televote field and At random are how the viewer gives them.
 */
const useControlsHiddenForReveal = (
  revealActive: boolean,
  revealComplete: boolean,
) => {
  const [returned, setReturned] = useState(false);

  useEffect(() => {
    if (!revealActive || !revealComplete) {
      setReturned(false);

      return undefined;
    }

    const id = window.setTimeout(
      () => setReturned(true),
      REVEAL_RETURN_DELAY_MS,
    );

    return () => window.clearTimeout(id);
  }, [revealActive, revealComplete]);

  return revealActive && !(revealComplete && returned);
};

/**
 * The column simulation layout: where the broadcast shows the spokesperson,
 * the app shows the voter and their controls. Desktop: board + column;
 * phones: board + bottom sheet; the minimal view: board alone with a
 * floating stripe. A presentation runs in either. See `.impeccable/surfaces/`
 * for the brief.
 */
/** Mounts the split screen's auto-open (Pick qualifiers mode only). */
const SplitScreenStep = () => {
  useSplitScreenStep();

  return null;
};

const SimulationColumnLayout = ({
  mode = 'vote',
  revealData,
  isRevealAnimationComplete,
  onRevealComplete,
  onBackToScoreboard,
}: SimulationColumnLayoutProps) => {
  usePresentationLoop();

  const isQualifiers = mode === 'qualifiers';

  const isDesktop = useIsDesktopLayout();
  const chromeZoom = useChromeZoom(isDesktop);
  const isPresenting = useGeneralStore(
    (state) => state.presentationSettings.isPresenting,
  );
  const { isOver } = useScoreboardStore(
    useShallow((state) => ({ isOver: !!state.getCurrentStage()?.isOver })),
  );

  const [shareOpen, setShareOpen] = useState(false);
  const [shareLoaded, setShareLoaded] = useState(false);
  const [floatingHeight, setFloatingHeight] = useState(0);
  const openShare = useCallback(() => setShareOpen(true), []);

  useShortcut('share', openShare);

  const isShowMode = isPresenting && !isOver;
  const minimalView = useSimViewStore((state) => state.minimalView);
  const setMinimalView = useSimViewStore((state) => state.setMinimalView);
  // The stage ends when the reveal takes the last points.
  const controlsHidden = useControlsHiddenForReveal(
    revealData !== null && isOver,
    isRevealAnimationComplete,
  );
  const usesStripe = minimalView && !controlsHidden;
  // "View scoreboard" once the reveal has played (results variants).
  const backToScoreboard =
    revealData !== null && isRevealAnimationComplete
      ? onBackToScoreboard
      : undefined;

  // Escape leaves the minimal view (a presentation keeps running).
  useEffect(() => {
    if (!minimalView) return undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;

      const { target } = e;

      if (
        target instanceof Element &&
        target.closest('[role="dialog"], input, select, textarea')
      ) {
        return;
      }

      setMinimalView(false);
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [minimalView, setMinimalView]);

  const columnRef = useRef<HTMLDivElement>(null);
  const [boardBox, setBoardBox] = useState<BoardBox | null>(null);
  const hasColumn = isDesktop && !usesStripe;
  const columnFit = useColumnFit({
    columnRef,
    boardBox,
    chromeZoom,
    enabled: hasColumn,
    natural: isOver && !controlsHidden,
  });

  // Desktop: the title keeps clear of the actions laid over its row.
  const actionsRef = useRef<HTMLDivElement>(null);
  const [actionsWidth, setActionsWidth] = useState(0);

  useLayoutEffect(() => {
    const el = actionsRef.current;

    if (!el) {
      setActionsWidth(0);

      return undefined;
    }

    const read = () => setActionsWidth(el.offsetWidth);

    read();

    const observer = new ResizeObserver(read);

    observer.observe(el);

    return () => observer.disconnect();
  }, [isDesktop, usesStripe]);

  const hasFloating = !controlsHidden && (usesStripe || !isDesktop);
  const bottomReserve = hasFloating
    ? floatingHeight + FLOATING_GAP
    : DESKTOP_BOTTOM_GAP;

  return (
    <div
      className={`dp-sim mx-auto min-h-full w-full ${
        isDesktop
          ? 'grid gap-y-5 pt-7 lg:max-w-[min(100%,3200px)]'
          : 'flex flex-col gap-2 px-[2%] pt-3'
      }`}
      style={{
        paddingBottom: bottomReserve,
        // The same inset on both sides: the logo lines up with the board's
        // first column, the ⋯ button with the column's right edge.
        paddingInline: isDesktop ? 'clamp(40px, 4vw, 120px)' : undefined,
        // Desktop grid: header row, then the board row. A zero-width second
        // track carries the actions down the page's right edge, so they can
        // stay on screen with a sticky column while a long board scrolls.
        gridTemplateColumns: isDesktop ? 'minmax(0, 1fr) 0' : undefined,
        gridTemplateRows: isDesktop ? 'auto 1fr' : undefined,
      }}
    >
      {isDesktop ? (
        <>
          <header
            className="col-start-1 row-start-1 flex min-w-0"
            style={{
              zoom: chromeZoom === 1 ? undefined : chromeZoom,
              paddingRight: actionsWidth ? actionsWidth + 12 : undefined,
            }}
          >
            <SimHeaderTitle isDesktop centered={usesStripe} />
          </header>
          {!usesStripe && (
            <div
              className="z-30 col-start-2 row-span-2 row-start-1 flex w-0 justify-end self-start justify-self-end"
              style={
                columnFit.sticky
                  ? { position: 'sticky', top: '1.75rem' }
                  : undefined
              }
            >
              <div
                ref={actionsRef}
                style={chromeZoom === 1 ? undefined : { zoom: chromeZoom }}
              >
                <SimHeaderActions isDesktop onShare={openShare} />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="px-1">
          <SimHeader
            isDesktop={false}
            chromeHidden={usesStripe}
            onShare={openShare}
          />
        </div>
      )}

      <div
        className={`flex min-h-0 ${
          isDesktop ? 'col-span-2 col-start-1 row-start-2' : 'flex-1'
        }`}
      >
        <BoardStage
          qualifiers={isQualifiers}
          isDesktop={isDesktop}
          onBoardBox={setBoardBox}
          chromeZoom={chromeZoom}
          wide={usesStripe || controlsHidden}
          bottomReserve={bottomReserve}
          revealData={revealData}
          isRevealAnimationComplete={isRevealAnimationComplete}
          onRevealComplete={onRevealComplete}
        />
        {hasColumn && (
          // As tall as the board (`useColumnFit`). It folds away (width and
          // opacity) while the final reveal runs, and unfolds after it with
          // the results.
          <div
            ref={columnRef}
            className={`dp-sim-col flex flex-none flex-col self-start overflow-hidden ${
              controlsHidden ? 'is-folded' : ''
            }`}
            aria-hidden={controlsHidden || undefined}
            style={
              {
                ...columnFit.style,
                '--sim-col-w': 'clamp(320px, 24vw, 440px)',
                zoom: chromeZoom === 1 ? undefined : chromeZoom,
              } as React.CSSProperties
            }
          >
            <div className="flex min-h-0 w-[var(--sim-col-w)] flex-1 flex-col">
              {controlsHidden ? (
                <div className="dp-sim-panel flex-1 rounded-[16px]" />
              ) : isQualifiers ? (
                <QualifiersColumn
                  isPresenting={isShowMode}
                  onShare={openShare}
                />
              ) : isOver ? (
                <ResultsPanel
                  variant="column"
                  onShare={openShare}
                  onBackToScoreboard={backToScoreboard}
                />
              ) : (
                <VotingColumn isPresenting={isShowMode} />
              )}
            </div>
          </div>
        )}
      </div>

      {!isDesktop && !usesStripe && !controlsHidden && isQualifiers && (
        <QualifiersSheet
          isPresenting={isShowMode}
          onShare={openShare}
          onPeekHeight={setFloatingHeight}
        />
      )}
      {!isDesktop && !usesStripe && !controlsHidden && !isQualifiers && (
        <VotingSheet
          isOver={isOver}
          isPresenting={isShowMode}
          onShare={openShare}
          onBackToScoreboard={backToScoreboard}
          onPeekHeight={setFloatingHeight}
        />
      )}
      {usesStripe && (
        <SimStripe
          mode={mode}
          zoom={chromeZoom}
          isDesktop={isDesktop}
          isPresenting={isShowMode}
          isOver={isOver}
          onShare={openShare}
          onBackToScoreboard={backToScoreboard}
          onLeave={() => setMinimalView(false)}
          onHeight={setFloatingHeight}
        />
      )}

      {isQualifiers && <SplitScreenStep />}
      {(shareOpen || shareLoaded) && (
        <ShareResultsModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          onLoaded={() => setShareLoaded(true)}
        />
      )}
    </div>
  );
};

export default SimulationColumnLayout;
