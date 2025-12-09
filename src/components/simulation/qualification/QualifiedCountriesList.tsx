import { useTranslations } from 'next-intl';
import React, { useMemo, useRef } from 'react';

import { useScoreboardStore } from '../../../state/scoreboardStore';

import { CountryQualificationItem } from './CountryQualificationItem';

const QualifiedCountriesList = () => {
  const t = useTranslations('simulation');
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const qualificationOrder = useScoreboardStore(
    (state) => state.qualificationOrder,
  );

  const currentStage = getCurrentStage();
  const { countries, qualifiesTo, id: stageId } = currentStage || {};

  const qualifiersAmount = useMemo(() => {
    return qualifiesTo?.reduce((sum, target) => sum + target.amount, 0) || 0;
  }, [qualifiesTo]);

  const qualifiedCountries = useMemo(
    () =>
      countries?.filter((country) => {
        if (!stageId) return false;

        return country.qualifiedFromStageIds?.includes(stageId);
      }) ?? [],
    [countries, stageId],
  );

  // Sort qualified countries by their qualification order for this stage
  const sortedQualifiedCountries = useMemo(() => {
    const stageQualificationOrder = stageId
      ? qualificationOrder[stageId] || {}
      : {};

    return [...qualifiedCountries].sort((a, b) => {
      const orderA = stageQualificationOrder[a.code] || 0;
      const orderB = stageQualificationOrder[b.code] || 0;

      return orderA - orderB;
    });
  }, [qualifiedCountries, qualificationOrder, stageId]);

  const countriesContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="lg:px-6 sm:px-4 xs:px-3 px-2 py-4 bg-primary-800 bg-gradient-to-tr from-primary-900 to-primary-900/50 rounded-sm shadow-md">
      <h2 className="lg:text-2xl xs:text-xl text-lg text-center font-semibold uppercase break-words mb-4 text-white tracking-wide">
        {t.rich('qualifiedForTheGrandFinal', {
          span: (chunks) => <span className="font-bold">{chunks}</span>,
          br: () => <br />,
        })}
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
