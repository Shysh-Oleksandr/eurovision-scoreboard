import gsap from 'gsap';
import React, { useRef } from 'react';

import { useGSAP } from '@gsap/react';

import { POINTS_ARRAY } from '../../data/data';

type Props = { votingPoints: number };

const VotingPointsInfo = ({ votingPoints }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const underlinesRef = useRef<Record<number, HTMLDivElement | null>>({});

  useGSAP(
    () => {
      const activeUnderline = underlinesRef.current[votingPoints];

      if (activeUnderline) {
        gsap.fromTo(
          activeUnderline,
          {
            x: -30,
          },
          {
            x: 0,
            duration: 0.3,
            ease: 'none', // linear
          },
        );
      }
    },
    { dependencies: [votingPoints], scope: containerRef },
  );

  return (
    <div
      ref={containerRef}
      className="flex justify-between w-full md:mt-4 mt-3 overflow-hidden rounded-sm"
    >
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
            <div
              ref={(el) => {
                underlinesRef.current[points] = el;
              }}
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
