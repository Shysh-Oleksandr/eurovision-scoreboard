'use client';
import { useEffect, useRef, type JSX } from 'react';

import dynamic from 'next/dynamic';

import RevealColumn from './RevealColumn';
import RevealControls from './RevealControls';
import { useRevealColumns } from './useRevealColumns';

import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { useQualifiedCountriesPanelGlowStyle } from '@/theme/useQualifiedCountriesPanelGlowStyle';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

const PresentationPanel = dynamic(
  () => import('../../presentationPanel/PresentationPanel'),
  { ssr: false },
);

/*
 * The JESC 2024 "scale countdown" jury board: a fixed-order row of vertical
 * bars, no sorting and no re-ordering, which is why none of the board's
 * FLIP/GSAP machinery is involved here.
 */
const JuryScaleRevealSimulation = (): JSX.Element => {
  const {
    columns,
    isScalePhase,
    isAwaitingFinish,
    nextStepPoints,
    focusCountryCode,
  } = useRevealColumns();

  const presentationModeEnabled = useGeneralStore(
    (state) => state.settings.presentationModeEnabled,
  );
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const startCounter = useScoreboardStore((state) => state.startCounter);
  const { roundedCountryContainer } = useThemeSpecifics();
  const roundedPanelGlowStyle = useQualifiedCountriesPanelGlowStyle(
    roundedCountryContainer,
  );

  const isOver = !!getCurrentStage()?.isOver;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // With ~26 participants most columns sit off-screen on a phone, so the board
  // follows the reveal instead of leaving the user to find it.
  useEffect(() => {
    if (!focusCountryCode) return;

    const scroller = scrollerRef.current;
    const column = columnRefs.current[focusCountryCode];

    if (!scroller || !column) return;
    if (scroller.scrollWidth <= scroller.clientWidth) return;

    column.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [focusCountryCode]);

  return (
    <div className="flex flex-col md:gap-4 gap-3 pt-2" key={startCounter}>
      <div
        className={`relative bg-gradient-to-tr from-[30%] from-primary-950 to-primary-900 ${
          roundedCountryContainer
            ? 'qualified-countries-panel--rounded'
            : 'rounded-[10px]'
        } lg:p-4 p-3`}
        style={roundedPanelGlowStyle}
      >
        <div
          ref={scrollerRef}
          className="flex items-end gap-1 xs:gap-1.5 overflow-x-auto overflow-y-hidden pb-1 [--reveal-col-min:2.125rem] [--reveal-col-max:4.5rem] xs:[--reveal-col-min:2.5rem]"
        >
          {columns.map((column) => (
            <RevealColumn
              key={column.country.code}
              column={column}
              columnRef={(element) => {
                columnRefs.current[column.country.code] = element;
              }}
            />
          ))}
        </div>
      </div>

      {!isOver && (
        <div className="flex md:flex-row flex-col md:items-stretch gap-2 md:gap-3">
          <RevealControls
            isScalePhase={isScalePhase}
            isAwaitingFinish={isAwaitingFinish}
            nextStepPoints={nextStepPoints}
          />
          {presentationModeEnabled && (
            <div className="md:w-[280px] lg:w-[320px] w-full">
              <PresentationPanel />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JuryScaleRevealSimulation;
