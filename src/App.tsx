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
    <div className="container px-[15%] pt-16 mb-16 w-full">
      <div className="pt-2 w-full flex gap-x-6">
        <Board
          countries={state.countries}
          votingPoints={state.votingPoints}
          isJuryVoting={state.isJuryVoting}
          winnerCountry={state.winnerCountry}
          votingCountryIndex={state.votingCountryIndex}
          dispatch={dispatch}
        />
        <ControlsPanel
          countries={state.countries}
          votingCountryIndex={state.votingCountryIndex}
          votingPoints={state.votingPoints}
          isJuryVoting={state.isJuryVoting}
          shouldShowLastPoints={state.shouldShowLastPoints}
          isVotingOver={!!state.winnerCountry}
          dispatch={dispatch}
        />
      </div>
      <WinnerModal winnerCountry={state.winnerCountry} dispatch={dispatch} />
    </div>
  );
};
