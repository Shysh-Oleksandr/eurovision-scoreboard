import { ChevronRight, LucideIcon, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import { countryName } from './countryMeta';
import { PairRow } from './PairRow';

import { ToggleButton } from '@/components/common/ToggleButton';
import { cn } from '@/helpers/utils';
import { PresetPair } from '@/state/scoreboard/diaspora';

const MAX_VISIBLE = 60;

interface PairListCardProps {
  Icon: LucideIcon;
  title: string;
  sub: string;
  pairs: PresetPair[];
  on: boolean;
  onToggle: () => void;
  /** big lists (the historical set): add search + a visible-row cap */
  searchable?: boolean;
  /**
   * Keep the list tunable even when the toggle is off (a browse-and-tune
   * surface): the toggle bulk-applies the whole set, but tuning one pair still
   * saves an override that applies on its own.
   */
  alwaysInteractive?: boolean;
}

/**
 * A toggleable, expandable list of directed pairs (Special pairs, All historical
 * pairs). Rows are mounted only after the first expand (lazy), sorted by
 * |affinity|; the searchable variant caps visible rows so we never render
 * hundreds of sliders. Expand/collapse animates like CollapsibleSection.
 */
export const PairListCard: React.FC<PairListCardProps> = ({
  Icon,
  title,
  sub,
  pairs,
  on,
  onToggle,
  searchable,
  alwaysInteractive,
}) => {
  const t = useTranslations('settings.relations');
  const [open, setOpen] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [query, setQuery] = useState('');

  const sorted = useMemo(
    () =>
      hasBeenOpened
        ? [...pairs].sort((a, b) => Math.abs(b.affinity) - Math.abs(a.affinity))
        : [],
    [hasBeenOpened, pairs],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return sorted;
    const q = query.trim().toLowerCase();

    return sorted.filter(
      (p) =>
        countryName(p.from).toLowerCase().includes(q) ||
        countryName(p.to).toLowerCase().includes(q) ||
        p.from.toLowerCase().includes(q) ||
        p.to.toLowerCase().includes(q),
    );
  }, [sorted, query]);

  const visible = searchable ? filtered.slice(0, MAX_VISIBLE) : filtered;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-white/10 transition-colors',
        on ? 'bg-primary-800/50' : 'bg-transparent',
      )}
    >
      <div className="flex items-center gap-2.5 p-3">
        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            setHasBeenOpened(true);
          }}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <ChevronRight
            size={17}
            className={cn(
              'shrink-0 text-white/40 transition-transform duration-300',
              open && 'rotate-90',
            )}
          />
          <Icon size={19} className="shrink-0 text-primary-700" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[14.5px] font-extrabold text-white">
                {title}
              </span>
              <span className="rounded-full border border-white/10 bg-primary-900/80 px-1.5 py-px text-[11px] font-semibold text-white/40">
                {pairs.length}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-white/40">{sub}</div>
          </div>
        </button>
        <ToggleButton isActive={on} onToggle={onToggle} />
      </div>

      <div
        className={cn(
          'grid transition-all duration-300',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              'border-t border-white/10 px-3 pb-3 pt-3',
              !on && !alwaysInteractive && 'pointer-events-none opacity-40',
            )}
          >
            {alwaysInteractive && !on && (
              <div className="mb-3 text-[11.5px] leading-relaxed text-white/40">
                {t('broadBrowseHint')}
              </div>
            )}
            {searchable && (
              <div className="relative mb-3">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('searchCountries')}
                  className="h-9 w-full rounded-lg border border-white/10 bg-black/30 pl-9 pr-3 text-[13px] font-semibold text-white outline-none placeholder:text-white/40"
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              {visible.map((p) => (
                <PairRow
                  key={`${p.from}-${p.to}`}
                  from={p.from}
                  to={p.to}
                  presetValue={p.affinity}
                />
              ))}
            </div>
            {searchable && filtered.length > MAX_VISIBLE && (
              <div className="mt-3 text-center text-[11.5px] text-white/40">
                {t('showingOf', {
                  shown: MAX_VISIBLE,
                  total: filtered.length,
                })}
              </div>
            )}
            {searchable && filtered.length === 0 && hasBeenOpened && (
              <div className="py-3 text-center text-xs text-white/40">
                {t('noMatches')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
