'use client';
import { Dices, Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import BottomSheet from './BottomSheet';
import { AtRandomGroup, PresentationOptions, Segmented } from './controls';
import CrossfadeFlag from './CrossfadeFlag';
import ResultsPanel from './ResultsPanel';
import { PhoneBoardColumns, useSimViewStore } from './simViewStore';
import TelevoteEntry from './TelevoteEntry';
import { useQuickRandomAction } from './useRandomActions';
import { useRoundProgress } from './useRoundProgress';
import { useVoterInfo, VoterInfo } from './useVoterInfo';
import { useOrdinalCaption } from './VoterWindow';
import { ThemePointsStrip, VotingHint } from './VotingColumn';

import Button from '@/components/common/Button';
import { useGeneralStore } from '@/state/generalStore';

/** Flag, name and "17th of 37 countries": the peek's first line. */
export const VoterLine = ({
  voter,
  trailing,
}: {
  voter: VoterInfo;
  trailing?: React.ReactNode;
}) => {
  const t = useTranslations('simulation');
  const ordinal = useOrdinalCaption(voter);

  return (
    <div className="flex items-center gap-3">
      {voter.country ? (
        <span className="relative h-[31px] w-[46px] shrink-0 overflow-hidden rounded-[5px] ring-1 ring-white/20">
          <CrossfadeFlag country={voter.country} />
        </span>
      ) : (
        <span className="grid h-[31px] min-w-[46px] shrink-0 place-items-center rounded-[5px] bg-white/10 px-1.5 text-[15px] font-black tabular-nums text-white">
          {voter.points}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-extrabold uppercase leading-tight tracking-[-0.01em] text-white">
          {voter.phase === 'reveal'
            ? t('pointsGoTo', { count: voter.points })
            : voter.country?.name}
        </p>
        <p className="truncate text-[12.5px] font-semibold text-white/75">
          {ordinal}
        </p>
      </div>
      {trailing}
    </div>
  );
};

/**
 * The peek's one-tap Random: the quick scope (`useQuickRandomAction`), with a
 * "whole vote" line under it when that is what it gives.
 */
export const RandomQuickButton = ({ voter }: { voter: VoterInfo }) => {
  const t = useTranslations('simulation');
  const { quick, isWholeVote } = useQuickRandomAction(voter);

  return (
    <Button
      variant="surface"
      size="lg"
      className="shrink-0"
      Icon={<Dices className="size-[18px]" />}
      aria-label={`${t('view.atRandom')}: ${
        quick.detail ? `${quick.label}, ${quick.detail}` : quick.label
      }`}
      onClick={quick.run}
    >
      <span className="flex flex-col items-start gap-[3px] leading-none">
        {t('random')}
        {isWholeVote && (
          <span className="text-[11px] font-semibold text-white/70">
            {t('view.wholeVote')}
          </span>
        )}
      </span>
    </Button>
  );
};

export const BoardColumnsSetting = () => {
  const t = useTranslations('simulation.view');
  const phoneColumns = useSimViewStore((state) => state.phoneColumns);
  const setPhoneColumns = useSimViewStore((state) => state.setPhoneColumns);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-bold text-white/75">
        {t('columns')}
      </span>
      <Segmented<PhoneBoardColumns>
        ariaLabel={t('columns')}
        value={phoneColumns}
        options={[
          { value: 'auto', label: t('columnsAuto') },
          { value: '1', label: '1' },
          { value: '2', label: '2' },
        ]}
        onChange={setPhoneColumns}
      />
    </div>
  );
};

interface VotingSheetProps {
  isOver: boolean;
  /** A presentation runs: Pause instead of the voting controls. */
  isPresenting: boolean;
  onShare: () => void;
  /** After the final reveal: back from the reveal to the board. */
  onBackToScoreboard?: () => void;
  /** Reports the collapsed height so the board can keep its last rows clear. */
  onPeekHeight: (height: number) => void;
}

/**
 * Phones: the spokesperson column folded into a bottom sheet. The peek keeps
 * who votes, the count, a Random shortcut and the theme's points strip (or
 * the televote field) next to the board; pulling it up adds the random
 * scopes, the board columns and Present. The presentation options appear
 * only while a presentation runs.
 */
const VotingSheet = ({
  isOver,
  isPresenting,
  onShare,
  onBackToScoreboard,
  onPeekHeight,
}: VotingSheetProps) => {
  const t = useTranslations('simulation.view');
  const tPresentation = useTranslations('simulation.presentation');
  const voter = useVoterInfo();
  const progress = useRoundProgress(voter);
  const setPresentationSettings = useGeneralStore(
    (state) => state.setPresentationSettings,
  );
  const presentationModeEnabled = useGeneralStore(
    (state) => state.settings.presentationModeEnabled,
  );

  let peek: React.ReactNode;

  if (isOver) {
    peek = (
      <ResultsPanel
        variant="sheet"
        onShare={onShare}
        onBackToScoreboard={onBackToScoreboard}
      />
    );
  } else if (isPresenting) {
    peek = (
      <div className="flex flex-col gap-3">
        <VoterLine
          voter={voter}
          trailing={
            <Button
              variant="cta"
              size="lg"
              title={tPresentation('pause')}
              aria-label={tPresentation('pause')}
              Icon={<Pause className="size-5" fill="currentColor" />}
              onClick={() => setPresentationSettings({ isPresenting: false })}
            />
          }
        />
        {voter.phase === 'jury' && <ThemePointsStrip />}
      </div>
    );
  } else {
    // The same first line in every round: who, how far, Random.
    peek = (
      <div className="flex flex-col gap-3">
        <VoterLine
          voter={voter}
          trailing={<RandomQuickButton voter={voter} />}
        />
        {voter.phase === 'jury' ? (
          <>
            <VotingHint
              voter={voter}
              className="!text-[13px] -mb-1 text-white/80"
            />
            <ThemePointsStrip />
          </>
        ) : (
          <TelevoteEntry />
        )}
      </div>
    );
  }

  const body = (close: () => void) => (
    <>
      {isPresenting ? (
        <div className="flex flex-col gap-3">
          <span className="text-[12.5px] font-bold text-white/75">
            {t('presentation')}
          </span>
          <PresentationOptions />
        </div>
      ) : (
        // Any scope closes the sheet, so the board shows what it did (and
        // the peek's Random now repeats a jury scope).
        <AtRandomGroup voter={voter} onRun={close} />
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
      body={isOver ? undefined : body}
      progress={isOver ? undefined : progress}
      resetKey={`${isOver}|${voter.phase}|${isPresenting}`}
      onPeekHeight={onPeekHeight}
    />
  );
};

/** The open sheet's Present: closes the sheet as the presentation starts. */
export const PresentButton = ({ onPresent }: { onPresent: () => void }) => {
  const t = useTranslations('simulation.view');
  const setPresentationSettings = useGeneralStore(
    (state) => state.setPresentationSettings,
  );

  return (
    <Button
      variant="cta"
      size="xl"
      className="w-full justify-center"
      Icon={<Play className="size-[18px]" fill="currentColor" />}
      onClick={() => {
        onPresent();
        setPresentationSettings({ isPresenting: true });
      }}
    >
      {t('present')}
    </Button>
  );
};

export default VotingSheet;
