import React, { useReducer } from 'react';

import './styles.css';
import '/dist/output.css';

import Board from './components/board';
import ControlsPanel from './components/controlsPanel';
import WinnerModal from './components/WinnerModal';
import scoreboardReducer, { initialState } from './state/reducer';

export const App = () => {
  const [state, dispatch] = useReducer(scoreboardReducer, initialState);

  return (
    <div className="xl:px-[15%] lg:px-[10%] md:px-[6%] sm:px-8 px-4 lg:pt-16 md:pt-12 pt-8 lg:pb-16 md:pb-12 pb-8 w-full">
      <div className="pt-2 w-full flex lg:gap-x-6 md:gap-x-4 gap-x-3 md:flex-row flex-col">
        <Board
          countries={state.countries}
          votingPoints={state.votingPoints}
          isJuryVoting={state.isJuryVoting}
          winnerCountry={state.winnerCountry}
          votingCountryIndex={state.votingCountryIndex}
          shouldShowLastPoints={state.shouldShowLastPoints}
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
      <WinnerModal winnerCountry={state.winnerCountry} dispatch={dispatch} />
    </div>
  );
};
