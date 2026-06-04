'use client';
import { useTranslations } from 'next-intl';
import React, { useMemo, type JSX } from 'react';

import { useShallow } from 'zustand/shallow';

import { useCountriesStore } from '../../state/countriesStore';
import { useGeneralStore } from '../../state/generalStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';

import { getWinnerCountry } from '@/state/scoreboard/helpers';

type Props = {
  revealActive?: boolean;
  revealAnimationComplete?: boolean;
  onBackToScoreboard?: () => void;
};

const BoardHeader = ({
  revealActive,
  revealAnimationComplete,
  onBackToScoreboard,
}: Props): JSX.Element | null => {
  const t = useTranslations('simulation');

  const {
    getCurrentStage,
    winnerCountry,
    viewedStageId,
    eventStages,
    currentRevealTelevotePoints,
    votingPoints,
    givePredefinedJuryPoint,
    givePredefinedTelevotePoints,
  } = useScoreboardStore(
    useShallow((state) => ({
      getCurrentStage: state.getCurrentStage,
      winnerCountry: state.winnerCountry,
      viewedStageId: state.viewedStageId,
      eventStages: state.eventStages,
      currentRevealTelevotePoints: state.currentRevealTelevotePoints,
      votingPoints: state.getVotingPoints(),
      givePredefinedJuryPoint: state.givePredefinedJuryPoint,
      givePredefinedTelevotePoints: state.givePredefinedTelevotePoints,
    })),
  );
  const contestYear = useGeneralStore((state) => state.settings.contestYear);
  const contestName = useGeneralStore((state) => state.settings.contestName);
  const revealTelevoteLowestToHighest = useGeneralStore(
    (state) => state.settings.revealTelevoteLowestToHighest,
  );
  const hideVotingHints = useGeneralStore(
    (state) => state.settings.hideVotingHints,
  );
  const enableFinalReveal = useGeneralStore(
    (state) => state.settings.enableFinalReveal,
  );

  const viewedStage = eventStages.find((s) => s.id === viewedStageId);
  const winnerCountryFromStage = getWinnerCountry(
    viewedStage?.countries ?? [],
    viewedStage?.runningOrder,
  );

  const getVotingCountry = useCountriesStore((state) => state.getVotingCountry);

  const currentStage = getCurrentStage();
  const {
    isJuryVoting,
    isOver: isVotingOver,
    id: currentStageId,
  } = currentStage || {};

  const votingCountry = getVotingCountry();

  const isAnotherStageDisplayed = currentStageId !== viewedStageId;

  // Suppress "X points go to..." immediately when the final reveal is about to
  // trigger: last stage, one country still unfinished, and it isn't already winning.
  const suppressRevealLabel = useMemo(() => {
    const unfinished =
      currentStage?.countries.filter((c) => !c.isVotingFinished) ?? [];

    if (unfinished.length !== 1) return false;
    const [lastCountry] = unfinished;

    if (!lastCountry) return false;
    const maxOtherPoints = currentStage?.countries
      .filter((c) => c.code !== lastCountry.code)
      .reduce((max, c) => Math.max(max, c.points), 0);

    return (
      enableFinalReveal &&
      revealTelevoteLowestToHighest &&
      !isJuryVoting &&
      !!currentStage?.isLastStage &&
      lastCountry.points < (maxOtherPoints ?? 0)
    );
  }, [
    enableFinalReveal,
    revealTelevoteLowestToHighest,
    isJuryVoting,
    currentStage,
  ]);

  const votingText = useMemo(() => {
    if (isVotingOver) return null;

    if (revealTelevoteLowestToHighest && !isJuryVoting) {
      if (suppressRevealLabel) return null;

      return (
        <>
          <span className="font-medium">
            {t('pointsGoTo', { count: currentRevealTelevotePoints })}
          </span>
        </>
      );
    }

    const shouldShowVotingHints = !hideVotingHints;

    if (isJuryVoting && shouldShowVotingHints) {
      return <>{t('chooseCountryToGivePoints', { count: votingPoints })}</>;
    }

    if (shouldShowVotingHints) {
      return t.rich('enterTelevotePointsFor', {
        country: votingCountry?.name ?? '',
        span: (chunks) => <span className="font-medium">{chunks}</span>,
      });
    }

    return null;
  }, [
    isVotingOver,
    revealTelevoteLowestToHighest,
    isJuryVoting,
    currentRevealTelevotePoints,
    t,
    votingPoints,
    votingCountry?.name,
    hideVotingHints,
    suppressRevealLabel,
  ]);

  const winnerText = useMemo(() => {
    if (!winnerCountry) return null;

    if (isAnotherStageDisplayed && winnerCountryFromStage) {
      return t.rich('winnerOf', {
        country: winnerCountryFromStage?.name ?? '',
        event: viewedStage?.name ?? '',
        span: (chunks) => <span className="font-semibold">{chunks}</span>,
        span2: (chunks) => <span className="font-medium">{chunks}</span>,
      });
    }

    return t.rich('winnerOf', {
      country: winnerCountry.name,
      event: `${contestName || 'Eurovision'} ${contestYear || ''}`,
      span: (chunks) => <span className="font-semibold">{chunks}</span>,
      span2: (chunks) => <span className="font-medium">{chunks}</span>,
    });
  }, [
    winnerCountry,
    isAnotherStageDisplayed,
    winnerCountryFromStage,
    t,
    contestName,
    contestYear,
    viewedStage?.name,
  ]);

  const eventLabel = `${contestName || 'Eurovision'} ${
    contestYear || ''
  }`.trim();

  const teaserText = useMemo(
    () =>
      t.rich('winnerRevealTeaser', {
        event: eventLabel,
        span: (chunks) => <span className="font-semibold">{chunks}</span>,
      }),
    [t, eventLabel],
  );

  const chooseRandomly = () => {
    if (isJuryVoting) {
      givePredefinedJuryPoint();
    } else {
      givePredefinedTelevotePoints();
    }
  };

  const displayText =
    revealActive && isVotingOver && !revealAnimationComplete
      ? teaserText
      : winnerText || votingText;

  const hasContent =
    winnerCountry || !isVotingOver || revealActive || revealAnimationComplete;

  return (
    <div
      className={`flex flex-row w-full justify-between items-center ${
        hasContent ? 'md:h-12 pb-2' : ''
      }`}
    >
      <h3
        className="lg:text-2xl xs:text-xl text-lg text-white"
        style={{ textShadow: '0 0 10px rgba(0, 0, 0, 0.2)' }}
      >
        {displayText}
      </h3>
      {revealAnimationComplete ? (
        <Button label={t('backToScoreboard')} onClick={onBackToScoreboard} />
      ) : !isVotingOver ? (
        <Button
          variant="tertiary"
          label={t('random')}
          onClick={chooseRandomly}
          snowEffect="middle"
        />
      ) : null}
    </div>
  );
};

export default BoardHeader;
