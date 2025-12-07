'use client';
import { useTranslations } from 'next-intl';
import React from 'react';

import dynamic from 'next/dynamic';

import QualificationBoard from './QualificationBoard';
import QualifiedCountriesList from './QualifiedCountriesList';

import Button from '@/components/common/Button';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

const PresentationPanel = dynamic(
  () => import('../../presentationPanel/PresentationPanel'),
  {
    ssr: false,
  },
);

const PickQualifiersSimulation = () => {
  const t = useTranslations('simulation');
  const presentationModeEnabled = useGeneralStore(
    (state) => state.settings.presentationModeEnabled,
  );
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const pickQualifierRandomly = useScoreboardStore(
    (state) => state.pickQualifierRandomly,
  );

  const currentStage = getCurrentStage();
  const isOver = !!currentStage?.isOver;
  const startCounter = useScoreboardStore((state) => state.startCounter);

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
          <Button
            variant="tertiary"
            label={t('random')}
            onClick={pickQualifierRandomly}
          />
        </div>
      )}

      <div
        className={`flex md:gap-6 xs:gap-4 gap-3 ${
          isOver ? 'pt-2' : 'xs:pt-2 pt-0'
        }`}
        key={startCounter}
      >
        <QualificationBoard />
        <div className="flex flex-col gap-2 xl:w-[350px] lg:w-[320px] 2cols:w-[calc(min(300px,35%))] w-[50%]">
          <QualifiedCountriesList />
          {presentationModeEnabled && !isOver && <PresentationPanel />}
        </div>
      </div>
    </>
  );
};

export default PickQualifiersSimulation;
