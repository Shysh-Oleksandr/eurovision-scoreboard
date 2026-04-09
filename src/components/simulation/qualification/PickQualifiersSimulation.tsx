'use client';
import { Columns3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef } from 'react';

import dynamic from 'next/dynamic';

import QualificationBoard from './QualificationBoard';
import QualifiedCountriesList from './QualifiedCountriesList';
import SplitScreenQualifierModal from './SplitScreenQualifierModal';

import Button from '@/components/common/Button';
import { EventStage, StageId } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

const PresentationPanel = dynamic(
  () => import('../../presentationPanel/PresentationPanel'),
  {
    ssr: false,
  },
);

const MIN_SPEED_SECONDS = 0.5;
const MAX_SPEED_SECONDS = 7.5;

const getQualifiersAmount = (stage: EventStage) =>
  stage.qualifiesTo?.reduce((sum, target) => {
    if (target.minRank && target.maxRank) {
      return sum + (target.maxRank - target.minRank + 1);
    }

    return sum + target.amount;
  }, 0) || 0;

const PickQualifiersSimulation = () => {
  const t = useTranslations('simulation');
  const presentationModeEnabled = useGeneralStore(
    (state) => state.settings.presentationModeEnabled,
  );
  const enableSplitScreenQualifierRevealMode = useGeneralStore(
    (state) => state.settings.enableSplitScreenQualifierRevealMode,
  );
  const enableSplitScreenForLastQualifier = useGeneralStore(
    (state) => state.settings.enableSplitScreenForLastQualifier,
  );
  const presentationSpeedSeconds = useGeneralStore(
    (state) => state.presentationSettings.presentationSpeedSeconds,
  );
  const isPresenting = useGeneralStore(
    (state) => state.presentationSettings.isPresenting,
  );
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const pickQualifierRandomly = useScoreboardStore(
    (state) => state.pickQualifierRandomly,
  );
  const splitScreenQualifierModalOpen = useScoreboardStore(
    (state) => state.splitScreenQualifierModalOpen,
  );
  const openSplitScreenQualifierModal = useScoreboardStore(
    (state) => state.openSplitScreenQualifierModal,
  );

  const currentStage = getCurrentStage();
  const isOver = !!currentStage?.isOver;
  const startCounter = useScoreboardStore((state) => state.startCounter);
  const autoOpenRevealKeyRef = useRef<string | null>(null);
  const autoOpenTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const revealStep = useMemo(() => {
    if (!currentStage || currentStage.isOver) return null;
    if (currentStage.id.toUpperCase() === StageId.GF.toUpperCase()) return null;

    const qualifiersAmount = getQualifiersAmount(currentStage);

    if (qualifiersAmount <= 0) return null;

    const qualifiedCount = currentStage.countries.filter((country) =>
      country.qualifiedFromStageIds?.includes(currentStage.id),
    ).length;
    const remainingSlots = qualifiersAmount - qualifiedCount;
    const revealKey = `${currentStage.id}:${qualifiedCount}`;

    return {
      revealKey,
      remainingSlots,
    };
  }, [currentStage]);

  const revealKey = revealStep?.revealKey ?? null;
  const remainingSlots = revealStep?.remainingSlots ?? 0;
  const canUseSplitScreenForThisStep =
    remainingSlots > 1 ||
    (enableSplitScreenForLastQualifier && remainingSlots === 1);

  useEffect(() => {
    if (autoOpenTimeoutRef.current) {
      clearTimeout(autoOpenTimeoutRef.current);
      autoOpenTimeoutRef.current = null;
    }

    if (!enableSplitScreenQualifierRevealMode || !revealKey) {
      autoOpenRevealKeyRef.current = null;

      return;
    }

    if (!canUseSplitScreenForThisStep) {
      autoOpenRevealKeyRef.current = null;

      return;
    }
    if (isPresenting) return;
    if (autoOpenRevealKeyRef.current === revealKey) return;
    if (splitScreenQualifierModalOpen) return;

    autoOpenRevealKeyRef.current = revealKey;

    const baseSeconds = MAX_SPEED_SECONDS - presentationSpeedSeconds;
    const delayMs = Math.max(MIN_SPEED_SECONDS, baseSeconds) * 1000;

    autoOpenTimeoutRef.current = setTimeout(() => {
      useScoreboardStore.getState().openSplitScreenQualifierModal();
      autoOpenTimeoutRef.current = null;
    }, delayMs);

    return () => {
      if (autoOpenTimeoutRef.current) {
        clearTimeout(autoOpenTimeoutRef.current);
        autoOpenTimeoutRef.current = null;
      }
    };
  }, [
    enableSplitScreenQualifierRevealMode,
    revealKey,
    remainingSlots,
    canUseSplitScreenForThisStep,
    presentationSpeedSeconds,
    isPresenting,
    splitScreenQualifierModalOpen,
  ]);

  return (
    <>
      {!isOver && (
        <div className="flex 2cols:hidden justify-between items-center gap-2 xs:mb-1 mb-2 mt-2">
          <h2
            style={{ textShadow: '0 0 10px rgba(0, 0, 0, 0.2)' }}
            className="lg:text-2xl xs:text-xl text-lg font-medium text-white !leading-tight"
          >
            {t('chooseCountryToQualify')}
          </h2>
          <div className="flex gap-2 items-center ml-auto">
            {enableSplitScreenQualifierRevealMode && (
              <Button
                Icon={<Columns3 className="w-6 h-6" />}
                className="!px-3 !py-2.5"
                onClick={openSplitScreenQualifierModal}
                disabled={!canUseSplitScreenForThisStep}
              />
            )}
            <Button
              variant="tertiary"
              label={t('random')}
              onClick={pickQualifierRandomly}
              snowEffect="middle"
            />
          </div>
        </div>
      )}

      <SplitScreenQualifierModal />

      <div
        className={`flex md:gap-6 xs:gap-4 gap-3 ${
          isOver ? 'pt-2' : 'xs:pt-2 pt-0'
        }`}
        key={startCounter}
      >
        <QualificationBoard
          canUseSplitScreenForThisStep={canUseSplitScreenForThisStep}
        />
        <div className="flex flex-col gap-2 xl:w-[350px] lg:w-[320px] 2cols:w-[calc(min(300px,35%))] w-[50%]">
          <QualifiedCountriesList />
          {presentationModeEnabled && !isOver && <PresentationPanel />}
        </div>
      </div>
    </>
  );
};

export default PickQualifiersSimulation;
