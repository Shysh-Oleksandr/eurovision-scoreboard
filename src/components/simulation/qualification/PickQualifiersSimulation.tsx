import React from 'react';

import QualificationBoard from './QualificationBoard';
import QualifiedCountriesList from './QualifiedCountriesList';

import Button from '@/components/common/Button';
import { useScoreboardStore } from '@/state/scoreboardStore';

export const PickQualifiersSimulation = () => {
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
        <div className="flex 2cols:hidden justify-between items-center flex-wrap gap-2 mb-2">
          <h2 className="lg:text-2xl xs:text-xl text-lg font-medium text-white">
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
          currentStage.isOver ? 'mt-4' : ''
        }`}
        key={startCounter}
      >
        <QualificationBoard />
        <QualifiedCountriesList />
      </div>
    </>
  );
};
