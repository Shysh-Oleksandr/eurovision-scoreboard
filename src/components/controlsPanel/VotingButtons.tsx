import React, { useEffect, useRef } from 'react';

import { ScoreboardAction, ScoreboardActionKind } from '../../models';

type Props = {
  shouldShowLastPoints: boolean;
  dispatch: React.Dispatch<ScoreboardAction>;
};

const VotingButtons = ({ shouldShowLastPoints, dispatch }: Props) => {
  const timerId = useRef<NodeJS.Timeout | null>(null);

  const voteRandomly = () => {
    if (timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }

    dispatch({ type: ScoreboardActionKind.GIVE_RANDOM_POINTS });

    dispatch({
      type: ScoreboardActionKind.SET_SHOW_LAST_POINTS,
      payload: { shouldShowLastPoints: false },
    });

    timerId.current = setTimeout(() => {
      dispatch({ type: ScoreboardActionKind.RESET_LAST_POINTS });
    }, 3000);
  };

  useEffect(() => {
    if (shouldShowLastPoints && timerId.current) {
      clearTimeout(timerId.current);
      timerId.current = null;
    }
  }, [shouldShowLastPoints]);

  return (
    <div className="bg-blue-950 w-full py-2 px-4">
      <button
        className="bg-blue-900 px-5 py-3 text-white font-medium uppercase rounded-md shadow-lg transition-colors duration-300 hover:bg-blue-800"
        onClick={voteRandomly}
      >
        Vote randomly
      </button>
    </div>
  );
};

export default VotingButtons;
