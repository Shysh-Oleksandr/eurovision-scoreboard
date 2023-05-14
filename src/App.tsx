import React from 'react';

import './styles.css';
import '/dist/output.css';
import Board from './components/board';
import ControlsPanel from './components/ControlsPanel';

export const App = () => {
  return (
    <div className="container px-[15%] pt-20 mb-16 w-full flex">
      <Board />
      <ControlsPanel />
    </div>
  );
};
