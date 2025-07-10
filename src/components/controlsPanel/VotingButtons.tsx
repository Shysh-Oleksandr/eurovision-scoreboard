import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { ANIMATION_DURATION } from '../../data/data';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';

import TelevoteInput from './TelevoteInput';

const VotingButtons = () => {
  const hideLastReceivedPoints = useScoreboardStore(
    (state) => state.hideLastReceivedPoints,
  );
  const finishJuryVotingRandomly = useScoreboardStore(
    (state) => state.finishJuryVotingRandomly,
  );
  const finishTelevoteVotingRandomly = useScoreboardStore(
    (state) => state.finishTelevoteVotingRandomly,
  );
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const giveRandomJuryPoints = useScoreboardStore(
    (state) => state.giveRandomJuryPoints,
  );
  const resetLastPoints = useScoreboardStore((state) => state.resetLastPoints);
  const shouldShowLastPoints = useScoreboardStore(
    (state) => state.shouldShowLastPoints,
  );
  const shouldClearPoints = useScoreboardStore(
    (state) => state.shouldClearPoints,
  );
  const { countries, isJuryVoting } = getCurrentStage();
  const timerId = useRef<number | null>(null);

  const isFirstTelevoteCountry = useMemo(
    () => countries.filter((country) => country.isVotingFinished).length === 0,
    [countries],
  );

  const voteRandomlyJury = useCallback(() => {
    if (timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }

    giveRandomJuryPoints();
    hideLastReceivedPoints();

    timerId.current = setTimeout(() => {
      resetLastPoints();
    }, ANIMATION_DURATION);
  }, [giveRandomJuryPoints, hideLastReceivedPoints, resetLastPoints]);

  const finishRandomly = () => {
    if (timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
    if (isJuryVoting) {
      finishJuryVotingRandomly();

      timerId.current = setTimeout(() => {
        resetLastPoints();
      }, ANIMATION_DURATION);

      return;
    }

    finishTelevoteVotingRandomly();
  };

  useEffect(() => {
    if ((shouldShowLastPoints || shouldClearPoints) && timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
  }, [shouldShowLastPoints, shouldClearPoints]);

  return (
    <div className="w-full pt-1 lg:pb-4 pb-3 rounded-md rounded-t-none">
      {isJuryVoting ? (
        <div className="lg:px-4 px-3">
          <Button label="Vote randomly" onClick={voteRandomlyJury} />
        </div>
      ) : (
        <TelevoteInput isFirstTelevoteCountry={isFirstTelevoteCountry} />
      )}

      <div className="w-full bg-slate-600 h-[1px] lg:my-4 my-3"></div>
      <div className="lg:px-4 px-3">
        <Button
          label="Finish randomly"
          onClick={finishRandomly}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default VotingButtons;
