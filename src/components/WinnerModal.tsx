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
        className="bg-blue-950 lg:w-2/5 md:w-1/2 w-2/3 lg:py-16 md:py-12 sm:py-8 py-6 lg:px-10 md:px-8 px-4 text-white text-center rounded-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="lg:text-3xl sm:text-2xl text-xl font-semibold mb-4">
          We have a winner!
        </h3>
        <h4 className="lg:text-2xl sm:text-xl text-base font-medium mb-4">
          <span className="font-bold">{winnerCountry.name}</span> won with{' '}
          <span className="font-bold">{winnerCountry.points}</span> points!
        </h4>
        <StartOverButton
          dispatch={dispatch}
          className="!py-2 sm:text-base text-xs sm:w-auto sm:!px-10 w-full"
        />
      </div>
    </div>
  );
};

export default WinnerModal;
