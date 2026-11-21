'use client';
import { Cog, Minimize2, Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  EdgeProgress,
  PresentationOptions,
  RandomSplitButton,
} from './controls';
import Popover from './Popover';
import {
  PlaceChips,
  QualifierLine,
  QualifierRandomSplitButton,
  SplitTiles,
  useQualifiedCaption,
} from './QualifierParts';
import ResultsPanel from './ResultsPanel';
import TelevoteEntry from './TelevoteEntry';
import { useQualifiers } from './useQualifiers';
import { useRoundProgress } from './useRoundProgress';
import { useVoterInfo } from './useVoterInfo';
import { ThemePointsStrip } from './VotingColumn';
import { VoterLine } from './VotingSheet';

import Button from '@/components/common/Button';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useGeneralStore } from '@/state/generalStore';

/**
 * Desktop: the stripe keeps one width (in its own, zoomed px) whatever the
 * round or the presentation; the voter's line takes what the controls leave.
 */
const DESKTOP_WIDTH = 970;
/** Every desktop control in the stripe is this tall (Button `md` is 35px). */
const CONTROL = '!h-[40px]';

interface SimStripeProps {
  /** `qualifiers`: Pick qualifiers mode (the latest qualifier, the places). */
  mode: 'vote' | 'qualifiers';
  /** Desktop chrome scale on big screens. */
  zoom: number;
  isDesktop: boolean;
  /** Auto-presentation is running (show mode). */
  isPresenting: boolean;
  isOver: boolean;
  onShare: () => void;
  /** After the final reveal: back from the reveal to the board. */
  onBackToScoreboard?: () => void;
  /** Leaves the minimal view (a presentation keeps running). */
  onLeave: () => void;
  onHeight: (height: number) => void;
}

/**
 * The floating stripe of the minimal view: the voter and the count stay on
 * screen with the controls the moment needs. Presenting changes as little as
 * possible: Present turns into Pause and the hand controls step out; the
 * stripe keeps its height and (on desktop) its width. Board centred and wide,
 * nothing else around it, so a screen recording can be posted as it is.
 */
const SimStripe = ({
  mode,
  zoom,
  isDesktop,
  isPresenting,
  isOver,
  onShare,
  onBackToScoreboard,
  onLeave,
  onHeight,
}: SimStripeProps) => {
  const t = useTranslations('simulation');
  const voter = useVoterInfo();
  const voteProgress = useRoundProgress(voter);
  const q = useQualifiers();
  // Shown over the split screen: where the next pick goes.
  const qualifiedCaption = useQualifiedCaption(q, 'next');
  const showProgress = useGeneralStore(
    (state) => state.settings.shouldShowJuryVotingProgress,
  );
  const isQualifiers = mode === 'qualifiers';
  const progress = isQualifiers
    ? showProgress
      ? q.progress
      : undefined
    : voteProgress;
  const setPresentationSettings = useGeneralStore(
    (state) => state.setPresentationSettings,
  );
  const presentationModeEnabled = useGeneralStore(
    (state) => state.settings.presentationModeEnabled,
  );
  const ref = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);

  // The gear goes with the results; don't bring its popover back after them.
  useEffect(() => {
    if (isOver) setOptionsOpen(false);
  }, [isOver]);

  const pause = () => setPresentationSettings({ isPresenting: false });
  const present = () => setPresentationSettings({ isPresenting: true });
  const canPresent = presentationModeEnabled || isPresenting;
  const isJury = voter.phase === 'jury';

  // Android back: pause a presentation first, then leave the minimal view.
  useBackHandler(true, () => (isPresenting ? pause() : onLeave()), {
    blocksShortcuts: false,
  });

  useLayoutEffect(() => {
    const el = ref.current;

    if (!el) return undefined;

    // On screen (zoomed) height: the board keeps this much clear.
    const report = () => onHeight(el.getBoundingClientRect().height);

    report();

    const observer = new ResizeObserver(report);

    observer.observe(el);

    return () => observer.disconnect();
  }, [onHeight]);

  const leaveButton = (
    <Button
      variant="surface"
      // Matches its neighbours: the voting controls, the results row (md).
      size={!isOver && !isDesktop ? 'lg' : 'md'}
      className={!isOver && isDesktop ? CONTROL : ''}
      title={t('view.leaveMinimalView')}
      aria-label={t('view.leaveMinimalView')}
      Icon={<Minimize2 className="size-[18px]" />}
      onClick={onLeave}
      shortcut="minimalView"
    />
  );

  const position = isDesktop ? 'left-1/2 -translate-x-1/2' : 'inset-x-2.5';
  const hairline = <div className="h-8 w-px shrink-0 bg-hair" />;

  let content: React.ReactNode;

  if (isOver) {
    content = (
      <div
        className={`flex items-center gap-2.5 ${
          isDesktop ? '' : 'flex-wrap [&>*:first-child]:basis-full'
        }`}
      >
        <ResultsPanel
          variant="stripe"
          onShare={onShare}
          onBackToScoreboard={onBackToScoreboard}
          trailing={leaveButton}
          hideStats={isQualifiers}
        />
      </div>
    );
  } else if (isDesktop) {
    // Voter | the round's control (read-only strip while presenting) |
    // Random, Present / Pause, presentation options, leave. Nothing moves
    // when a presentation starts: what steps out leaves its place empty.
    // Pick qualifiers: the latest qualifier | the places as flags | the same.
    let middle: React.ReactNode = isJury ? (
      <ThemePointsStrip />
    ) : (
      !isPresenting && <TelevoteEntry variant="stripe" />
    );

    if (isQualifiers) middle = <PlaceChips q={q} size={30} />;

    content = (
      <div
        className="flex items-center gap-3.5"
        style={{
          // At most the screen less 16px a side. `vw` isn't zoomed, the
          // stripe is: divide, then take off its padding and border.
          width: `min(${DESKTOP_WIDTH}px, calc((100vw - 32px) / ${zoom} - 20px))`,
        }}
      >
        <div className="w-[230px] min-w-0 shrink">
          {isQualifiers ? <QualifierLine q={q} /> : <VoterLine voter={voter} />}
        </div>
        {middle && (
          <>
            {hairline}
            <div className="w-[330px] shrink-0">{middle}</div>
          </>
        )}
        <div className="ml-auto h-8 w-px shrink-0 bg-hair" />
        <div className="flex shrink-0 items-center gap-2">
          {!isPresenting &&
            (isQualifiers ? (
              <QualifierRandomSplitButton q={q} />
            ) : (
              <RandomSplitButton voter={voter} />
            ))}
          {canPresent && (
            <>
              <Button
                variant="cta"
                size="md"
                className={CONTROL}
                Icon={
                  isPresenting ? (
                    <Pause className="size-[18px]" fill="currentColor" />
                  ) : (
                    <Play className="size-[18px]" fill="currentColor" />
                  )
                }
                onClick={isPresenting ? pause : present}
                shortcut="present"
              >
                {isPresenting ? t('presentation.pause') : t('view.present')}
              </Button>
              <div ref={optionsRef} className="contents">
                <Button
                  variant="surface"
                  size="md"
                  className={`${CONTROL} ${optionsOpen ? 'is-on' : ''}`}
                  title={t('view.presentationOptions')}
                  aria-label={t('view.presentationOptions')}
                  aria-pressed={optionsOpen}
                  Icon={<Cog className="size-[18px]" />}
                  onClick={() => setOptionsOpen((open) => !open)}
                />
              </div>
            </>
          )}
          {leaveButton}
        </div>
      </div>
    );
  } else {
    // Phones: the voter line with Present / Pause and leave, the round's
    // control under it (the jury strip stays while presenting).
    let second: React.ReactNode = isJury ? (
      <ThemePointsStrip />
    ) : (
      !isPresenting && <TelevoteEntry variant="stripe" size="lg" />
    );

    if (isQualifiers) second = <PlaceChips q={q} />;

    const trailing = (
      <div className="flex gap-2">
        {canPresent && (
          <Button
            variant="cta"
            size="lg"
            title={isPresenting ? t('presentation.pause') : t('view.present')}
            aria-label={
              isPresenting ? t('presentation.pause') : t('view.present')
            }
            Icon={
              isPresenting ? (
                <Pause className="size-5" fill="currentColor" />
              ) : (
                <Play className="size-[18px]" fill="currentColor" />
              )
            }
            onClick={isPresenting ? pause : present}
            shortcut="present"
          />
        )}
        {leaveButton}
      </div>
    );

    content = (
      <div className="flex flex-col gap-3">
        {isQualifiers ? (
          <QualifierLine q={q} trailing={trailing} />
        ) : (
          <VoterLine voter={voter} trailing={trailing} />
        )}
        {second}
      </div>
    );
  }

  // Pick qualifiers with split screen on: the candidates float above the
  // stripe, the minimal view's stage for the moment (positioned against the
  // stripe, so they share its zoom).
  const splitPanel = isQualifiers &&
    !isOver &&
    q.splitCandidates.length > 0 && (
      <div className="pointer-events-none absolute inset-x-0 bottom-full mb-3 flex justify-center">
        <div
          className={`dp-sim-float dp-sim-float-in pointer-events-auto flex flex-col gap-2.5 rounded-[18px] p-3 ${
            isDesktop ? 'w-[min(720px,100%)]' : 'w-full'
          }`}
        >
          <div className="flex items-baseline gap-3 px-1">
            <p className="min-w-0 flex-1 text-[16px] font-extrabold leading-tight tracking-[-0.01em] text-white">
              {t('chooseCountryToQualify')}
            </p>
            <span className="shrink-0 text-[12.5px] font-semibold text-white/75">
              {qualifiedCaption}
            </span>
          </div>
          <SplitTiles
            candidates={q.splitCandidates}
            small={!isDesktop}
            className={`overflow-hidden rounded-[12px] ${
              isDesktop ? 'h-[220px]' : 'h-[130px]'
            }`}
          />
        </div>
      </div>
    );

  return (
    <>
      <div
        ref={ref}
        role="region"
        aria-label={t('view.votingControls')}
        className={`dp-sim-float dp-sim-float-in fixed bottom-[calc(var(--safe-bottom-bar)+14px)] z-[41] rounded-[18px] p-2.5 text-white ${position}`}
        style={zoom === 1 ? undefined : { zoom }}
      >
        {!isOver && <EdgeProgress progress={progress} inset={18} />}
        {splitPanel}
        {content}
      </div>
      <Popover
        open={optionsOpen && isDesktop && !isOver}
        anchor={(optionsRef.current?.firstElementChild as HTMLElement) ?? null}
        onClose={() => setOptionsOpen(false)}
        ariaLabel={t('view.presentationOptions')}
        className="w-[300px]"
      >
        <div className="mb-3 text-[14px] font-extrabold">
          {t('view.presentation')}
        </div>
        <PresentationOptions />
      </Popover>
    </>
  );
};

export default SimStripe;
