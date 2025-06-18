import React, { useReducer } from 'react';

import Board from '../components/board';
import ControlsPanel from '../components/controlsPanel';
import FeedbackInfo from '../components/feedbackInfo';
import { YearSelectBox } from '../components/SelectBox/YearSelectBox';
import WinnerModal from '../components/WinnerModal';
import scoreboardReducer, { initialState } from '../state/reducer';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';

const MainContent = () => {
  const [state, dispatch] = useReducer(scoreboardReducer, initialState);
  const { theme, year } = useTheme();

  return (
    <div
      className={`w-full h-full theme-default theme-${year}`}
      id="main"
      style={{
        backgroundColor: theme.colors.appBgColor,
      }}
    >
      <div className="lg:pt-8 md:pt-6 pt-4">
        <YearSelectBox dispatch={dispatch} />
        <div className="xl:px-[15%] lg:px-[10%] md:px-[6%] sm:px-8 px-4 lg:pb-16 md:pb-12 pb-8 lg:pt-5 sm:pt-4 pt-2 w-full">
          <div className="pt-2 w-full flex lg:gap-x-6 md:gap-x-4 gap-x-3 md:flex-row flex-col">
            <Board
              countries={state.countries}
              votingPoints={state.votingPoints}
              isJuryVoting={state.isJuryVoting}
              winnerCountry={state.winnerCountry}
              votingCountryIndex={state.votingCountryIndex}
              shouldShowLastPoints={state.shouldShowLastPoints}
              isVotingOver={!!state.winnerCountry}
              dispatch={dispatch}
            />
            <ControlsPanel
              countries={state.countries}
              votingCountryIndex={state.votingCountryIndex}
              votingPoints={state.votingPoints}
              isJuryVoting={state.isJuryVoting}
              shouldShowLastPoints={state.shouldShowLastPoints}
              isVotingOver={!!state.winnerCountry}
              shouldClearPoints={state.shouldClearPoints}
              dispatch={dispatch}
            />
          </div>
          <WinnerModal
            winnerCountry={state.winnerCountry}
            dispatch={dispatch}
          />
        </div>
      </div>
    </div>
  );
};

export const Main = () => {
  return (
    <ThemeProvider>
      <MainContent />
      <FeedbackInfo className="md:block hidden" />
    </ThemeProvider>
  );
};
