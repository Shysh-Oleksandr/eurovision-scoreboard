import { ArrowLeft, ArrowRight, Info, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';

import { countryName } from './countryMeta';
import { DivergingSlider } from './DivergingSlider';
import { RelFlag } from './RelFlag';
import { RelSegmented } from './RelSegmented';

import { cn } from '@/helpers/utils';
import { useGeneralStore } from '@/state/generalStore';
import {
  collectLensRelations,
  DiasporaSettings,
  findOverride,
  RelationSource,
} from '@/state/scoreboard/diaspora';

interface CountryLensProps {
  diaspora: DiasporaSettings;
}

type Direction = 'out' | 'inc';

interface LensPairRowProps {
  /** the directed pair, always stored FROM→TO regardless of view direction */
  from: string;
  to: string;
  /** the counterpart shown in the row (the non-selected country) */
  other: string;
  baseAffinity: number;
  sourceLabel: string;
  dir: Direction;
}

/**
 * One tunable relationship in the lens. Subscribes only to its own override (so
 * editing one row doesn't re-render the whole list); edits route through the
 * shared override action, the single sink for per-pair tweaks.
 */
const LensPairRow: React.FC<LensPairRowProps> = ({
  from,
  to,
  other,
  baseAffinity,
  sourceLabel,
  dir,
}) => {
  const overrideValue = useGeneralStore(
    (s) => findOverride(s.settings.diaspora.overrides, from, to)?.affinity,
  );
  const updateOverride = useGeneralStore((s) => s.updateDiasporaOverride);
  const value = overrideValue ?? baseAffinity;
  const DirIcon = dir === 'out' ? ArrowRight : ArrowLeft;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-white/10 bg-primary-800/40 px-3 py-2 sm:flex-nowrap">
      <div className="flex w-full min-w-0 items-center gap-2 overflow-hidden sm:w-[200px] sm:shrink-0">
        <DirIcon size={14} className="shrink-0 text-white/25" />
        <RelFlag code={other} size={18} />
        <div className="min-w-0">
          <div className="truncate text-[13px] font-bold text-white">
            {countryName(other)}
          </div>
          <div className="truncate text-[9.5px] font-bold uppercase tracking-[0.05em] text-white/40">
            {sourceLabel}
          </div>
        </div>
      </div>
      <div className="w-full min-w-0 sm:flex-1">
        <DivergingSlider
          value={value}
          onChange={(v) => updateOverride(from, to, v)}
          compact
        />
      </div>
    </div>
  );
};

/**
 * By-country lens: a read/tune view over the SAME resolved affinity data,
 * filtered to one country. A flag rail (sorted by relationship count) picks the
 * country; a segmented toggle flips between votes it gives and votes it gets;
 * favors/snubs lists group the relationships. No second copy of the data — it's
 * derived from the settings via collectLensRelations.
 */
export const CountryLens: React.FC<CountryLensProps> = ({ diaspora }) => {
  const t = useTranslations('settings.relations');
  const [selected, setSelected] = useState<string | null>(null);
  const [dir, setDir] = useState<Direction>('out');
  const [query, setQuery] = useState('');

  const relations = useMemo(() => collectLensRelations(diaspora), [diaspora]);

  const railCountries = useMemo(() => {
    const counts = new Map<string, number>();

    for (const r of relations) {
      counts.set(r.from, (counts.get(r.from) ?? 0) + 1);
      counts.set(r.to, (counts.get(r.to) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);
  }, [relations]);

  // Lock in a default selection once the rail is populated (so it doesn't drift
  // as edits reorder the rail).
  useEffect(() => {
    if (selected === null && railCountries.length > 0) {
      setSelected(railCountries[0].code);
    }
  }, [selected, railCountries]);

  const current = selected ?? railCountries[0]?.code ?? '';

  const sourceLabel = (source: RelationSource): string => {
    switch (source.kind) {
      case 'group':
      case 'customGroup':
        return source.name;
      case 'special':
        return t('srcSpecial');
      case 'override':
        return t('srcCustom');
    }
  };

  const rows = useMemo(
    () => relations.filter((r) => (dir === 'out' ? r.from : r.to) === current),
    [relations, dir, current],
  );
  const favors = rows.filter((r) => r.affinity > 0);
  const snubs = rows.filter((r) => r.affinity < 0);

  const rail = query.trim()
    ? railCountries.filter((c) =>
        countryName(c.code).toLowerCase().includes(query.trim().toLowerCase()),
      )
    : railCountries;

  const renderRow = (r: (typeof rows)[number]) => {
    const other = dir === 'out' ? r.to : r.from;

    return (
      <LensPairRow
        key={`${r.from}-${r.to}`}
        from={r.from}
        to={r.to}
        other={other}
        baseAffinity={r.affinity}
        sourceLabel={sourceLabel(r.source)}
        dir={dir}
      />
    );
  };

  if (railCountries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-xs text-white/40">
        {t('lensEmpty')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 text-[11.5px] text-white/40">
        <Info size={14} className="shrink-0 text-primary-700" />
        <span>{t('lensInfo')}</span>
      </div>

      {/* search + flag rail */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('jumpToCountry')}
          className="h-9 w-full rounded-lg border border-white/10 bg-black/30 pl-9 pr-3 text-[13px] font-semibold text-white outline-none placeholder:text-white/40"
        />
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 narrow-scrollbar">
        {rail.map((c) => {
          const active = c.code === current;

          return (
            <button
              key={c.code}
              type="button"
              onClick={() => setSelected(c.code)}
              className={cn(
                'flex w-[62px] shrink-0 flex-col items-center gap-1.5 rounded-lg border px-1.5 py-2 transition-colors',
                active
                  ? 'border-primary-700 bg-primary-800/60'
                  : 'border-white/10 bg-transparent hover:bg-white/5',
              )}
            >
              <RelFlag code={c.code} size={26} />
              <span
                className={cn(
                  'max-w-full truncate text-[9.5px] font-bold',
                  active ? 'text-white' : 'text-white/40',
                )}
              >
                {countryName(c.code)}
              </span>
            </button>
          );
        })}
      </div>

      {/* country header */}
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-primary-800/50 px-3 py-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30">
          <RelFlag code={current} size={26} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-extrabold text-white">
            {countryName(current)}
          </div>
          <div className="mt-0.5 text-[11.5px] text-white/40">
            {t('favoredSnubbed', {
              favored: favors.length,
              snubbed: snubs.length,
            })}
          </div>
        </div>
        <RelSegmented<Direction>
          value={dir}
          onChange={setDir}
          options={[
            { value: 'out', label: t('votesGiven') },
            { value: 'inc', label: t('votesGot') },
          ]}
        />
      </div>

      {/* favors / snubs */}
      {favors.length > 0 && (
        <div>
          <div
            className="mb-1.5 px-0.5 text-[11.5px] font-extrabold"
            style={{ color: 'var(--rel-pos-ink)' }}
          >
            {dir === 'out' ? t('favors') : t('favoredBy')}
          </div>
          <div className="flex flex-col gap-1.5">{favors.map(renderRow)}</div>
        </div>
      )}
      {snubs.length > 0 && (
        <div>
          <div
            className="mb-1.5 px-0.5 text-[11.5px] font-extrabold"
            style={{ color: 'var(--rel-neg-ink)' }}
          >
            {dir === 'out' ? t('snubs') : t('snubbedBy')}
          </div>
          <div className="flex flex-col gap-1.5">{snubs.map(renderRow)}</div>
        </div>
      )}
      {rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-white/10 px-3 py-5 text-center text-xs text-white/40">
          {dir === 'out'
            ? t('noOutgoing', { country: countryName(current) })
            : t('noIncoming', { country: countryName(current) })}
        </div>
      )}
    </div>
  );
};
