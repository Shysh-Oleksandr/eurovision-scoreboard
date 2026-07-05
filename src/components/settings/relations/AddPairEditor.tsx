import { ArrowRight, Info, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import { DirectedPairLabel } from './DirectedPairLabel';
import { DivergingSlider } from './DivergingSlider';
import { ValueChip } from './ValueChip';

import Button from '@/components/common/Button';
import CustomSelect, {
  Option,
} from '@/components/common/customSelect/CustomSelect';
import { useGeneralStore } from '@/state/generalStore';

interface AddPairEditorProps {
  countryOptions: Option[];
}

export const AddPairEditor: React.FC<AddPairEditorProps> = ({
  countryOptions,
}) => {
  const t = useTranslations('settings.relations');
  const updateOverride = useGeneralStore((s) => s.updateDiasporaOverride);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [value, setValue] = useState(60);

  const placeholder: Option = { label: t('pickCountry'), value: '' };
  const fromOptions = useMemo(
    () => [placeholder, ...countryOptions.filter((o) => o.value !== to)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [countryOptions, to],
  );
  const toOptions = useMemo(
    () => [placeholder, ...countryOptions.filter((o) => o.value !== from)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [countryOptions, from],
  );

  const ready = Boolean(from && to && from !== to);

  const add = () => {
    if (!ready) return;
    updateOverride(from, to, value);
    setFrom('');
    setTo('');
    setValue(60);
  };

  const imgClass = (o: Option) =>
    o.isExisting ? 'w-6 h-6 !object-contain' : 'w-6 h-4';

  return (
    <div
      className="rounded-xl border p-3.5"
      style={{
        borderColor: 'var(--rel-pos-bd)',
        background: 'rgba(255,255,255,.03)',
      }}
    >
      <div className="mb-3 flex items-center gap-2 text-[13.5px] font-extrabold text-white">
        <Plus size={17} className="text-primary-700" />
        {t('newPair')}
      </div>

      <div className="flex flex-wrap items-end gap-2.5 sm:flex-nowrap">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-white/40">
            {t('fromLabel')}
          </div>
          <CustomSelect
            options={fromOptions}
            value={from}
            onChange={setFrom}
            getImageClassName={imgClass}
          />
        </div>
        <ArrowRight
          size={20}
          className="mb-2 shrink-0"
          style={{ color: ready ? 'var(--rel-pos)' : 'rgba(255,255,255,.35)' }}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-white/40">
            {t('toLabel')}
          </div>
          <CustomSelect
            options={toOptions}
            value={to}
            onChange={setTo}
            getImageClassName={imgClass}
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-[11px] font-bold text-white/40">
          <span>{t('snub')}</span>
          <span>{t('neutral')}</span>
          <span>{t('favor')}</span>
        </div>
        <DivergingSlider value={value} onChange={setValue} delay={0} />
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[200px] flex-1 items-center gap-2.5 rounded-lg border border-dashed border-white/20 bg-black/30 px-3 py-2.5">
          {ready ? (
            <>
              <DirectedPairLabel from={from} to={to} value={value} size={19} />
              <span className="ml-auto">
                <ValueChip value={value} big />
              </span>
            </>
          ) : (
            <span className="text-xs font-semibold text-white/40">
              {t('pickTwo')}
            </span>
          )}
        </div>
        <Button
          variant="primary"
          onClick={add}
          disabled={!ready}
          Icon={<Plus size={20} />}
          label={t('addPair')}
          className="!py-2"
        />
      </div>

      <div className="mt-3 flex gap-2 text-[11.5px] leading-relaxed text-white/40">
        <Info size={14} className="mt-0.5 shrink-0 text-primary-700" />
        <span>{t('overrideHint')}</span>
      </div>
    </div>
  );
};
