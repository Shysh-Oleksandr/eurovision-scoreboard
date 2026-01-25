import gsap from 'gsap';
import { useTranslations } from 'next-intl';
import React, { useRef } from 'react';

import { useGSAP } from '@gsap/react';

import { useScoreboardStore } from '../../../state/scoreboardStore';

import { CountryQualificationItem } from './CountryQualificationItem';

import Button from '@/components/common/Button';

const QualificationBoard = () => {
  const t = useTranslations('simulation');
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const currentStageId = useScoreboardStore((state) => state.currentStageId);
  const pickQualifier = useScoreboardStore((state) => state.pickQualifier);
  const pickQualifierRandomly = useScoreboardStore(
    (state) => state.pickQualifierRandomly,
  );

  const currentStage = getCurrentStage();
  const countries = currentStage?.countries ?? [];
  const isOver = !!currentStage?.isOver;
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        containerRef.current,
        {
          opacity: 0,
          y: 20,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.in',
        },
      );
    },
    {
      dependencies: [currentStageId],
      scope: containerRef,
    },
  );

  return (
    <div className="flex-1 rounded-sm">
      {!isOver && (
        <div className="2cols:flex hidden justify-between items-center flex-wrap gap-2 mb-2">
          <h2
            className="lg:text-2xl xs:text-xl text-lg font-medium text-white !leading-tight"
            style={{ textShadow: '0 0 10px rgba(0, 0, 0, 0.2)' }}
          >
            {t('chooseCountryToQualify')}
          </h2>
          <Button
            variant="tertiary"
            label={t('random')}
            onClick={pickQualifierRandomly}
            snowEffect="middle"
          />
        </div>
      )}

      <div
        ref={containerRef}
        className="grid grid-cols-1 2cols:grid-cols-2 gap-x-3 xs:gap-y-1.5 gap-y-1"
      >
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
