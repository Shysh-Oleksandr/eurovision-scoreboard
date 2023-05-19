import React, { useCallback, useEffect, useRef } from 'react';

import { ScoreboardAction, ScoreboardActionKind } from '../../models';
import Button from '../Button';

import TelevoteInput from './TelevoteInput';

type Props = {
  shouldShowLastPoints: boolean;
  isJuryVoting: boolean;
  countriesLeft: number;
  votingCountryIndex: number;
  dispatch: React.Dispatch<ScoreboardAction>;
};

const VotingButtons = ({
  shouldShowLastPoints,
  isJuryVoting,
  countriesLeft,
  votingCountryIndex,
  dispatch,
}: Props) => {
  const timerId = useRef<NodeJS.Timeout | null>(null);

  const voteRandomly = useCallback(() => {
    if (timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }

    dispatch({ type: ScoreboardActionKind.GIVE_RANDOM_POINTS });

    dispatch({
      type: ScoreboardActionKind.HIDE_LAST_RECEIVED_POINTS,
    });

    timerId.current = setTimeout(() => {
      dispatch({ type: ScoreboardActionKind.RESET_LAST_POINTS });
    }, 3000);
  }, [dispatch]);

  const finishVoting = useCallback(() => {
    new Array(countriesLeft).fill(0).map(() => {
      dispatch({ type: ScoreboardActionKind.GIVE_RANDOM_POINTS });

      timerId.current = setTimeout(() => {
        dispatch({ type: ScoreboardActionKind.RESET_LAST_POINTS });
      }, 3000);
    });
  }, [countriesLeft, dispatch]);

  useEffect(() => {
    if (shouldShowLastPoints && timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
  }, [shouldShowLastPoints]);

  return (
    <div className="bg-blue-950 w-full pt-2 pb-4">
      {isJuryVoting ? (
        <div className="px-4">
          <Button label="Vote randomly" onClick={voteRandomly} />
        </div>
      ) : (
        <TelevoteInput
          votingCountryIndex={votingCountryIndex}
          dispatch={dispatch}
        />
      )}

      <div className="w-full bg-slate-600 h-[1px] my-4"></div>
      <div className="px-4">
        <Button
          label="Finish randomly"
          onClick={finishVoting}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default VotingButtons;
