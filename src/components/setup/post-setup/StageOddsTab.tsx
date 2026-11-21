'use client';
import { useTranslations } from 'next-intl';
import React from 'react';

import OddsSettings from '@/components/settings/OddsSettings';
import { OddsController } from '@/components/settings/useGlobalOddsController';
import { EventStage } from '@/models';

interface StageOddsTabProps {
  controller: OddsController;
  stage: EventStage;
  isOverridden: boolean;
  onResetToGlobal: () => void;
  onLoaded?: () => void;
}

/**
 * Edit stage → Odds: Settings' Odds tab on a draft for this stage only. The
 * note sits on top of its controls, and "Global odds" (back to the
 * contest's odds, randomness and spread) leads Set all odds while the stage
 * has its own.
 */
const StageOddsTab: React.FC<StageOddsTabProps> = ({
  controller,
  stage,
  isOverridden,
  onResetToGlobal,
  onLoaded,
}) => {
  const t = useTranslations('setup.eventStageModal');

  return (
    <div className="mt-1">
      <OddsSettings
        controller={controller}
        countries={stage.countries}
        onLoaded={onLoaded}
        note={t('oddsOverrideNote')}
        onUseGlobal={isOverridden ? onResetToGlobal : undefined}
      />
    </div>
  );
};

export default StageOddsTab;
