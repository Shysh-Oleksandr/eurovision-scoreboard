import { gsap } from 'gsap';
import React, { useMemo, useRef } from 'react';

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

  const title = useMemo(() => {
    if (hasOneSemiFinal) return 'Semi-Final';
    if (isSemiFinal1) {
      return 'Semi-Final 1';
    }

    return 'Semi-Final 2';
  }, [hasOneSemiFinal, isSemiFinal1]);

  useGSAP(
    () => {
      gsap.from(countriesContainerRef.current?.children ?? [], {
        opacity: 0,
        x: -160,
        duration: 0.6,
        ease: 'power3.out',
        stagger: 0.6,
        delay: 0.2,
      });
    },
    { scope: countriesContainerRef, dependencies: [showQualificationResults] },
  );

  return (
    <Modal
      isOpen={showQualificationResults}
      onClose={closeQualificationResults}
      containerClassName="lg:w-2/5 md:w-1/2 w-4/5"
      bottomContent={
        <div className="flex justify-end xs:gap-4 gap-2 bg-primary-900 p-4 z-30">
          <Button variant="secondary" onClick={closeQualificationResults}>
            Close
          </Button>
          <Button
            onClick={continueToNextPhase}
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
