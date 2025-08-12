import React, { useCallback } from 'react';

import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';

import TelevoteInput from './TelevoteInput';

const VotingButtons = () => {
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
  const { isJuryVoting } = getCurrentStage();

  const voteRandomlyJury = useCallback(() => {
    giveRandomJuryPoints();
  }, [giveRandomJuryPoints]);

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
          <Button label="Vote randomly" onClick={voteRandomlyJury} />
        </div>
      ) : (
        <TelevoteInput />
      )}

      <div className="w-full bg-white/15 h-[1px] lg:my-4 my-3"></div>
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
