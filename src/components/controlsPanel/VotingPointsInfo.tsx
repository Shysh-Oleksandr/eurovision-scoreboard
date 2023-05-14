import React from 'react';

import { pointsArray } from '../../data';

type Props = { votingPoints: number };

const VotingPointsInfo = ({ votingPoints }: Props) => {
  return (
    <div className="flex justify-between w-full mt-6">
      {pointsArray.map((points) => {
        const isActive = points === votingPoints;

        return (
          <div
            key={points}
            className={`w-8 h-8 flex justify-center items-center relative ${
              isActive ? 'bg-yellow-300' : 'bg-blue-950'
            }`}
          >
            <h6
              className={`text-xl ${
                isActive
                  ? 'text-pink-500 font-bold'
                  : 'text-blue-700 font-semibold'
              }`}
            >
              {points}
            </h6>
            {isActive && (
              <div className="block w-full h-[5px] bg-pink-500 absolute bottom-0 z-20" />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default VotingPointsInfo;
