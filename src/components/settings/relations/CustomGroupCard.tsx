import { ChevronRight, Pencil, Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import { countryName } from './countryMeta';
import { CustomGroupEditModal } from './CustomGroupEditModal';
import { DirectedPairLabel } from './DirectedPairLabel';
import { DivergingSlider } from './DivergingSlider';
import { RelFlag } from './RelFlag';

import CustomSelect, {
  Option,
} from '@/components/common/customSelect/CustomSelect';
import { ToggleButton } from '@/components/common/ToggleButton';
import { cn } from '@/helpers/utils';
import { useGeneralStore } from '@/state/generalStore';
import { DiasporaCustomGroup, findOverride } from '@/state/scoreboard/diaspora';

interface CustomGroupCardProps {
  group: DiasporaCustomGroup;
  countryOptions: Option[];
}

const imgClass = (o: Option) =>
  o.isExisting ? 'w-6 h-6 !object-contain' : 'w-6 h-4';

const headerIconBtn =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/5 hover:text-white';

/**
 * A user-created bloc. Mirrors GroupCard (chevron + name + member flags + count
 * + toggle) with a CUSTOM badge, an accent ring, a header Add-member (+) and
 * Edit (pencil, opens a rename/delete modal) button. Member pairs are generated
 * from memberCodes × base; each edit writes into this group's own `pairs` (not
 * the global overrides), and a per-row trash resets a tuned pair back to base.
 */
export const CustomGroupCard: React.FC<CustomGroupCardProps> = ({
  group,
  countryOptions,
}) => {
  const t = useTranslations('settings.relations');
  const updateGroup = useGeneralStore((s) => s.updateDiasporaCustomGroup);
  const updatePair = useGeneralStore((s) => s.updateDiasporaCustomGroupPair);

  const [open, setOpen] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [editing, setEditing] = useState(false);

  const { id, memberCodes, base, enabled: on } = group;

  const pairs = useMemo(() => {
    const out: { from: string; to: string }[] = [];

    for (const a of memberCodes) {
      for (const b of memberCodes) {
        if (a !== b) out.push({ from: a, to: b });
      }
    }

    return out;
  }, [memberCodes]);

  const addOptions = useMemo<Option[]>(
    () => [
      { label: t('addCountry'), value: '' },
      ...countryOptions.filter((o) => !memberCodes.includes(o.value)),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [countryOptions, memberCodes],
  );

  const addMember = (code: string) => {
    if (!code || memberCodes.includes(code)) return;
    updateGroup(id, { memberCodes: [...memberCodes, code] });
    setAddingMember(false);
  };

  const removeMember = (code: string) =>
    updateGroup(id, {
      memberCodes: memberCodes.filter((c) => c !== code),
    });

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border transition-colors',
        on ? 'bg-primary-800/50' : 'bg-transparent',
      )}
      style={{
        borderColor: 'var(--rel-pos-bd)',
        boxShadow: on ? 'inset 0 0 0 1px var(--rel-pos-bg)' : 'none',
      }}
    >
      <div className="flex items-center gap-1.5 p-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
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
            <div className="flex items-center gap-2">
              <span className="truncate text-[14.5px] font-extrabold text-white">
                {group.name}
              </span>
              <span
                className="shrink-0 rounded-full border px-1.5 py-px text-[9.5px] font-extrabold uppercase tracking-[0.06em]"
                style={{
                  background: 'var(--rel-pos-bg)',
                  borderColor: 'var(--rel-pos-bd)',
                  color: 'var(--rel-pos-ink)',
                }}
              >
                {t('customBadge')}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="flex gap-1">
                {memberCodes.map((c) => (
                  <RelFlag key={c} code={c} size={16} />
                ))}
              </span>
              <span className="ml-1 text-[11.5px] font-semibold text-white/40">
                {t('pairsCount', { count: pairs.length })}
              </span>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setAddingMember((a) => !a);
          }}
          className={headerIconBtn}
          aria-label={t('addMember')}
          title={t('addMember')}
        >
          <Plus size={17} />
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={headerIconBtn}
          aria-label={t('editBloc')}
          title={t('editBloc')}
        >
          <Pencil size={16} />
        </button>
        <ToggleButton
          isActive={on}
          onToggle={() => updateGroup(id, { enabled: !on })}
        />
      </div>

      <div
        className={cn(
          'grid transition-all duration-300',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/10 px-3 pb-3 pt-3">
            {addingMember && (
              <div className="mb-3">
                <CustomSelect
                  options={addOptions}
                  value=""
                  onChange={addMember}
                  getImageClassName={imgClass}
                />
              </div>
            )}

            {/* removable member chips */}
            <div className="mb-3 flex flex-wrap gap-2">
              {memberCodes.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 py-1 pl-2 pr-1.5"
                >
                  <RelFlag code={c} size={16} />
                  <b className="text-[12px] font-bold text-white">
                    {countryName(c)}
                  </b>
                  <button
                    type="button"
                    onClick={() => removeMember(c)}
                    className="flex text-white/40 hover:text-white/70"
                    aria-label={t('remove')}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>

            {/* generated member pairs (dimmed when the bloc is off — they don't
                apply, but the controls above stay live) */}
            <div
              className={cn(
                'flex flex-col gap-2',
                !on && 'pointer-events-none opacity-40',
              )}
            >
              {pairs.map((p) => {
                const value =
                  findOverride(group.pairs ?? [], p.from, p.to)?.affinity ??
                  base;

                return (
                  <div
                    key={`${p.from}-${p.to}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:flex-nowrap"
                  >
                    <div className="w-full min-w-0 overflow-hidden sm:w-[220px] sm:shrink-0">
                      <DirectedPairLabel
                        from={p.from}
                        to={p.to}
                        value={value}
                        size={16}
                      />
                    </div>
                    <div className="w-full min-w-0 sm:flex-1">
                      <DivergingSlider
                        value={value}
                        onChange={(v) => updatePair(id, p.from, p.to, v)}
                        compact
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <CustomGroupEditModal
        group={group}
        isOpen={editing}
        onClose={() => setEditing(false)}
      />
    </div>
  );
};
