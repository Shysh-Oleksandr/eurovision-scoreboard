import { useTranslations } from 'next-intl';
import React, { useMemo, useRef } from 'react';

import { useScoreboardStore } from '../../../state/scoreboardStore';

import { CountryQualificationItem } from './CountryQualificationItem';
import { useQualifierTargetStageNames } from './useQualifierTargetStageNames';

import SnowPileEffect from '@/components/effects/SnowPileEffect';
import {
  getQualifierTargetStageNames,
  getTotalQualifiersAmount,
} from '@/helpers/qualifierTargetResolution';
import { useGeneralStore } from '@/state/generalStore';
import { useQualifiedCountriesPanelGlowStyle } from '@/theme/useQualifiedCountriesPanelGlowStyle';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

const PANEL_INNER_CLASSNAME =
  'overflow-hidden lg:px-6 sm:px-4 xs:px-3 px-2 py-4 bg-primary-800 bg-gradient-to-tr from-primary-900 to-primary-900/50 relative';

const QualifiedCountriesList = () => {
  const t = useTranslations('simulation');
  const showQualifierTargetStages = useGeneralStore(
    (state) => state.settings.showQualifierTargetStages,
  );
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const qualificationOrder = useScoreboardStore(
    (state) => state.qualificationOrder,
  );

  const currentStage = getCurrentStage();
  const {
    countries,
    qualifiesTo,
    id: stageId,
    isOver = false,
  } = currentStage || {};

  const qualifiersAmount = useMemo(
    () => getTotalQualifiersAmount(qualifiesTo),
    [qualifiesTo],
  );

  const qualifiedCountries = useMemo(
    () =>
      countries?.filter((country) => {
        if (!stageId) return false;

        return country.qualifiedFromStageIds?.includes(stageId);
      }) ?? [],
    [countries, stageId],
  );

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

  const targetStageNameByCountryCode = useQualifierTargetStageNames(
    currentStage,
    sortedQualifiedCountries.map((country) => country.code),
  );

  const targetStageNames = useMemo(
    () => getQualifierTargetStageNames(qualifiesTo, eventStages),
    [qualifiesTo, eventStages],
  );

  const headerContent = useMemo(() => {
    const span = (chunks: React.ReactNode) => (
      <span className="font-bold bg-gradient-to-br from-white to-primary-700 bg-clip-text text-transparent">
        {chunks}
      </span>
    );
    const br = () => <br />;

    if (!showQualifierTargetStages) {
      return t.rich('qualifiedForTheGrandFinal', {
        span,
        br,
      });
    }

    if (targetStageNames.length === 1) {
      return t.rich('qualifiedForStage', {
        stageName: targetStageNames[0],
        span,
        br,
      });
    }

    return t.rich('qualifiedEntries', {
      span,
      br,
    });
  }, [t, targetStageNames, showQualifierTargetStages]);

  const countriesContainerRef = useRef<HTMLDivElement>(null);
  const { roundedCountryContainer } = useThemeSpecifics();
  const roundedPanelGlowStyle = useQualifiedCountriesPanelGlowStyle(
    roundedCountryContainer,
  );

  const panelContent = (
    <>
      <SnowPileEffect snowEffect="middle" className="!w-full" />
      <h2 className="lg:text-2xl xs:text-xl text-lg text-center font-semibold uppercase break-words mb-4 tracking-wid text-white">
        {headerContent}
      </h2>

      <div ref={countriesContainerRef} className=" flex flex-col gap-1.5">
        {Array.from({ length: qualifiersAmount ?? 0 }).map((_, index) => {
          const country = sortedQualifiedCountries[index] ?? null;

          return (
            <CountryQualificationItem
              key={country?.code ?? index}
              country={country}
              shouldAnimate
              targetStageName={
                showQualifierTargetStages && isOver && country
                  ? targetStageNameByCountryCode.get(country.code)
                  : undefined
              }
            />
          );
        })}
      </div>
    </>
  );

  return (
    <div
      className={`${PANEL_INNER_CLASSNAME} ${
        roundedCountryContainer
          ? 'qualified-countries-panel--rounded'
          : 'rounded-[10px] shadow-md'
      }`}
      style={roundedPanelGlowStyle}
    >
      {panelContent}
    </div>
  );
};

export default QualifiedCountriesList;
