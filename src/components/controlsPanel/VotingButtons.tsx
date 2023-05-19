import React, { useCallback, useEffect, useRef } from 'react';

import { ScoreboardAction, ScoreboardActionKind } from '../../models';
import Button from '../Button';

type Props = {
  shouldShowLastPoints: boolean;
  dispatch: React.Dispatch<ScoreboardAction>;
};

const VotingButtons = ({ shouldShowLastPoints, dispatch }: Props) => {
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

  useEffect(() => {
    if (shouldShowLastPoints && timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
  }, [shouldShowLastPoints]);

  return (
    <div className="bg-blue-950 w-full py-2 px-4">
      <Button label="Vote randomly" onClick={voteRandomly} />
    </div>
  );
};

export default VotingButtons;
