'use client';
import { Info, Layers, Plus, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';

import { AddPairEditor } from './relations/AddPairEditor';
import { GroupCard } from './relations/GroupCard';
import { MasterBlock } from './relations/MasterBlock';
import { OverrideRow } from './relations/OverrideRow';
import { PairListCard } from './relations/PairListCard';

import Button from '@/components/common/Button';
import { Option } from '@/components/common/customSelect/CustomSelect';
import { cn } from '@/helpers/utils';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { diasporaPresets } from '@/state/scoreboard/diaspora';
import { getHostingCountryLogo } from '@/theme/hosting';

const SectionHeader: React.FC<{
  children: React.ReactNode;
  sub?: string;
  right?: React.ReactNode;
}> = ({ children, sub, right }) => (
  <div className="mb-2.5 flex items-center justify-between gap-2.5">
    <div>
      <div className="text-[11px] font-extrabold uppercase tracking-[0.11em] text-white/55">
        {children}
      </div>
      {sub && <div className="mt-0.5 text-xs text-white/40">{sub}</div>}
    </div>
    {right}
  </div>
);

interface RelationsSettingsProps {
  onLoaded?: () => void;
}

const RelationsSettings: React.FC<RelationsSettingsProps> = ({ onLoaded }) => {
  const t = useTranslations('settings.relations');
  const diaspora = useGeneralStore((s) => s.settings.diaspora);
  const setDiaspora = useGeneralStore((s) => s.setDiaspora);
  const getAllCountries = useCountriesStore((s) => s.getAllCountries);

  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    onLoaded?.();
  }, [onLoaded]);

  const countryOptions: Option[] = useMemo(
    () =>
      getAllCountries().map((c) => {
        const { logo, isExisting } = getHostingCountryLogo(c);

        return { label: c.name, value: c.code, imageUrl: logo, isExisting };
      }),
    [getAllCountries],
  );

  const { enabled } = diaspora;

  return (
    <div className="relations-tab flex flex-col gap-3.5">
      <MasterBlock diaspora={diaspora} setDiaspora={setDiaspora} />

      <div
        className={cn(
          'flex flex-col gap-3.5 transition-opacity',
          !enabled && 'pointer-events-none opacity-40',
        )}
      >
        {/* Blocs */}
        <div>
          <SectionHeader sub={t('blocsSub')}>{t('blocs')}</SectionHeader>
          <div className="flex flex-col gap-2">
            {diasporaPresets.groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                diaspora={diaspora}
                setDiaspora={setDiaspora}
              />
            ))}
          </div>
          {diaspora.useBroadPreset && (
            <div className="mt-2 flex gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11.5px] text-white/50">
              <Info size={14} className="mt-0.5 shrink-0 text-primary-700" />
              <span>{t('broadOnNote')}</span>
            </div>
          )}
        </div>

        {/* Curated pair sets */}
        <div>
          <SectionHeader>{t('curated')}</SectionHeader>
          <div className="flex flex-col gap-2">
            <PairListCard
              Icon={Sparkles}
              title={t('specialTitle')}
              sub={t('specialSub')}
              pairs={diasporaPresets.specialPairs}
              on={diaspora.useSpecialPairs}
              onToggle={() =>
                setDiaspora({ useSpecialPairs: !diaspora.useSpecialPairs })
              }
            />
            <PairListCard
              Icon={Layers}
              title={t('broadTitle')}
              sub={t('broadSub')}
              pairs={diasporaPresets.broadPreset.pairs}
              on={diaspora.useBroadPreset}
              onToggle={() =>
                setDiaspora({ useBroadPreset: !diaspora.useBroadPreset })
              }
              searchable
              alwaysInteractive
            />
          </div>
        </div>

        {/* Your pairs */}
        <div>
          <SectionHeader
            right={
              <Button
                onClick={() => setShowAdd((s) => !s)}
                label={t('addPair')}
                Icon={
                  <Plus
                    size={18}
                    className={cn(
                      'transition-transform',
                      showAdd && 'rotate-45',
                    )}
                  />
                }
                className="!h-8 !px-3 !text-[12.5px]"
              />
            }
          >
            {t('yourPairs')}
          </SectionHeader>
          {showAdd && (
            <div className="mb-2.5">
              <AddPairEditor countryOptions={countryOptions} />
            </div>
          )}
          {diaspora.overrides.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-white/40">
              {t('noPairs')}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {diaspora.overrides.map((o) => (
                <OverrideRow key={`${o.from}-${o.to}`} override={o} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RelationsSettings;
