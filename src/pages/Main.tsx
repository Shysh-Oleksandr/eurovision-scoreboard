import React, { useEffect } from 'react';

import Board from '../components/board';
import ControlsPanel from '../components/controlsPanel';
import FeedbackInfo from '../components/feedbackInfo';
import { YearSelectBox } from '../components/SelectBox/YearSelectBox';
import WinnerModal from '../components/WinnerModal';
import { useCountriesStore } from '../state/countriesStore';

export const Main = () => {
  const { year, theme } = useCountriesStore();

  // Apply initial theme class on mount
  useEffect(() => {
    document.documentElement.classList.add(`theme-${year}`);
  }, [year]);

  return (
    <div
      className={`w-full h-full theme-default theme-${year}`}
      id="main"
      style={{
        backgroundColor: theme.colors.appBgColor,
      }}
    >
      <div className="lg:pt-8 md:pt-6 pt-4">
        <YearSelectBox />
        <div className="xl:px-[15%] lg:px-[10%] md:px-[6%] sm:px-8 px-4 lg:pb-16 md:pb-12 pb-8 lg:pt-5 sm:pt-4 pt-2 w-full">
          <div className="pt-2 w-full flex lg:gap-x-6 md:gap-x-4 gap-x-3 md:flex-row flex-col">
            <Board />
            <ControlsPanel />
          </div>
          <WinnerModal />
          <FeedbackInfo className="md:block hidden" />
        </div>
      </div>
    </div>
  );
};
