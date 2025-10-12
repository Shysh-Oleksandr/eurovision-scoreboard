import React, { useEffect, useState } from 'react';

import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';
import Modal from '../common/Modal/Modal';

const WinnerModal = () => {
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);
  const isWinnerAnimationAlreadyDisplayed = useScoreboardStore(
    (state) => state.isWinnerAnimationAlreadyDisplayed,
  );
  const setEventSetupModalOpen = useCountriesStore(
    (state) => state.setEventSetupModalOpen,
  );
  const [showModal, setShowModal] = useState(false);

  const shouldShowWinnerModal = showModal && !!winnerCountry;

  useEffect(() => {
    if (winnerCountry && !isWinnerAnimationAlreadyDisplayed) {
      setShowModal(true);
    }
  }, [winnerCountry, isWinnerAnimationAlreadyDisplayed]);

  return (
    <Modal
      isOpen={shouldShowWinnerModal}
      openDelay={3400}
      onClose={() => setShowModal(false)}
      containerClassName="lg:!w-2/5 md:!w-1/2 xs:!w-3/4 w-full"
      contentClassName="md:pt-12 sm:pt-8 pt-6 lg:px-10 md:px-8 px-4 sm:!pb-8 !pb-4 text-white text-center"
      bottomContent={
        <div className="flex w-full xs:gap-4 gap-2 bg-primary-900 sm:p-4 p-2 z-30">
          <Button
            label="Start over"
            onClick={() => {
              setShowModal(false);
              setEventSetupModalOpen(true);
            }}
            className="w-full"
          />
        </div>
      }
    >
      <h3 className="lg:text-3xl sm:text-2xl text-xl font-semibold mb-4">
        We have a winner!
      </h3>
      <h4 className="lg:text-2xl sm:text-xl text-base font-medium">
        <span className="font-bold">{winnerCountry?.name ?? ''}</span> won with{' '}
        <span className="font-bold">{winnerCountry?.points ?? ''}</span> points!
      </h4>
    </Modal>
  );
};

export default WinnerModal;
