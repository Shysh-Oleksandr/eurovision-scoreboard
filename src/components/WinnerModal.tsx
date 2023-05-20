import React, { useEffect, useState } from 'react';

import { Country, ScoreboardAction } from '../models';

import StartOverButton from './StartOverButton';

type Props = {
  winnerCountry: Country | null;
  dispatch: React.Dispatch<ScoreboardAction>;
};

const WinnerModal = ({ winnerCountry, dispatch }: Props) => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (winnerCountry) {
      setShowModal(true);
    }
  }, [winnerCountry]);

  if (!showModal || !winnerCountry) return null;

  return (
    <div
      className="w-full h-full absolute top-0 bottom-0 left-0 right-0 z-10 bg-black bg-opacity-60 flex justify-center items-center"
      onClick={() => setShowModal(false)}
    >
      <div
        className="bg-blue-950 w-1/3 py-16 px-10 text-white text-center rounded-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-3xl font-semibold mb-4">Congratulations!</h3>
        <h4 className="text-2xl font-medium mb-4">
          <span className="font-bold">{winnerCountry.name}</span> won with{' '}
          <span className="font-bold">{winnerCountry.points}</span> points!
        </h4>
        <StartOverButton dispatch={dispatch} />
      </div>
    </div>
  );
};

export default WinnerModal;
