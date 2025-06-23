import React, { useEffect, useState } from 'react';

import { useCountriesStore } from '../state/countriesStore';
import { useScoreboardStore } from '../state/scoreboardStore';

import Button from './Button';
import Modal from './Modal';

const WinnerModal = () => {
  const { winnerCountry } = useScoreboardStore();
  const { setEventSetupModalOpen } = useCountriesStore();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (winnerCountry) {
      setShowModal(true);
    }
  }, [winnerCountry]);

  if (!showModal || !winnerCountry) return null;

  return (
    <Modal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      containerClassName="lg:w-2/5 md:w-1/2 w-3/4"
      contentClassName="lg:py-16 md:py-12 sm:py-8 py-6 lg:px-10 md:px-8 px-4 text-white text-center"
    >
      <h3 className="lg:text-3xl sm:text-2xl text-xl font-semibold mb-4">
        We have a winner!
      </h3>
      <h4 className="lg:text-2xl sm:text-xl text-base font-medium mb-4">
        <span className="font-bold">{winnerCountry.name}</span> won with{' '}
        <span className="font-bold">{winnerCountry.points}</span> points!
      </h4>
      <Button
        label="Start over"
        onClick={() => {
          setShowModal(false);
          setEventSetupModalOpen(true);
        }}
        className={`py-3 sm:text-base text-xs sm:w-auto sm:!px-12 w-full`}
      />
    </Modal>
  );
};

export default WinnerModal;
