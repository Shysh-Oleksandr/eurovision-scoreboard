import React, { useEffect } from 'react';

import { easings, useSpring, animated } from '@react-spring/web';

import { POINTS_ARRAY } from '../../data/data';

type Props = { votingPoints: number };

const VotingPointsInfo = ({ votingPoints }: Props) => {
  const [springsActive, apiActive] = useSpring(() => ({
    from: {
      x: -30,
    },
  }));

  useEffect(() => {
    apiActive.start({
      from: {
        x: -30,
      },
      to: {
        x: 0,
      },
      config: { duration: 300, easing: easings.linear },
    });
  }, [apiActive, votingPoints]);

  return (
    <div className="flex justify-between w-full lg:mt-6 md:mt-4 mt-3 overflow-hidden rounded-sm">
      {POINTS_ARRAY.map((points) => {
        const isActive = points === votingPoints;

        return (
          <div
            key={points}
            className={`lg:w-8 w-7 lg:h-8 h-7 flex justify-center transition-colors duration-500 items-center relative ${
              isActive ? 'bg-panelInfo-activeBg' : 'bg-panelInfo-inactiveBg'
            }`}
          >
            <h6
              className={`lg:text-xl text-lg transition-colors duration-500 ${
                isActive
                  ? 'text-panelInfo-activeText font-bold'
                  : 'text-panelInfo-inactiveText font-semibold'
              }`}
            >
              {points}
            </h6>
            <animated.div
              style={springsActive}
              className={`block w-full lg:h-[5px] h-1 ${
                isActive ? 'bg-panelInfo-activeText' : 'bg-transparent'
              } absolute bottom-0 z-20`}
            />
          </div>
        );
      })}
    </div>
  );
};

export default VotingPointsInfo;
