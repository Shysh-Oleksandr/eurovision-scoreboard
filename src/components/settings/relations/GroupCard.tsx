import { ChevronRight, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { PairRow } from './PairRow';
import { RelFlag } from './RelFlag';

import { ToggleButton } from '@/components/common/ToggleButton';
import { cn } from '@/helpers/utils';
import {
  DiasporaPresetGroup,
  DiasporaSettings,
  removeOverride,
} from '@/state/scoreboard/diaspora';

interface GroupCardProps {
  group: DiasporaPresetGroup;
  diaspora: DiasporaSettings;
  setDiaspora: (partial: Partial<DiasporaSettings>) => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  diaspora,
  setDiaspora,
}) => {
  const t = useTranslations('settings.relations');
  const [open, setOpen] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  const on = diaspora.enabledGroupIds.includes(group.id);

  const toggleGroup = () =>
    setDiaspora({
      enabledGroupIds: on
        ? diaspora.enabledGroupIds.filter((id) => id !== group.id)
        : [...diaspora.enabledGroupIds, group.id],
    });

  const resetGroup = () => {
    let { overrides } = diaspora;

    for (const p of group.pairs) {
      overrides = removeOverride(overrides, p.from, p.to);
    }
    setDiaspora({ overrides });
  };

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
          <div className="min-w-0">
            <div className="text-[14.5px] font-extrabold text-white">
              {group.name}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="flex gap-1">
                {group.codes.map((c) => (
                  <RelFlag key={c} code={c} size={16} />
                ))}
              </span>
              <span className="ml-1 text-[11.5px] font-semibold text-white/40">
                {t('pairsCount', { count: group.pairs.length })}
              </span>
            </div>
          </div>
        </button>
        <ToggleButton isActive={on} onToggle={toggleGroup} />
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
              !on && 'pointer-events-none opacity-40',
            )}
          >
            <div className="mb-3 flex gap-2">
              <button type="button" onClick={resetGroup} className={quickChip}>
                <RotateCcw size={14} />
                {t('resetDefaults')}
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {hasBeenOpened &&
                group.pairs.map((p) => (
                  <PairRow
                    key={`${p.from}-${p.to}`}
                    from={p.from}
                    to={p.to}
                    presetValue={p.affinity}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const quickChip =
  'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1.5 text-[11.5px] hover:bg-black/40 transition-colors font-bold text-white/60';
