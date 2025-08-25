import React, { useMemo, useRef } from 'react';

import { useScoreboardStore } from '../../../state/scoreboardStore';

import { CountryQualificationItem } from './CountryQualificationItem';

const QualifiedCountriesList = () => {
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const qualificationOrder = useScoreboardStore(
    (state) => state.qualificationOrder,
  );

  const { countries, qualifiersAmount, id: stageId } = getCurrentStage();

  const qualifiedCountries = useMemo(
    () => countries.filter((country) => country.isQualifiedFromSemi),
    [countries],
  );

  // Sort qualified countries by their qualification order for this stage
  const sortedQualifiedCountries = useMemo(() => {
    const stageQualificationOrder = qualificationOrder[stageId] || {};

    return [...qualifiedCountries].sort((a, b) => {
      const orderA = stageQualificationOrder[a.code] || 0;
      const orderB = stageQualificationOrder[b.code] || 0;

      return orderA - orderB;
    });
  }, [qualifiedCountries, qualificationOrder, stageId]);

  const countriesContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="xl:w-[350px] lg:w-[320px] 2cols:w-[calc(min(300px,35%))] w-[50%] lg:px-6 sm:px-4 xs:px-3 px-2 py-4 bg-primary-800 bg-gradient-to-tr from-primary-900 to-primary-900/50 rounded-sm shadow-md">
      <h2 className="lg:text-2xl xs:text-xl text-lg text-center font-semibold uppercase mb-4 text-white tracking-wide">
        Qualified
        <br />
        for the
        <br />
        <span className="font-bold">Grand Final</span>
      </h2>

      <div
        ref={countriesContainerRef}
        className="overflow-hidden flex flex-col gap-1.5"
      >
        {Array.from({ length: qualifiersAmount ?? 0 }).map((_, index) => (
          <CountryQualificationItem
            key={sortedQualifiedCountries[index]?.code ?? index}
            country={sortedQualifiedCountries[index] ?? null}
            shouldAnimate
          />
        ))}
      </div>
    </div>
  );
};

export default QualifiedCountriesList;
