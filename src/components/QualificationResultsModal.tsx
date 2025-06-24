import { gsap } from 'gsap';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useGSAP } from '@gsap/react';

import { useNextEventName } from '../hooks/useNextEventName';
import { EventPhase } from '../models';
import { useScoreboardStore } from '../state/scoreboardStore';

import Button from './Button';
import Modal from './Modal';
import { CountrySelectionListItem } from './setup/CountrySelectionListItem';

const QualificationResultsModal = () => {
  const {
    eventPhase,
    showQualificationResults,
    qualifiedCountries,
    continueToNextPhase,
    closeQualificationResults,
  } = useScoreboardStore();

  const { nextPhase, hasOneSemiFinal } = useNextEventName();
  const isSemiFinal1 = eventPhase === EventPhase.SEMI_FINAL_1;

  const countriesContainerRef = useRef<HTMLDivElement>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const title = useMemo(() => {
    if (hasOneSemiFinal) return 'Semi-Final';
    if (isSemiFinal1) {
      return 'Semi-Final 1';
    }

    return 'Semi-Final 2';
  }, [hasOneSemiFinal, isSemiFinal1]);

  const handleClose = () => {
    closeQualificationResults();
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
      isOpen={showQualificationResults}
      onClose={handleClose}
      openDelay={3400}
      containerClassName="lg:w-2/5 md:w-1/2 w-4/5"
      bottomContent={
        <div className="flex justify-end xs:gap-4 gap-2 bg-primary-900 p-4 z-30">
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button
            onClick={() => {
              handleClose();
              continueToNextPhase();
            }}
            className="animated-border !text-sm md:!text-base w-full"
          >
            Continue to {nextPhase}
          </Button>
        </div>
      }
    >
      <h2 className="md:text-2xl text-xl font-bold mb-4 text-white">
        {title} Qualifiers
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
