import { gsap } from 'gsap';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useGSAP } from '@gsap/react';

import { useNextEventName } from '../../hooks/useNextEventName';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../common/Button';
import Modal, { ANIMATION_DURATION } from '../common/Modal/Modal';
import { CountrySelectionListItem } from '../setup/CountrySelectionListItem';

const QualificationResultsModal = () => {
  const showQualificationResults = useScoreboardStore(
    (state) => state.showQualificationResults,
  );
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const continueToNextPhase = useScoreboardStore(
    (state) => state.continueToNextPhase,
  );
  const closeQualificationResults = useScoreboardStore(
    (state) => state.closeQualificationResults,
  );

  const { name: currentStageName, countries } = getCurrentStage();
  const { nextPhase } = useNextEventName();

  const qualifiedCountries = useMemo(
    () =>
      countries
        .filter((country) => country.isQualifiedFromSemi)
        .sort((a, b) => b.points - a.points),
    [countries],
  );

  const countriesContainerRef = useRef<HTMLDivElement>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [shouldClose, setShouldClose] = useState(false);

  useEffect(() => {
    if (showQualificationResults) {
      setShouldClose(false);
    }
  }, [showQualificationResults]);

  const handleClose = () => {
    closeQualificationResults();
  };

  const handleTriggerClose = () => {
    setShouldClose(true);
  };

  // Track when modal becomes visible (after delay)
  useEffect(() => {
    if (showQualificationResults) {
      const timer = setTimeout(() => {
        setIsModalVisible(true);
      }, 3400); // Same delay as openDelay prop

      return () => {
        clearTimeout(timer);
        setIsModalVisible(false);
      };
    }
    setIsModalVisible(false);
  }, [showQualificationResults]);

  useGSAP(
    () => {
      if (isModalVisible) {
        gsap.from(countriesContainerRef.current?.children ?? [], {
          opacity: 0,
          x: -160,
          duration: 0.6,
          ease: 'power3.out',
          stagger: 0.6,
          delay: 0.2,
        });
      }
    },
    { scope: countriesContainerRef, dependencies: [isModalVisible] },
  );

  return (
    <Modal
      isOpen={showQualificationResults && !shouldClose}
      onClose={handleTriggerClose}
      onClosed={handleClose}
      openDelay={3400}
      containerClassName="!w-[min(100%,500px)]"
      bottomContent={
        <div className="flex justify-end xs:gap-4 gap-2 bg-primary-900 p-4 z-30">
          <Button variant="secondary" onClick={handleTriggerClose}>
            Close
          </Button>
          <Button
            onClick={() => {
              handleTriggerClose();
              setTimeout(() => {
                continueToNextPhase();
              }, ANIMATION_DURATION / 2);
            }}
            className="animated-border !text-sm md:!text-base w-full"
          >
            Continue to {nextPhase}
          </Button>
        </div>
      }
    >
      <h2 className="md:text-2xl text-xl font-bold mb-4 text-white">
        {currentStageName} Qualifiers
      </h2>

      <div
        ref={countriesContainerRef}
        className="grid grid-cols-1 xs:grid-cols-2 gap-3"
      >
        {qualifiedCountries.map((country) => (
          <CountrySelectionListItem key={country.code} country={country} />
        ))}
      </div>
    </Modal>
  );
};

export default QualificationResultsModal;
