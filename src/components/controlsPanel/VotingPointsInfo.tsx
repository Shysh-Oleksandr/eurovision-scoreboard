import gsap from 'gsap';
import React, { useRef } from 'react';

import { useGSAP } from '@gsap/react';

import { getSpecialBackgroundStyle } from '@/components/countryItem/utils/gradientUtils';
import { PREDEFINED_SYSTEMS_MAP } from '@/data/data';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

type VotingPointsInfoProps = {
  customVotingPointsIndex?: number; // used for custom theme preview
  overrides?: Record<string, string>; // theme overrides for preview
};

const VotingPointsInfo: React.FC<VotingPointsInfoProps> = ({
  customVotingPointsIndex,
  overrides: propOverrides,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const underlinesRef = useRef<Record<number, HTMLDivElement | null>>({});

  const _pointsSystem = useGeneralStore((state) => state.pointsSystem);
  const _votingPointsIndex = useScoreboardStore(
    (state) => state.votingPointsIndex,
  );
  const globalOverrides = useGeneralStore(
    (s) => s.customTheme?.overrides || null,
  );
  const overrides = propOverrides || globalOverrides;

  const pointsSystem = customVotingPointsIndex
    ? PREDEFINED_SYSTEMS_MAP.default
    : _pointsSystem;
  const votingPointsIndex = customVotingPointsIndex ?? _votingPointsIndex;

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
      className="grid w-full gap-y-1 sm:mt-2 mt-1.5 overflow-hidden rounded-sm"
      style={{
        gridTemplateColumns: `repeat(${Math.min(
          pointsSystem.length,
          10,
        )}, minmax(0, 1fr))`,
      }}
    >
      {pointsSystem.map((pointsItem, index) => {
        const isActive = index === votingPointsIndex;
        const bgClassName = isActive
          ? 'bg-panelInfo-activeBg'
          : 'bg-panelInfo-inactiveBg';
        const specialBgStyle = getSpecialBackgroundStyle(
          bgClassName,
          overrides,
        );

        return (
          <div
            key={pointsItem.id}
            className={`lg:h-8 h-7 flex justify-center transition-colors duration-500 items-center relative ${bgClassName}`}
            style={specialBgStyle}
          >
            <h6
              className={`xl:text-xl text-lg md:text-base lg:text-lg transition-colors duration-500 ${
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
