import React from 'react';

import { POINTS_ARRAY } from '../../data';

type Props = { votingPoints: number };

const VotingPointsInfo = ({ votingPoints }: Props) => {
  return (
    <div className="flex justify-between w-full lg:mt-6 md:mt-4 mt-3">
      {POINTS_ARRAY.map((points) => {
        const isActive = points === votingPoints;

        return (
          <div
            key={points}
            className={`lg:w-8 w-7 lg:h-8 h-7 flex justify-center items-center relative ${
              isActive ? 'bg-yellow-300' : 'bg-blue-950'
            }`}
          >
            <h6
              className={`lg:text-xl text-lg ${
                isActive
                  ? 'text-pink-500 font-bold'
                  : 'text-blue-700 font-semibold'
              }`}
            >
              {points}
            </h6>
            {isActive && (
              <div className="block w-full lg:h-[5px] h-1 bg-pink-500 absolute bottom-0 z-20" />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default VotingPointsInfo;
