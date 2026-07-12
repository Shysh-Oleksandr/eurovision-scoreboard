'use client';
import { RotateCcwIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import Button from '@/components/common/Button';
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

const StageOddsTab: React.FC<StageOddsTabProps> = ({
  controller,
  stage,
  isOverridden,
  onResetToGlobal,
  onLoaded,
}) => {
  const t = useTranslations('setup.eventStageModal');

  return (
    <div className="flex flex-col gap-3 mt-1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-white/60">{t('oddsOverrideNote')}</p>

        {isOverridden && (
          <Button
            variant="tertiary"
            className="!py-1.5 !px-3 !text-sm shrink-0 whitespace-nowrap"
            onClick={onResetToGlobal}
            Icon={<RotateCcwIcon className="w-4 h-4" />}
          >
            {t('resetToGlobalOdds')}
          </Button>
        )}
      </div>

      <OddsSettings
        controller={controller}
        countries={stage.countries}
        onLoaded={onLoaded}
      />
    </div>
  );
};

export default StageOddsTab;
