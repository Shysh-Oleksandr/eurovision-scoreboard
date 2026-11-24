'use client';
import {
  ArrowRight,
  CalendarPlus,
  ChartBar,
  ChevronDown,
  Eye,
  EyeOff,
  LayoutList,
  Share2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useId, useState } from 'react';

import dynamic from 'next/dynamic';

import { usePhaseResults } from './usePhaseResults';
import { WindowFrame } from './VoterWindow';
import { WINDOW_CLASS } from './VotingColumn';

import Button from '@/components/common/Button';
import { useCanStartNextYear } from '@/components/nextYear/useCanStartNextYear';
import { getFlagPath, handleFlagError } from '@/helpers/getFlagPath';
import { useShortcut } from '@/shortcuts/registry';
import { useGeneralStore } from '@/state/generalStore';
import { openNextYear } from '@/state/nextYearStore';

const FinalStatsModal = dynamic(() => import('../finalStats/FinalStatsModal'), {
  ssr: false,
});

interface ResultsPanelProps {
  variant: 'column' | 'sheet' | 'stripe';
  onShare: () => void;
  /**
   * After the final reveal (still on screen): back to the board. The main
   * action then, since a final has nothing to continue to.
   */
  onBackToScoreboard?: () => void;
  /** Stripe only: leaves the minimal view. */
  trailing?: React.ReactNode;
}

const useEventLabel = () => {
  const contestYear = useGeneralStore((state) => state.settings.contestYear);
  const contestName = useGeneralStore((state) => state.settings.contestName);

  return `${contestName || 'Eurovision'} ${contestYear || ''}`.trim();
};

/** A select drawn as a `surface` button, as tall as its neighbours (`size`). */
const StageSelect = ({
  value,
  stages,
  onChange,
  size,
}: {
  value: string;
  stages: { id: string; name: string }[];
  onChange: (id: string) => void;
  size: 'md' | 'lg';
}) => {
  const t = useTranslations('simulation.phaseActions');
  const id = useId();
  const current = stages.find((stage) => stage.id === value);

  return (
    <div
      className={`dp-act relative flex items-center justify-between gap-2 rounded-xl font-extrabold text-white ${
        size === 'md'
          ? 'h-10 px-3 text-[13px]'
          : 'h-[46px] px-3.5 text-[13.5px]'
      }`}
    >
      <label htmlFor={id} className="sr-only">
        {t('selectEventStage')}
      </label>
      <span className="truncate">{current?.name}</span>
      <ChevronDown className="size-[18px] shrink-0 opacity-75" />
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {stages.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.name}
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * Once a stage is over: the winner's window (final) or "Semi-Final 1 is
 * over", Stats, Share, the stage select and non-qualifiers after the final,
 * and Continue, the only filled button.
 */
const ResultsPanel = ({
  variant,
  onShare,
  onBackToScoreboard,
  trailing,
}: ResultsPanelProps) => {
  const t = useTranslations('simulation');
  const tNextYear = useTranslations('nextYear');
  const eventLabel = useEventLabel();
  const results = usePhaseResults();
  const canStartNextYear = useCanStartNextYear();
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);

  const {
    winner,
    viewedStage,
    eventStages,
    showStageSelect,
    showNonQualifiersToggle,
    showAllParticipants,
    toggleShowAllParticipants,
    selectStage,
    canContinue,
    nextPhase,
    handleContinue,
  } = results;

  // While the final reveal is still on screen, picking a stage or the
  // non-qualifiers also leaves it, so the board shows the change.
  const showStage = (stageId: string) => {
    selectStage(stageId);
    onBackToScoreboard?.();
  };
  const toggleNonQualifiers = () => {
    toggleShowAllParticipants();
    onBackToScoreboard?.();
  };

  // Enter runs the filled button: View scoreboard after the final reveal,
  // else Continue.
  const mainAction =
    onBackToScoreboard ?? (canContinue ? handleContinue : undefined);

  useShortcut('continue', () => mainAction?.(), !!mainAction);
  useShortcut('stats', () => setStatsOpen(true));

  const title =
    winner?.name ?? t('view.stageOver', { stage: viewedStage?.name ?? '' });
  const caption = winner
    ? t('view.winsEvent', {
        event:
          viewedStage && !viewedStage.isLastStage
            ? viewedStage.name
            : eventLabel,
      })
    : undefined;

  const statsModal = (statsOpen || statsLoaded) && (
    <FinalStatsModal
      isOpen={statsOpen}
      onClose={() => setStatsOpen(false)}
      onLoaded={() => setStatsLoaded(true)}
    />
  );

  const continueButton = canContinue && (
    <Button
      variant="cta"
      size={variant === 'stripe' ? 'md' : 'xl'}
      className="w-full justify-center gap-2"
      onClick={handleContinue}
      shortcut={onBackToScoreboard ? undefined : 'continue'}
    >
      <span className="flex items-center gap-2">
        {t('phaseActions.continueTo', { nextPhase: nextPhase ?? '' })}
        <ArrowRight className="size-[18px]" />
      </span>
    </Button>
  );

  const viewScoreboardButton = onBackToScoreboard && (
    <Button
      variant="cta"
      size={variant === 'stripe' ? 'md' : 'xl'}
      className="w-full justify-center"
      Icon={<LayoutList className="size-[18px]" />}
      onClick={onBackToScoreboard}
      shortcut="continue"
    >
      {t('backToScoreboard')}
    </Button>
  );

  const nqToggle = showNonQualifiersToggle && (
    <Button
      variant="surface"
      size={variant === 'stripe' ? 'md' : 'lg'}
      className="justify-start"
      aria-pressed={showAllParticipants}
      Icon={
        showAllParticipants ? (
          <EyeOff className="size-[18px]" />
        ) : (
          <Eye className="size-[18px]" />
        )
      }
      onClick={toggleNonQualifiers}
    >
      {/* May take two lines in a half-width cell; the button keeps its
          height (the stage select's). */}
      <span className="min-w-0 text-left leading-[1.15]">
        {showAllParticipants
          ? t('phaseActions.finalistsOnly')
          : t('view.showNonQualifiers')}
      </span>
    </Button>
  );

  // Next year placement 2 of 4 (docs/event-setup-hub-and-design-tokens.md
  // §8): where Continue sits during the show. The stripe has room for an
  // icon only, like Stats and Share there.
  const nextYearButton =
    canStartNextYear &&
    (variant === 'stripe' ? (
      <Button
        variant="surface"
        size="md"
        title={tNextYear('button')}
        aria-label={tNextYear('button')}
        Icon={<CalendarPlus className="size-[18px]" />}
        onClick={() => openNextYear('results')}
      />
    ) : (
      <Button
        variant="surface"
        size="lg"
        className="w-full justify-center"
        Icon={<CalendarPlus className="size-[18px]" />}
        onClick={() => openNextYear('results')}
      >
        {tNextYear('button')}
      </Button>
    ));

  const stageSelect = showStageSelect && viewedStage && (
    <StageSelect
      value={viewedStage.id}
      stages={eventStages}
      onChange={showStage}
      size={variant === 'stripe' ? 'md' : 'lg'}
    />
  );

  if (variant === 'column') {
    return (
      <aside className="dp-sim-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px]">
        {winner ? (
          <WindowFrame
            windowClassName={WINDOW_CLASS}
            country={winner}
            title={title}
            caption={caption}
          />
        ) : (
          <div className="dp-sim-caption !border-t-0 px-4 py-4">
            <p className="text-[19px] font-extrabold leading-tight text-white">
              {title}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-3 p-4">
          {viewScoreboardButton}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="surface"
              size="lg"
              className="justify-center"
              Icon={<ChartBar className="size-[18px]" />}
              onClick={() => setStatsOpen(true)}
              shortcut="stats"
            >
              {t('phaseActions.viewStats')}
            </Button>
            <Button
              variant="surface"
              size="lg"
              className="justify-center"
              Icon={<Share2 className="size-[18px]" />}
              onClick={onShare}
              shortcut="share"
            >
              {t('header.share')}
            </Button>
          </div>
          {stageSelect}
          {nqToggle}
          {(continueButton || nextYearButton) && (
            <div className="mt-auto pt-1">
              {continueButton || nextYearButton}
            </div>
          )}
        </div>
        {statsModal}
      </aside>
    );
  }

  const statsButton = (
    <Button
      variant="surface"
      size={variant === 'stripe' ? 'md' : 'lg'}
      title={t('phaseActions.viewStats')}
      aria-label={t('phaseActions.viewStats')}
      Icon={<ChartBar className="size-[18px]" />}
      onClick={() => setStatsOpen(true)}
      shortcut="stats"
    />
  );
  const shareButton = (
    <Button
      variant="surface"
      size={variant === 'stripe' ? 'md' : 'lg'}
      title={t('header.share')}
      aria-label={t('header.share')}
      Icon={<Share2 className="size-[18px]" />}
      onClick={onShare}
      shortcut="share"
    />
  );
  const summary = (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {winner && (
        <img
          src={getFlagPath(winner, 'big-rectangle')}
          onError={(e) => handleFlagError(e.currentTarget, winner)}
          alt=""
          className="h-[31px] w-[46px] shrink-0 rounded-[5px] object-cover ring-1 ring-white/20"
        />
      )}
      <div className="min-w-0">
        <p className="truncate text-[16px] font-extrabold uppercase leading-tight text-white">
          {winner ? title : <span className="normal-case">{title}</span>}
        </p>
        {caption && (
          <p className="truncate text-[12.5px] font-semibold text-white/75">
            {caption}
          </p>
        )}
      </div>
    </div>
  );

  if (variant === 'stripe') {
    return (
      <>
        {summary}
        {stageSelect && <div className="w-[180px]">{stageSelect}</div>}
        {nqToggle}
        {statsButton}
        {shareButton}
        {continueButton && <div className="shrink-0">{continueButton}</div>}
        {nextYearButton}
        {viewScoreboardButton && (
          <div className="shrink-0">{viewScoreboardButton}</div>
        )}
        {trailing}
        {statsModal}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {summary}
        {statsButton}
        {shareButton}
      </div>
      {(stageSelect || nqToggle) && (
        <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0">
          {stageSelect}
          {nqToggle}
        </div>
      )}
      {continueButton}
      {viewScoreboardButton}
      {nextYearButton}
      {statsModal}
    </div>
  );
};

export default ResultsPanel;
