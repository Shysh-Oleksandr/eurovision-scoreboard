import { ArrowRightIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useGSAP } from '@gsap/react';

import { useNextEventName } from '../../../hooks/useNextEventName';
import { useScoreboardStore } from '../../../state/scoreboardStore';
import Button from '../../common/Button';
import Modal, { ANIMATION_DURATION } from '../../common/Modal/Modal';
import { useContinueToNextPhase } from '../hooks/useContinueToNextPhase';

import { CountryQualificationItem } from './CountryQualificationItem';
import { useQualifierSections } from './useQualifierSections';

import { shouldShowQualifierTargetLabels } from '@/helpers/qualifierTargetResolution';
import { useGeneralStore } from '@/state/generalStore';
import { createCountriesComparator } from '@/state/scoreboard/helpers';

const QualificationResultsModal = () => {
  const t = useTranslations();
  const showQualificationModal = useGeneralStore(
    (state) => state.settings.showQualificationModal,
  );
  const showQualifierTargetStages = useGeneralStore(
    (state) => state.settings.showQualifierTargetStages,
  );
  const showQualificationResults = useScoreboardStore(
    (state) => state.showQualificationResults,
  );
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const closeQualificationResults = useScoreboardStore(
    (state) => state.closeQualificationResults,
  );
  const qualificationOrder = useScoreboardStore(
    (state) => state.qualificationOrder,
  );

  const shouldShowQualificationModal =
    showQualificationModal && showQualificationResults;

  const currentStage = getCurrentStage();
  const {
    name: currentStageName,
    countries,
    id: stageId,
    qualifiesTo,
  } = currentStage || {};
  const { nextPhase } = useNextEventName();

  const { handleContinue } = useContinueToNextPhase();

  const qualifiedCountries = useMemo(
    () =>
      countries
        ?.filter((country) => {
          if (!stageId) return false;

          return country.qualifiedFromStageIds?.includes(stageId);
        })
        .sort(createCountriesComparator(currentStage?.runningOrder)),
    [countries, stageId, currentStage?.runningOrder],
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

  const sectionGroups = useQualifierSections(
    currentStage,
    sortedQualifiedCountries,
    false,
  );

  // Where the qualifiers go, once per target stage rather than on every row:
  // "Qualified for the Grand Final" over its qualifiers, then the next.
  const sections = useMemo(() => {
    const showTargets =
      shouldShowQualifierTargetLabels(
        qualifiesTo,
        eventStages,
        showQualifierTargetStages,
      ) && sectionGroups.length > 0;

    if (!showTargets) {
      return [
        { key: 'all', stageName: null, qualifiers: sortedQualifiedCountries },
      ];
    }

    return sectionGroups
      .filter((group) => group.qualifiers.length > 0)
      .map((group) => ({
        key: `${group.targetStageId}-${group.start}`,
        stageName: group.stageName,
        qualifiers: group.qualifiers,
      }));
  }, [
    qualifiesTo,
    eventStages,
    showQualifierTargetStages,
    sectionGroups,
    sortedQualifiedCountries,
  ]);

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
            countriesContainerRef.current?.querySelectorAll(
              '[data-qualifier-rows] > *',
            ) ?? [],
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
        <div className="flex items-center gap-2.5 bg-primary-900 px-3.5 pt-[10px] pb-[calc(10px+var(--modal-safe-bottom,0px))] 2cols:px-5 z-30">
          <Button
            variant="ghost"
            size="lg"
            className="px-[18px]"
            onClick={handleTriggerClose}
          >
            {t('common.close')}
          </Button>
          <Button
            onClick={() => {
              handleTriggerClose();
              setTimeout(() => {
                handleContinue();
              }, ANIMATION_DURATION / 2);
            }}
            variant="cta"
            size="lg"
            className="flex-1 min-w-0 flex-row-reverse justify-center !uppercase !font-bold"
            Icon={<ArrowRightIcon className="size-[18px]" />}
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

      <div ref={countriesContainerRef} className="flex flex-col gap-5">
        {sections.map((section) => (
          <section key={section.key} className="flex flex-col gap-2.5">
            {section.stageName !== null && (
              <h3 className="text-[15px] font-extrabold leading-tight tracking-[-0.01em] text-white [overflow-wrap:anywhere]">
                {t.rich('simulation.qualifiedForStage', {
                  stageName: section.stageName,
                  br: () => ' ',
                  span: (chunks) => chunks,
                })}
              </h3>
            )}
            <div
              data-qualifier-rows
              className="grid grid-cols-2 gap-x-3 md:gap-y-3 xs:gap-y-2 gap-y-1.5"
            >
              {section.qualifiers.map((country) => (
                <CountryQualificationItem
                  key={country.code}
                  country={country}
                  shouldAnimate={false}
                  isModal
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
};

export default QualificationResultsModal;
