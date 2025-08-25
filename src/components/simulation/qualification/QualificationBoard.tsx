import React from 'react';

import { useScoreboardStore } from '../../../state/scoreboardStore';

import { CountryQualificationItem } from './CountryQualificationItem';

import Button from '@/components/common/Button';

const QualificationBoard = () => {
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const pickQualifier = useScoreboardStore((state) => state.pickQualifier);
  const pickQualifierRandomly = useScoreboardStore(
    (state) => state.pickQualifierRandomly,
  );

  const { countries, isOver } = getCurrentStage();

  return (
    <div className="flex-1 rounded-sm">
      {!isOver && (
        <div className="2cols:flex hidden justify-between items-center flex-wrap gap-2 mb-2">
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

      <div className="grid grid-cols-1 2cols:grid-cols-2 gap-x-3 gap-y-1.5">
        {countries.map((country) => (
          <CountryQualificationItem
            key={country.code}
            country={country}
            onClick={isOver ? undefined : () => pickQualifier(country.code)}
            hideIfQualified
          />
        ))}
      </div>
    </div>
  );
};

export default QualificationBoard;
