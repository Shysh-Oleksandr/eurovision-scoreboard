import React from 'react';

import { ScoreboardAction, ScoreboardActionKind } from '../../models';

type Props = {
  dispatch: React.Dispatch<ScoreboardAction>;
};

const VotingButtons = ({ dispatch }: Props) => {
  return (
    <div className="bg-blue-950 w-full py-2 px-4">
      <button
        className="bg-blue-900 px-5 py-3 text-white uppercase rounded-md shadow-lg transition-colors duration-300 hover:bg-blue-800"
        onClick={() =>
          dispatch({ type: ScoreboardActionKind.GIVE_RANDOM_POINTS })
        }
      >
        Vote randomly
      </button>
    </div>
  );
};

export default VotingButtons;
