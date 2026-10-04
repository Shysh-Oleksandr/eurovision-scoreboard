'use client';
import { ArrowLeft, Check, Minus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { toast } from 'react-toastify';

import { DrawFlag } from './DrawWindowParts';

import AnchoredMenu from '@/components/common/AnchoredMenu';
import Button from '@/components/common/Button';
import { EventStage } from '@/models';
import { sizesFor } from '@/state/allocationDraw/engine';
import type {
  DrawInput,
  DrawRules,
  RuleKey,
} from '@/state/allocationDraw/types';
import { changedRuleKeys, OFFICIAL_RULES } from '@/state/allocationDraw/types';
import { useAllocationDrawStore } from '@/state/allocationDrawStore';

interface CustomizePanelProps {
  input: DrawInput;
  rules: DrawRules;
  /** Every semi that could be drawn into (before the "Choose" rule). */
  drawableSemis: EventStage[];
  hasOfficialPots: boolean;
  contestYear: string;
  entering: boolean;
  nameOf: (code: string) => string;
  flagSrcOf: (code: string) => string;
  onClose: () => void;
}

type OptionDef = {
  value: string;
  label: string;
  desc?: string;
  disabled?: boolean;
};

const Radio: React.FC<{ on: boolean }> = ({ on }) => (
  <span
    aria-hidden="true"
    className={`dp-dw-radio ${
      on ? 'is-on' : ''
    } w-[17px] h-[17px] rounded-full flex-none`}
  />
);

/** Customize: every draw rule as radio rows; changed sets are marked and can be reset. */
const CustomizePanel: React.FC<CustomizePanelProps> = ({
  input,
  rules,
  drawableSemis,
  hasOfficialPots,
  contestYear,
  entering,
  nameOf,
  flagSrcOf,
  onClose,
}) => {
  const t = useTranslations('setup.allocationDraw');
  const setRules = useAllocationDrawStore((s) => s.setRules);
  const resetRules = useAllocationDrawStore((s) => s.resetRules);
  const changes = changedRuleKeys(rules);
  const [dragCode, setDragCode] = useState<string | null>(null);
  const [dropPot, setDropPot] = useState<number | null>(null);

  const moveToPot = (code: string, to: number) => {
    const pots = (rules.customPots ?? []).map((p) =>
      p.filter((c) => c !== code),
    );

    if (!pots[to]) return;
    pots[to] = [...pots[to], code].sort((a, b) =>
      nameOf(a).localeCompare(nameOf(b)),
    );
    setRules({ customPots: pots });
  };

  const [potMenu, setPotMenu] = useState<{
    code: string;
    from: number;
    anchor: HTMLElement;
  } | null>(null);

  const setRule = (key: RuleKey, value: string) => {
    const patch: Partial<DrawRules> = { [key]: value } as Partial<DrawRules>;

    if (key === 'pots' && value === 'custom' && !rules.customPots) {
      patch.customPots = input.pots.map((p) =>
        [...p.members].sort((a, b) => nameOf(a).localeCompare(nameOf(b))),
      );
    }
    if (key === 'sizes' && value === 'custom') {
      const balanced = sizesFor({
        ...input,
        rules: { ...rules, sizes: 'balanced' },
      });
      const sizesCustom = { ...rules.sizesCustom };

      input.semis.forEach((s, i) => {
        if (sizesCustom[s.id] === undefined) sizesCustom[s.id] = balanced[i];
      });
      patch.sizesCustom = sizesCustom;
    }
    setRules(patch);
  };

  const optionSets: Array<{
    title: string;
    help?: string;
    sets: Array<{
      key: RuleKey;
      label: string;
      options: OptionDef[];
      disabled?: boolean;
      extra?: React.ReactNode;
    }>;
  }> = [
    {
      title: t('cuPotsTitle'),
      help: t('cuPotsHelp'),
      sets: [
        {
          key: 'pots',
          label: t('cuPots'),
          options: [
            {
              value: 'official',
              label: t('optOfficialPots'),
              desc: hasOfficialPots
                ? t('optOfficialPotsDesc', { year: contestYear })
                : t('optOfficialPotsMissingDesc'),
            },
            {
              value: 'history',
              label: t('optHistoryPots'),
              desc: t('optHistoryPotsDesc'),
            },
            {
              value: 'custom',
              label: t('optCustomPots'),
              desc: t('optCustomPotsDesc'),
            },
            { value: 'none', label: t('optNoPots'), desc: t('optNoPotsDesc') },
          ],
          extra:
            rules.pots === 'custom' ? (
              <div className="flex flex-col gap-[7px] mt-2.5 2cols:ml-[37px]">
                {(rules.customPots ?? []).map((pot, i) => (
                  <div
                    // Pots have no identity of their own; their index is their name.
                    // eslint-disable-next-line react/no-array-index-key
                    key={i}
                    className={`dp-dw-lane ${
                      dropPot === i ? 'is-hl' : ''
                    } rounded-[10px] px-2 py-[7px]`}
                    onDragOver={(e) => {
                      if (!dragCode) return;
                      e.preventDefault();
                      if (dropPot !== i) setDropPot(i);
                    }}
                    onDragLeave={() => {
                      if (dropPot === i) setDropPot(null);
                    }}
                    onDrop={(e) => {
                      if (!dragCode) return;
                      e.preventDefault();
                      moveToPot(dragCode, i);
                      setDragCode(null);
                      setDropPot(null);
                    }}
                  >
                    <div className="flex items-center gap-2 text-xs min-h-[26px]">
                      <b className="text-white">
                        {t('pot', { number: i + 1 })}
                      </b>
                      <span className="text-white/70 font-bold">
                        {pot.length}
                      </span>
                      {(rules.customPots?.length ?? 0) > 1 && (
                        <button
                          type="button"
                          aria-label={t('removePot', { number: i + 1 })}
                          title={t('removePot', { number: i + 1 })}
                          className="dp-icon-btn ml-auto w-7 h-7 rounded-lg grid place-items-center"
                          onClick={() => {
                            const pots = (rules.customPots ?? []).map((p) => [
                              ...p,
                            ]);
                            const [removed] = pots.splice(i, 1);

                            pots[Math.max(0, i - 1)].push(...removed);
                            setRules({ customPots: pots });
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-[5px] mt-1">
                      {pot.length === 0 && (
                        <span className="text-xs font-semibold text-white/70 p-1">
                          {t('dropCountriesHere')}
                        </span>
                      )}
                      {pot.map((code) => (
                        <button
                          key={code}
                          type="button"
                          title={nameOf(code)}
                          draggable
                          onDragStart={(e) => {
                            setDragCode(code);
                            e.dataTransfer.effectAllowed = 'move';
                            try {
                              e.dataTransfer.setData('text/plain', code);
                            } catch {
                              // some browsers refuse setData on synthetic drags
                            }
                          }}
                          onDragEnd={() => {
                            setDragCode(null);
                            setDropPot(null);
                          }}
                          className="dp-dw-vf !h-[26px] hover:border-hair-2 cursor-grab"
                          onClick={(e) =>
                            setPotMenu({
                              code,
                              from: i,
                              anchor: e.currentTarget,
                            })
                          }
                        >
                          <DrawFlag
                            src={flagSrcOf(code)}
                            className="w-4 h-[15px]"
                          />
                          <span>{nameOf(code)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div>
                  <Button
                    variant="surface"
                    size="sm"
                    Icon={<Plus className="size-[15px]" />}
                    onClick={() =>
                      setRules({
                        customPots: [...(rules.customPots ?? []), []],
                      })
                    }
                  >
                    {t('addPot')}
                  </Button>
                </div>
              </div>
            ) : null,
        },
        {
          key: 'split',
          label: t('cuSplit'),
          disabled: rules.pots === 'none',
          options: [
            {
              value: 'even',
              label: t('optSplitEven'),
              desc: t('optSplitEvenDesc'),
            },
            {
              value: 'random',
              label: t('optSplitRandom'),
              desc: t('optSplitRandomDesc'),
            },
          ],
        },
      ],
    },
    {
      title: t('cuSemisTitle'),
      sets: [
        ...(drawableSemis.length >= 3
          ? [
              {
                key: 'semis' as RuleKey,
                label: t('cuSemis'),
                options: [
                  { value: 'all', label: t('optAllSemis') },
                  {
                    value: 'choose',
                    label: t('optChooseSemis'),
                    desc: t('optChooseSemisDesc'),
                  },
                ],
                extra:
                  rules.semis === 'choose' ? (
                    <div className="flex flex-col gap-2 mt-2 2cols:ml-[37px]">
                      {drawableSemis.map((s) => {
                        const on = rules.semisPick[s.id] !== false;

                        return (
                          <button
                            key={s.id}
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            className="flex gap-[9px] items-center text-[13px] font-bold text-white text-left"
                            onClick={() =>
                              setRules({
                                semisPick: { ...rules.semisPick, [s.id]: !on },
                              })
                            }
                          >
                            <span
                              className={`dp-check w-[17px] h-[17px] rounded-[5px] grid place-items-center ${
                                on ? 'is-on' : ''
                              }`}
                            >
                              <Check className="size-3" strokeWidth={3} />
                            </span>
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : null,
              },
            ]
          : []),
        {
          key: 'sizes',
          label: t('cuSizes'),
          options: [
            {
              value: 'balanced',
              label: t('optBalanced'),
              desc: t('optBalancedDesc'),
            },
            { value: 'custom', label: t('optCustomSizes') },
          ],
          extra:
            rules.sizes === 'custom'
              ? (() => {
                  const current = sizesFor(input);
                  const sum = current.reduce((a, b) => a + b, 0);
                  const total = input.entrants.length;

                  return (
                    <div className="flex flex-col gap-2 mt-2 2cols:ml-[37px]">
                      {input.semis.map((s, i) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-2 text-[13px] font-bold text-white"
                        >
                          <span className="flex-1">{s.name}</span>
                          <button
                            type="button"
                            aria-label={t('fewerIn', { stage: s.name })}
                            className="dp-icon-btn w-7 h-7 rounded-lg grid place-items-center"
                            onClick={() =>
                              setRules({
                                sizesCustom: {
                                  ...rules.sizesCustom,
                                  [s.id]: Math.max(0, current[i] - 1),
                                },
                              })
                            }
                          >
                            <Minus className="size-[15px]" />
                          </button>
                          <b className="min-w-[26px] text-center tabular-nums">
                            {current[i]}
                          </b>
                          <button
                            type="button"
                            aria-label={t('moreIn', { stage: s.name })}
                            className="dp-icon-btn w-7 h-7 rounded-lg grid place-items-center"
                            onClick={() =>
                              setRules({
                                sizesCustom: {
                                  ...rules.sizesCustom,
                                  [s.id]: current[i] + 1,
                                },
                              })
                            }
                          >
                            <Plus className="size-[15px]" />
                          </button>
                        </div>
                      ))}
                      <p
                        className={`m-0 text-xs font-bold ${
                          sum === total
                            ? 'text-white/70'
                            : 'text-[var(--badge-red-ink)]'
                        }`}
                      >
                        {t('placedSummary', { sum, total })}
                      </p>
                    </div>
                  );
                })()
              : null,
        },
      ],
    },
    {
      title: t('cuOrderTitle'),
      sets: [
        {
          key: 'order',
          label: t('cuOrderTitle'),
          options: [
            {
              value: 'halves',
              label: t('optHalves'),
              desc: t('optHalvesDesc'),
            },
            {
              value: 'positions',
              label: t('optPositions'),
              desc: t('optPositionsDesc'),
            },
            { value: 'none', label: t('optNoOrder') },
          ],
        },
      ],
    },
    {
      title: t('cuPreqTitle'),
      help: t('cuPreqHelp'),
      sets: [
        {
          key: 'preq',
          label: t('cuPreqTitle'),
          options: [
            { value: 'drawn', label: t('optPreqDrawn') },
            { value: 'all', label: t('optPreqAll') },
            { value: 'none', label: t('optPreqNone') },
          ],
        },
      ],
    },
  ];

  return (
    <>
      <div
        className="absolute inset-0 z-20 bg-[rgb(5_3_12/.42)]"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        aria-label={t('drawRules')}
        data-draw-customize
        className={`dp-dw-cust ${
          entering ? 'is-entering' : ''
        } absolute top-0 right-0 bottom-0 w-full 2cols:w-[min(430px,100%)] z-[21] flex flex-col text-white`}
      >
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-hair">
          <button
            type="button"
            aria-label={t('backToDraw')}
            className="dp-icon-btn w-[34px] h-[34px] rounded-[9px] grid place-items-center flex-none"
            onClick={onClose}
          >
            <ArrowLeft className="size-[17px]" />
          </button>
          <div className="min-w-0">
            <h3 className="m-0 text-base font-extrabold tracking-[-.015em]">
              {t('drawRules')}
            </h3>
            <p className="m-0 mt-px text-xs font-bold text-white/70">
              {changes.length
                ? t('changesFromOfficial', { count: changes.length })
                : t('officialRules')}
            </p>
          </div>
          <button
            type="button"
            disabled={changes.length === 0}
            className="dp-accent-ink ml-auto inline-flex items-center gap-[5px] text-[12.5px] font-extrabold px-1.5 py-1 rounded-[7px] hover:bg-white/[0.08] disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap"
            onClick={() => {
              resetRules();
              toast.success(t('toastBackToOfficial'));
            }}
          >
            <RotateCcw className="size-3.5" />
            {t('resetToOfficial')}
          </button>
        </div>
        <div className="flex-1 overflow-auto px-4 pb-4 narrow-scrollbar">
          {optionSets.map((group) => (
            <section key={group.title} className="py-3.5 border-b border-hair">
              <h4 className="m-0 mb-[3px] flex items-center gap-2 text-sm font-extrabold tracking-[-.01em]">
                {group.title}
              </h4>
              {group.help && (
                <p className="m-0 mb-1 text-[12.5px] font-semibold text-white/70 text-pretty">
                  {group.help}
                </p>
              )}
              {group.sets.map((set) => {
                const changed = rules[set.key] !== OFFICIAL_RULES[set.key];

                return (
                  <div
                    key={set.key}
                    className={`mt-2.5 ${set.disabled ? 'opacity-50' : ''}`}
                  >
                    {group.sets.length > 1 && (
                      <h5 className="m-0 mb-[5px] flex items-center gap-2 text-[11px] font-extrabold tracking-[.07em] uppercase text-white/70">
                        {set.label}
                        {changed && (
                          <span className="dp-dw-changed">{t('changed')}</span>
                        )}
                      </h5>
                    )}
                    {group.sets.length === 1 && changed && (
                      <span className="dp-dw-changed mb-1.5 inline-flex">
                        {t('changed')}
                      </span>
                    )}
                    <div
                      role="radiogroup"
                      aria-label={set.label}
                      className="flex flex-col gap-[3px]"
                    >
                      {set.options.map((opt) => {
                        const on = rules[set.key] === opt.value;

                        return (
                          <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            disabled={set.disabled}
                            data-rule={set.key}
                            className={`dp-dw-opt ${
                              on ? 'is-on' : ''
                            } flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-left`}
                            onClick={() => setRule(set.key, opt.value)}
                          >
                            <Radio on={on} />
                            <span className="flex flex-col flex-1 min-w-0">
                              <b className="text-[13.5px] font-bold">
                                {opt.label}
                              </b>
                              {opt.desc && (
                                <em className="not-italic text-xs font-semibold text-white/70">
                                  {opt.desc}
                                </em>
                              )}
                            </span>
                            {OFFICIAL_RULES[set.key] === opt.value && (
                              <span className="flex-none text-[10.5px] font-extrabold px-[7px] py-0.5 rounded-md border border-hair-2 text-white/70">
                                {t('official')}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {set.extra}
                  </div>
                );
              })}
            </section>
          ))}
          <p className="flex gap-2 items-start mt-3.5 mb-0 text-[12.5px] font-semibold text-white/70 text-pretty">
            <span className="dp-accent-ink mt-px flex-none">
              <Check className="size-3.5" />
            </span>
            {t('cuNote')}
          </p>
        </div>
        <div className="px-4 py-3 border-t border-hair flex justify-end">
          <Button
            variant="cta"
            size="lg"
            className="!normal-case !tracking-normal px-[22px]"
            onClick={onClose}
          >
            {t('done')}
          </Button>
        </div>
      </aside>
      <AnchoredMenu
        open={!!potMenu}
        anchor={potMenu?.anchor ?? null}
        onClose={() => setPotMenu(null)}
        ariaLabel={t('cuPots')}
        items={
          potMenu
            ? [
                {
                  variant: 'header',
                  label: t('moveToPot', { name: nameOf(potMenu.code) }),
                },
                ...(rules.customPots ?? []).map((_, i) => ({
                  label: t('pot', { number: i + 1 }),
                  trailing:
                    i === potMenu.from ? (
                      <Check className="size-4 text-accent" />
                    ) : undefined,
                  disabled: i === potMenu.from,
                  onClick: () => moveToPot(potMenu.code, i),
                })),
              ]
            : []
        }
      />
    </>
  );
};

export default CustomizePanel;
