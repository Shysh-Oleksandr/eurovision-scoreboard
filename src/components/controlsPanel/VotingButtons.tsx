import { useTranslations } from 'next-intl';
import React, { useCallback } from 'react';

import { useShallow } from 'zustand/shallow';

import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';

import TelevoteInput from './TelevoteInput';

import { useGeneralStore } from '@/state/generalStore';

const VotingButtons = () => {
  const t = useTranslations('simulation');

  const useGroupedJuryPoints = useGeneralStore(
    (state) => state.settings.useGroupedJuryPoints,
  );

  const {
    finishJuryVotingRandomly,
    finishTelevoteVotingRandomly,
    giveRandomJuryPoints,
    getCurrentStage,
    givePredefinedJuryPointsGrouped,
  } = useScoreboardStore(
    useShallow((state) => ({
      finishJuryVotingRandomly: state.finishJuryVotingRandomly,
      finishTelevoteVotingRandomly: state.finishTelevoteVotingRandomly,
      giveRandomJuryPoints: state.giveRandomJuryPoints,
      getCurrentStage: state.getCurrentStage,
      givePredefinedJuryPointsGrouped: state.givePredefinedJuryPointsGrouped,
    })),
  );

  const isJuryVoting = !!getCurrentStage()?.isJuryVoting;

  const voteRandomlyJury = useCallback(() => {
    if (useGroupedJuryPoints) {
      givePredefinedJuryPointsGrouped();
    } else {
      giveRandomJuryPoints();
    }
  }, [
    givePredefinedJuryPointsGrouped,
    giveRandomJuryPoints,
    useGroupedJuryPoints,
  ]);

  const finishRandomly = () => {
    if (isJuryVoting) {
      finishJuryVotingRandomly();

      return;
    }

    finishTelevoteVotingRandomly();
  };

  return (
    <div className="w-full pt-1 lg:pb-4 pb-3 rounded-md rounded-t-none">
      {isJuryVoting ? (
        <div className="lg:px-4 px-3">
          <Button label={t('voteRandomly')} onClick={voteRandomlyJury} />
          {/* TODO: maybe move it to CountryInfo on mobile */}
        </div>
      ) : (
        <TelevoteInput />
      )}

      <div className="w-full bg-white/15 h-[1px] lg:my-4 my-3"></div>
      <div className="lg:px-4 px-3">
        <Button
          label={t('finishRandomly')}
          onClick={finishRandomly}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default VotingButtons;
