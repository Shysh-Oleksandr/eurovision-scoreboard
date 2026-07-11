'use client';
import { useTranslations } from 'next-intl';
import React from 'react';

import OddsSettings from '@/components/settings/OddsSettings';
import { OddsController } from '@/components/settings/useGlobalOddsController';
import { EventStage } from '@/models';

interface StageOddsTabProps {
  controller: OddsController;
  stage: EventStage;
  onLoaded?: () => void;
}

const StageOddsTab: React.FC<StageOddsTabProps> = ({
  controller,
  stage,
  onLoaded,
}) => {
  const t = useTranslations('setup.eventStageModal');

  return (
    <div className="flex flex-col gap-3 mt-1">
      <p className="text-[13px] text-white/60">{t('oddsOverrideNote')}</p>

      <OddsSettings
        controller={controller}
        countries={stage.countries}
        onLoaded={onLoaded}
      />
    </div>
  );
};

export default StageOddsTab;
