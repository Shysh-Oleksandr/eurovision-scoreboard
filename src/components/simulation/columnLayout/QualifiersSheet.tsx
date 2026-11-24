'use client';
import { Pause, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import BottomSheet from './BottomSheet';
import { PresentationOptions } from './controls';
import {
  PlaceChips,
  QualifiedList,
  QualifiersFlagGrid,
  QualifierHint,
  QualifierLine,
  QualifierRandomGroup,
  QualifierRandomQuickButton,
  QualifierResultsActions,
  QualifierStatsButton,
  SplitTiles,
  useQualifiedCaption,
  useShowsClosingGrid,
} from './QualifierParts';
import { useQualifiers } from './useQualifiers';
import { BoardColumnsSetting, PresentButton } from './VotingSheet';

import Button from '@/components/common/Button';
import { useGeneralStore } from '@/state/generalStore';

interface QualifiersSheetProps {
  /** A presentation runs: Pause instead of the hand controls. */
  isPresenting: boolean;
  onShare: () => void;
  onPeekHeight: (height: number) => void;
}

/**
 * Phones, Pick qualifiers mode: the column folded into the bottom sheet.
 * The peek keeps the latest qualifier, Random and the places as flags; with
 * split screen on, the candidates float above it. Pulled up: the full list,
 * At random, the board columns and Present. Once the stage is over the peek
 * shows the qualifiers' flags and Continue, and pulled up the full list.
 */
const QualifiersSheet = ({
  isPresenting,
  onShare,
  onPeekHeight,
}: QualifiersSheetProps) => {
  const t = useTranslations('simulation');
  const q = useQualifiers();
  const caption = useQualifiedCaption(q);
  const nextCaption = useQualifiedCaption(q, 'next');
  const showsGrid = useShowsClosingGrid(q);
  const setPresentationSettings = useGeneralStore(
    (state) => state.setPresentationSettings,
  );
  const presentationModeEnabled = useGeneralStore(
    (state) => state.settings.presentationModeEnabled,
  );
  const showProgress = useGeneralStore(
    (state) => state.settings.shouldShowJuryVotingProgress,
  );
  const isSplit = q.splitCandidates.length > 0;

  const pauseButton = (
    <Button
      variant="cta"
      size="lg"
      title={t('presentation.pause')}
      aria-label={t('presentation.pause')}
      Icon={<Pause className="size-5" fill="currentColor" />}
      onClick={() => setPresentationSettings({ isPresenting: false })}
    />
  );

  let peek: React.ReactNode;

  if (q.isOver) {
    peek = (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-extrabold leading-tight tracking-[-0.01em] text-white">
              {t('view.stageOver', { stage: q.stage?.name ?? '' })}
            </p>
            <p className="truncate text-[12.5px] font-semibold text-white/75">
              {caption}
            </p>
          </div>
          <QualifierStatsButton iconOnly />
          <Button
            variant="surface"
            size="lg"
            title={t('header.share')}
            aria-label={t('header.share')}
            Icon={<Share2 className="size-[18px]" />}
            onClick={onShare}
          />
        </div>
        {showsGrid && (
          <QualifiersFlagGrid
            countries={q.qualified}
            className="h-[118px] overflow-hidden rounded-[10px]"
          />
        )}
        <QualifierResultsActions onShare={onShare} compact />
      </div>
    );
  } else {
    peek = (
      <div className="flex flex-col gap-3">
        <QualifierLine
          q={q}
          trailing={
            isPresenting ? pauseButton : <QualifierRandomQuickButton q={q} />
          }
        />
        {!isPresenting && (
          <QualifierHint className="!text-[13px] -mb-1 text-white/80" />
        )}
        <PlaceChips q={q} />
        {isSplit && (
          // The split screen floats above the sheet (positioned against it)
          // instead of growing the peek, so the board's fit, which keeps
          // clear of the peek, never changes from one step to the next.
          <div className="dp-sim-float dp-sim-float-in absolute inset-x-2.5 bottom-full mb-2.5 flex flex-col gap-2.5 rounded-[18px] p-3">
            <div className="flex items-baseline gap-3 px-1">
              <p className="min-w-0 flex-1 text-[15px] font-extrabold leading-tight tracking-[-0.01em] text-white">
                {t('chooseCountryToQualify')}
              </p>
              <span className="shrink-0 text-[12.5px] font-semibold text-white/75">
                {nextCaption}
              </span>
            </div>
            <SplitTiles
              candidates={q.splitCandidates}
              small
              className="h-[132px] overflow-hidden rounded-[10px]"
            />
          </div>
        )}
      </div>
    );
  }

  const body = (close: () => void) => (
    <>
      <QualifiedList q={q} />
      {isPresenting ? (
        <div className="flex flex-col gap-3">
          <span className="text-[12.5px] font-bold text-white/75">
            {t('view.presentation')}
          </span>
          <PresentationOptions />
        </div>
      ) : (
        // A single random pick keeps the sheet open (like the peek's Random);
        // "All left" closes it, so the board shows the result.
        <QualifierRandomGroup q={q} onRunAll={close} />
      )}
      <div className="h-px bg-hair" />
      <BoardColumnsSetting />
      {presentationModeEnabled && !isPresenting && (
        <PresentButton onPresent={close} />
      )}
    </>
  );

  return (
    <BottomSheet
      peek={peek}
      // Once it's over, pulled up: the qualifiers as on the desktop column.
      body={q.isOver ? <QualifiedList q={q} /> : body}
      progress={showProgress && !q.isOver ? q.progress : undefined}
      resetKey={`${q.isOver}|${isPresenting}`}
      onPeekHeight={onPeekHeight}
    />
  );
};

export default QualifiersSheet;
