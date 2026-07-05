import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { RangeSlider } from '@/components/common/RangeSlider';
import { ToggleButton } from '@/components/common/ToggleButton';
import { cn } from '@/helpers/utils';
import { DiasporaSettings } from '@/state/scoreboard/diaspora';

interface MasterBlockProps {
  diaspora: DiasporaSettings;
  setDiaspora: (partial: Partial<DiasporaSettings>) => void;
}

export const MasterBlock: React.FC<MasterBlockProps> = ({
  diaspora,
  setDiaspora,
}) => {
  const t = useTranslations('settings.relations');
  const { enabled, strength } = diaspora;

  return (
    <div className="rounded-xl border border-white/10 bg-primary-800/60 p-4">
      <div className="flex items-center gap-3">
        <Heart className="w-5 h-5 shrink-0 text-primary-700" />
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-extrabold text-white">
            {t('title')}
          </div>
          <div className="mt-0.5 text-xs text-white/40">{t('subtitle')}</div>
        </div>
        <ToggleButton
          isActive={enabled}
          onToggle={() => setDiaspora({ enabled: !enabled })}
        />
      </div>

      <div
        className={cn(
          'mt-3.5 transition-opacity',
          !enabled && 'pointer-events-none opacity-40',
        )}
      >
        <div className="mb-2 flex items-baseline gap-2">
          <span className="text-[13px] font-bold text-white/70">
            {t('strength')}
          </span>
          <strong className="text-sm font-extrabold tabular-nums text-white">
            {strength}
          </strong>
          <span className="ml-auto text-[11.5px] text-white/40">
            {t('strengthHint')}
          </span>
        </div>
        <RangeSlider
          min={0}
          max={100}
          value={strength}
          onChange={(value) => setDiaspora({ strength: value })}
          displayValue={false}
          minLabel={t('subtle')}
          maxLabel={t('dramatic')}
          delay={100}
        />
      </div>
    </div>
  );
};
