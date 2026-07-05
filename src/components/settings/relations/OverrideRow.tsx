import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { DirectedPairLabel } from './DirectedPairLabel';
import { DivergingSlider } from './DivergingSlider';

import { useGeneralStore } from '@/state/generalStore';
import { basePresetValue, DiasporaOverride } from '@/state/scoreboard/diaspora';

interface OverrideRowProps {
  override: DiasporaOverride;
}

export const OverrideRow: React.FC<OverrideRowProps> = ({ override }) => {
  const t = useTranslations('settings.relations');
  const updateOverride = useGeneralStore((s) => s.updateDiasporaOverride);
  const removeOverrideAction = useGeneralStore((s) => s.removeDiasporaOverride);
  const { from, to, affinity } = override;
  const base = basePresetValue(from, to);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-white/10 bg-primary-800/50 px-3 py-2.5 sm:flex-nowrap">
      <div className="w-full min-w-0 overflow-hidden sm:w-[210px] sm:shrink-0">
        <DirectedPairLabel from={from} to={to} value={affinity} size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <DivergingSlider
          value={affinity}
          onChange={(v) => updateOverride(from, to, v)}
          compact
        />
      </div>
      {base !== null && (
        <span className="whitespace-nowrap text-[10.5px] font-semibold text-white/40">
          {t('was', { value: base > 0 ? `+${base}` : `${base}` })}
        </span>
      )}
      <button
        type="button"
        title={t('remove')}
        onClick={() => removeOverrideAction(from, to)}
        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/30 text-white/40 hover:text-white/70"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
};
