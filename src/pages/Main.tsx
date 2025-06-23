import React, { useEffect, useMemo } from 'react';

import Board from '../components/board';
import Button from '../components/Button';
import ControlsPanel from '../components/controlsPanel';
import QualificationResultsModal from '../components/QualificationResultsModal';
import EventSetupModal from '../components/setup/EventSetupModal';
import WinnerModal from '../components/WinnerModal';
import { useNextEventName } from '../hooks/useNextEventName';
import { EventPhase } from '../models';
import { useCountriesStore } from '../state/countriesStore';
import { useScoreboardStore } from '../state/scoreboardStore';

export const Main = () => {
  const { year, theme, themeInfo } = useCountriesStore();
  const { eventPhase, continueToNextPhase, qualifiedCountries } =
    useScoreboardStore();

  const { eventSetupModalOpen, setEventSetupModalOpen } = useCountriesStore();

  const { nextPhase, hasOneSemiFinal } = useNextEventName();

  const isVotingOver = qualifiedCountries.length > 0;

  // Apply initial theme class on mount
  useEffect(() => {
    document.documentElement.classList.add(`theme-${year}`);
  }, [year]);

  const phaseTitle = useMemo(() => {
    switch (eventPhase) {
      case EventPhase.SEMI_FINAL_1:
        return `Semi-Final ${hasOneSemiFinal ? '' : '1'} - ${year}`;
      case EventPhase.SEMI_FINAL_2:
        return `Semi-Final 2 - ${year}`;
      case EventPhase.GRAND_FINAL:
        return `Grand Final - ${year}`;
      default:
        return `Eurovision ${year}`;
    }
  }, [eventPhase, hasOneSemiFinal, year]);

  // TODO: decompose
  return (
    <div
      className={`w-full h-full theme-default theme-${year}`}
      id="main"
      style={{
        backgroundColor: theme.colors.appBgColor,
      }}
    >
      <EventSetupModal
        isOpen={eventSetupModalOpen}
        onClose={() => setEventSetupModalOpen(false)}
      />
      {eventPhase !== EventPhase.COUNTRY_SELECTION && (
        <div className="lg:pt-8 md:pt-6 pt-4">
          <div className="xl:px-[15%] lg:px-[10%] md:px-[6%] sm:px-8 px-4 lg:pb-16 md:pb-12 pb-8 lg:pt-5 sm:pt-4 pt-2 w-full">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <img
                  src={themeInfo.hostingCountryLogo}
                  alt="Hosting country logo"
                  className="w-10 h-10"
                />
                <h2 className="sm:text-xl text-lg font-bold text-white">
                  {phaseTitle}
                </h2>
              </div>

              <div className="flex gap-2">
                <Button
                  label="Start over"
                  onClick={() => setEventSetupModalOpen(true)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              {isVotingOver && (
                <Button
                  onClick={continueToNextPhase}
                  className="animated-border"
                >
                  Continue to {nextPhase}
                </Button>
              )}
            </div>
            <div className="pt-2 w-full flex lg:gap-x-6 md:gap-x-4 gap-x-3 md:flex-row flex-col">
              <Board />
              <ControlsPanel />
            </div>
            <WinnerModal />

            <QualificationResultsModal />
          </div>
        </div>
      )}
    </div>
  );
};
