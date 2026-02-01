import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useGSAP } from '@gsap/react';

import { useNextEventName } from '../../../hooks/useNextEventName';
import { useScoreboardStore } from '../../../state/scoreboardStore';
import Button from '../../common/Button';
import Modal, { ANIMATION_DURATION } from '../../common/Modal/Modal';
import { useContinueToNextPhase } from '../hooks/useContinueToNextPhase';

import { CountryQualificationItem } from './CountryQualificationItem';

import { useGeneralStore } from '@/state/generalStore';
import { compareCountriesByPoints } from '@/state/scoreboard/helpers';

const QualificationResultsModal = () => {
  const t = useTranslations();
  const showQualificationModal = useGeneralStore(
    (state) => state.settings.showQualificationModal,
  );
  const showQualificationResults = useScoreboardStore(
    (state) => state.showQualificationResults,
  );
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const closeQualificationResults = useScoreboardStore(
    (state) => state.closeQualificationResults,
  );
  const qualificationOrder = useScoreboardStore(
    (state) => state.qualificationOrder,
  );

  const shouldShowQualificationModal =
    showQualificationModal && showQualificationResults;

  const currentStage = getCurrentStage();
  const { name: currentStageName, countries, id: stageId } = currentStage || {};
  const { nextPhase } = useNextEventName();

  const { handleContinue } = useContinueToNextPhase();

  const qualifiedCountries = useMemo(
    () =>
      countries
        ?.filter((country) => {
          if (!stageId) return false;

          return country.qualifiedFromStageIds?.includes(stageId);
        })
        .sort(compareCountriesByPoints),
    [countries, stageId],
  );

  const countriesContainerRef = useRef<HTMLDivElement>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [shouldClose, setShouldClose] = useState(false);

  const sortedQualifiedCountries = useMemo(() => {
    const stageQualificationOrder = stageId
      ? qualificationOrder[stageId] || {}
      : {};

    return [...(qualifiedCountries ?? [])].sort((a, b) => {
      const orderA = stageQualificationOrder[a.code] || 0;
      const orderB = stageQualificationOrder[b.code] || 0;

      return orderA - orderB;
    });
  }, [qualifiedCountries, qualificationOrder, stageId]);

  useEffect(() => {
    if (shouldShowQualificationModal) {
      setShouldClose(false);
    }
  }, [shouldShowQualificationModal]);

  const handleClose = () => {
    closeQualificationResults();
  };

  const handleTriggerClose = () => {
    setShouldClose(true);
  };

  // Track when modal becomes visible (after delay)
  useEffect(() => {
    if (shouldShowQualificationModal) {
      const timer = setTimeout(() => {
        setIsModalVisible(true);
      }, 3400); // Same delay as openDelay prop

      return () => {
        clearTimeout(timer);
        setIsModalVisible(false);
      };
    }
    setIsModalVisible(false);
  }, [shouldShowQualificationModal]);

  useGSAP(
    () => {
      if (isModalVisible) {
        (async () => {
          const { default: gsap } = await import('gsap');

          gsap.fromTo(
            countriesContainerRef.current?.children ?? [],
            {
              opacity: 0,
              x: -160,
            },
            {
              opacity: 1,
              x: 0,
              duration: 0.6,
              ease: 'power1.in',
              stagger: 0.6,
              delay: 0.2,
            },
          );
        })();
      }
    },
    { scope: countriesContainerRef, dependencies: [isModalVisible] },
  );

  return (
    <Modal
      isOpen={shouldShowQualificationModal && !shouldClose}
      onClose={handleTriggerClose}
      onClosed={handleClose}
      openDelay={3400}
      containerClassName="!w-[min(100%,500px)]"
      withBlur
      bottomContent={
        <div className="flex justify-end xs:gap-4 gap-2 bg-primary-900 sm:p-4 p-2 z-30">
          <Button variant="secondary" onClick={handleTriggerClose}>
            {t('common.close')}
          </Button>
          <Button
            onClick={() => {
              handleTriggerClose();
              setTimeout(() => {
                handleContinue();
              }, ANIMATION_DURATION / 2);
            }}
            className="animated-border !text-sm md:!text-base w-full"
          >
            {t('simulation.phaseActions.continueTo', {
              nextPhase: nextPhase ?? '',
            })}
          </Button>
        </div>
      }
    >
      <h2 className="md:text-2xl text-xl font-bold mb-4 text-white">
        {t('simulation.qualifiers', { stageName: currentStageName ?? '' })}
      </h2>

      <div
        ref={countriesContainerRef}
        className="grid grid-cols-2 gap-x-3 md:gap-y-3 xs:gap-y-2 gap-y-1.5"
      >
        {sortedQualifiedCountries.map((country) => (
          <CountryQualificationItem
            key={country.code}
            country={country}
            shouldAnimate={false}
            isModal
          />
        ))}
      </div>
    </Modal>
  );
};

export default QualificationResultsModal;
