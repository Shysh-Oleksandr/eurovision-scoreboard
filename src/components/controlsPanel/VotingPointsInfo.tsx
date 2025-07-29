import gsap from 'gsap';
import React, { useRef } from 'react';

import { useGSAP } from '@gsap/react';

import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

const VotingPointsInfo = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const underlinesRef = useRef<Record<number, HTMLDivElement | null>>({});

  const pointsSystem = useGeneralStore((state) => state.pointsSystem);
  const votingPointsIndex = useScoreboardStore(
    (state) => state.votingPointsIndex,
  );

  useGSAP(
    () => {
      const activeUnderline = underlinesRef.current[votingPointsIndex];

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
    { dependencies: [votingPointsIndex], scope: containerRef },
  );

  return (
    <div
      ref={containerRef}
      className="grid w-full gap-y-1 sm:mt-3 mt-2 overflow-hidden rounded-sm"
      style={{
        gridTemplateColumns: `repeat(${Math.min(
          pointsSystem.length,
          10,
        )}, minmax(0, 1fr))`,
      }}
    >
      {pointsSystem.map((pointsItem, index) => {
        const isActive = index === votingPointsIndex;

        return (
          <div
            key={pointsItem.id}
            className={`lg:min-w-8 min-w-7 lg:h-8 h-7 flex justify-center transition-colors duration-500 items-center relative ${
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
              {pointsItem.value}
            </h6>
            <div
              ref={(el) => {
                underlinesRef.current[index] = el;
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
