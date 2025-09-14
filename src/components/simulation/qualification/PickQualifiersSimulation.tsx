import React, { Suspense } from 'react';

import QualificationBoard from './QualificationBoard';
import QualifiedCountriesList from './QualifiedCountriesList';

import Button from '@/components/common/Button';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

const PresentationPanel = React.lazy(
  () => import('../../presentationPanel/PresentationPanel'),
);

const PickQualifiersSimulation = () => {
  const presentationModeEnabled = useGeneralStore(
    (state) => state.settings.presentationModeEnabled,
  );
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const pickQualifierRandomly = useScoreboardStore(
    (state) => state.pickQualifierRandomly,
  );

  const currentStage = getCurrentStage();
  const { isOver } = currentStage;
  const startCounter = useScoreboardStore((state) => state.startCounter);

  return (
    <>
      {!isOver && (
        <div className="flex 2cols:hidden justify-between items-center gap-2 xs:mb-1 mb-2 mt-2">
          <h2
            className="lg:text-2xl xs:text-xl text-lg font-medium text-white"
            style={{ textShadow: '0 0 10px rgba(0, 0, 0, 0.2)' }}
          >
            Choose a country to qualify
          </h2>
          <Button
            variant="tertiary"
            label="Random"
            onClick={pickQualifierRandomly}
          />
        </div>
      )}

      <div
        className={`flex md:gap-6 xs:gap-4 gap-3 ${
          currentStage.isOver ? 'pt-2' : 'xs:pt-2 pt-0'
        }`}
        key={startCounter}
      >
        <QualificationBoard />
        <div className="flex flex-col gap-2 xl:w-[350px] lg:w-[320px] 2cols:w-[calc(min(300px,35%))] w-[50%]">
          <QualifiedCountriesList />
          <Suspense fallback={null}>
            {presentationModeEnabled && !isOver && <PresentationPanel />}
          </Suspense>
        </div>
      </div>
    </>
  );
};

export default PickQualifiersSimulation;
