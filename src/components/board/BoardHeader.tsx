import { useTranslations } from 'next-intl';
import React, { useMemo, type JSX } from 'react';

import { useShallow } from 'zustand/shallow';

import { useCountriesStore } from '../../state/countriesStore';
import { useGeneralStore } from '../../state/generalStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';

import { getWinnerCountry } from '@/state/scoreboard/helpers';

const BoardHeader = (): JSX.Element | null => {
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

  const viewedStage = eventStages.find((s) => s.id === viewedStageId);
  const winnerCountryFromStage = getWinnerCountry(viewedStage?.countries ?? []);

  const getVotingCountry = useCountriesStore((state) => state.getVotingCountry);

  const {
    isJuryVoting,
    isOver: isVotingOver,
    id: currentStageId,
  } = getCurrentStage() || {};

  const votingCountry = getVotingCountry();

  const isAnotherStageDisplayed = currentStageId !== viewedStageId;

  const votingText = useMemo(() => {
    if (isVotingOver) return null;

    if (revealTelevoteLowestToHighest && !isJuryVoting) {
      const pointsToShow = currentRevealTelevotePoints;

      return (
        <>
          <span className="font-medium">
            {t('pointsGoTo', { count: pointsToShow })}
          </span>
        </>
      );
    }

    if (isJuryVoting) {
      return <>{t('chooseCountryToGivePoints', { count: votingPoints })}</>;
    }

    return t.rich('enterTelevotePointsFor', {
      country: votingCountry?.name ?? '',
      span: (chunks) => <span className="font-medium">{chunks}</span>,
    });
  }, [
    isVotingOver,
    revealTelevoteLowestToHighest,
    isJuryVoting,
    currentRevealTelevotePoints,
    t,
    votingPoints,
    votingCountry?.name,
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

  const chooseRandomly = () => {
    if (isJuryVoting) {
      givePredefinedJuryPoint();
    } else {
      givePredefinedTelevotePoints();
    }
  };

  const hasContent = winnerCountry || !isVotingOver;

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
        {winnerText || votingText}
      </h3>
      {!isVotingOver && (
        <Button
          variant="tertiary"
          label={t('random')}
          onClick={chooseRandomly}
        />
      )}
    </div>
  );
};

export default BoardHeader;
