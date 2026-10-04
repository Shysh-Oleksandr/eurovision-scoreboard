'use client';
import {
  ArrowRight,
  Check,
  Layers,
  ListOrdered,
  Pin,
  TriangleAlert,
  Vote,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { memo } from 'react';

import type { DrawCopyContext, DrawErrorCopy, DrawFixId } from './drawCopy';
import { captionFor, groupLabel, groupText, introLines } from './drawCopy';
import {
  CeremonyState,
  DrawPhase,
  Placement,
  SLOT_GHOST_SRC,
} from './useDrawCeremony';

import Button from '@/components/common/Button';
import type {
  DrawError,
  DrawInput,
  DrawPlan,
  DrawRules,
} from '@/state/allocationDraw/types';

/* ------------------------------------------------------------------ flags */

export const DrawFlag: React.FC<{
  src: string;
  className?: string;
  'data-attr'?: Record<string, string>;
}> = ({ src, className = '' }) => (
  <img
    src={src}
    alt=""
    aria-hidden="true"
    loading="lazy"
    decoding="async"
    className={`flex-none object-contain ${className}`}
  />
);

/* ------------------------------------------------------------------- pots */

export interface PotGroupView {
  key: string;
  label: string;
  members: string[];
  fixedCount: number;
  isPreq: boolean;
}

interface PotsRegionProps {
  groups: PotGroupView[];
  phase: DrawPhase;
  activeKey: string | null;
  taken: ReadonlySet<string>;
  errorPotIndex: number | null;
  nameOf: (code: string) => string;
  flagSrcOf: (code: string) => string;
}

export const PotsRegion = memo(function PotsRegion({
  groups,
  phase,
  activeKey,
  taken,
  errorPotIndex,
  nameOf,
  flagSrcOf,
}: PotsRegionProps) {
  const t = useTranslations('setup.allocationDraw');
  const idle = phase === 'ready' || phase === 'error';

  return (
    <section
      aria-label={t('cuPots')}
      className="flex-none flex items-start 2cols:items-stretch gap-[7px] overflow-x-auto -mx-3 px-3 pb-0.5 [scrollbar-width:none] 2cols:grid 2cols:grid-flow-col 2cols:auto-cols-[minmax(150px,1fr)] 2cols:gap-2.5 2cols:mx-0 2cols:px-0 2cols:pb-1 2cols:[scrollbar-width:thin]"
    >
      {groups.map((group, gi) => {
        const left = group.members.filter((c) => !taken.has(c)).length;
        const isErr =
          errorPotIndex !== null &&
          !group.isPreq &&
          gi - (groups[0]?.isPreq ? 1 : 0) === errorPotIndex;

        return (
          <div
            key={group.key}
            data-pg={group.key}
            className={`dp-dw-pg ${group.isPreq ? 'dp-dw-pg--preq' : ''} ${
              phase === 'drawing' && activeKey === group.key ? 'is-active' : ''
            } ${left === 0 && !idle ? 'is-done' : ''} ${
              isErr ? 'is-err' : ''
            } flex-none rounded-xl px-2 py-[7px] 2cols:px-2.5 2cols:py-[9px] min-w-0 h-full`}
          >
            <div className="flex justify-between items-baseline gap-1.5 mb-[5px] 2cols:mb-1.5">
              <span className="text-[11px] font-extrabold tracking-[.08em] uppercase whitespace-nowrap truncate min-w-0 text-white">
                {group.label}
              </span>
              <span className="text-[11px] font-bold text-white/70 whitespace-nowrap tabular-nums">
                {idle
                  ? group.fixedCount > 0
                    ? t('potCountFixed', {
                        count: group.members.length,
                        fixed: group.fixedCount,
                      })
                    : group.members.length
                  : left > 0
                  ? t('left', { count: left })
                  : t('done')}
              </span>
            </div>
            <div className="grid grid-cols-[repeat(3,22px)] gap-[5px] 2cols:flex 2cols:flex-col 2cols:gap-[3px]">
              {group.members.map((code) => (
                <span
                  key={code}
                  data-pc={code}
                  title={nameOf(code)}
                  className={`dp-dw-pc ${
                    taken.has(code) ? 'is-taken' : ''
                  } flex items-center gap-[7px] 2cols:h-[19px] min-w-0 text-xs font-bold text-white`}
                >
                  <DrawFlag
                    src={flagSrcOf(code)}
                    className="w-[22px] h-5 2cols:w-[18px] 2cols:h-[17px]"
                  />
                  <span className="hidden 2cols:block truncate">
                    {nameOf(code)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
});

/* -------------------------------------------------------------- spotlight */

interface SpotlightProps {
  phase: DrawPhase;
  input: DrawInput;
  plan: DrawPlan | null;
  error: DrawErrorCopy | null;
  group: CeremonyState['group'];
  last: CeremonyState['last'];
  copy: DrawCopyContext;
  flagSrcOf: (code: string) => string;
  votesWarning: string | null;
  onFix: (id: DrawFixId) => void;
}

const introIcon = {
  pots: Layers,
  order: ListOrdered,
  vote: Vote,
  pin: Pin,
};

export const Spotlight = memo(function Spotlight({
  phase,
  input,
  plan,
  error,
  group,
  last,
  copy,
  flagSrcOf,
  votesWarning,
  onFix,
}: SpotlightProps) {
  const t = useTranslations('setup.allocationDraw');

  if (phase === 'error' && error) {
    return (
      <section className="flex-none min-h-[104px] 2cols:min-h-[124px] flex items-center justify-center">
        <div
          role="alert"
          className="dp-dw-err w-full max-w-[700px] flex gap-2.5 2cols:gap-3.5 p-3.5 2cols:px-[18px] 2cols:py-4 rounded-[14px]"
        >
          <TriangleAlert className="size-[22px] flex-none mt-0.5 text-[var(--badge-red-ink)]" />
          <div className="min-w-0">
            <h3 className="m-0 text-[17px] font-extrabold tracking-[-.015em] text-white">
              {error.title}
            </h3>
            <p className="mt-[5px] mb-0 text-[13.5px] font-semibold text-white/70 leading-[1.45] text-pretty">
              {error.text}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {error.fixes.map((fix) => (
                <Button
                  key={fix.id}
                  variant={fix.primary ? 'cta' : 'surface'}
                  size="sm"
                  className={fix.primary ? '!normal-case !tracking-normal' : ''}
                  onClick={() => onFix(fix.id)}
                >
                  {fix.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (phase === 'ready') {
    return (
      <section className="flex-none min-h-[104px] 2cols:min-h-[124px] flex items-center justify-center">
        <div className="w-full max-w-[660px]">
          <h3 className="m-0 mb-2.5 text-lg 2cols:text-[22px] font-extrabold tracking-[-.02em] text-center text-white">
            {t('readyHeading', {
              count: input.entrants.length,
              semis: input.semis.length,
            })}
          </h3>
          <ul className="list-none p-0 m-0 grid gap-[5px]">
            {introLines(copy, input).map((line) => {
              const Icon = introIcon[line.icon];

              return (
                <li
                  key={line.text}
                  className="flex gap-2.5 items-start text-[13px] 2cols:text-sm font-semibold text-white/70 leading-[1.4] text-pretty"
                >
                  <Icon className="dp-accent-ink size-[17px] flex-none mt-px" />
                  <span>{line.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    );
  }

  if (phase === 'done' && plan) {
    return (
      <section className="flex-none min-h-[104px] 2cols:min-h-[124px] flex items-center justify-center">
        <div className="flex flex-wrap items-center justify-start 2cols:justify-center gap-x-4 gap-y-3.5 max-w-[720px]">
          <span className="dp-dw-done-ic w-12 h-12 rounded-full grid place-items-center flex-none">
            <Check className="size-[22px]" strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <h3 className="m-0 text-lg 2cols:text-[22px] font-extrabold tracking-[-.02em] text-white">
              {t('drawComplete')}
            </h3>
            <p className="mt-[3px] mb-0 text-[13px] font-bold text-white/70">
              {input.semis
                .map((s) => `${s.name}: ${plan.sizes[s.id]}`)
                .join(' · ')}
            </p>
          </div>
          {votesWarning && (
            <div
              role="status"
              className="dp-dw-warn basis-full flex gap-2 items-center justify-center px-3 py-[9px] rounded-[10px] text-[13px] font-bold text-white text-pretty"
            >
              <TriangleAlert className="size-4 flex-none text-[var(--badge-amber-ink)]" />
              <span>{votesWarning}</span>
            </div>
          )}
        </div>
      </section>
    );
  }

  // Drawing: the GSAP timelines mutate these nodes; React re-renders them to the same values.
  const stepName = last ? copy.nameOf(last.code) : '';
  const [capSemi, capHalf] = last ? captionFor(copy, last) : ['', ''];

  return (
    <section className="flex-none min-h-[104px] 2cols:min-h-[124px] flex items-center justify-center">
      <div className="w-full flex flex-col items-center gap-2">
        <div
          data-spot="group"
          className="flex flex-wrap items-center justify-center gap-1.5 2cols:gap-[9px] min-h-[22px] text-xs 2cols:text-[13px] font-bold text-white/70 text-center text-pretty"
        >
          <b
            data-spot="group-pill"
            className="dp-dw-group-pill flex-none text-white text-[11px] font-extrabold tracking-[.08em] uppercase px-[9px] py-[3px] rounded-full"
          >
            {group ? groupLabel(copy, group, input.rules) : ''}
          </b>
          <span data-spot="group-text">
            {group ? groupText(copy, group, input) : ''}
          </span>
        </div>
        <div className="flex items-center gap-3 2cols:gap-[18px] min-h-16 2cols:min-h-[84px]">
          <img
            data-spot="flag"
            src={last ? flagSrcOf(last.code) : SLOT_GHOST_SRC}
            alt=""
            aria-hidden="true"
            className={`flex-none object-contain w-[62px] h-[57px] 2cols:w-[88px] 2cols:h-[81px] ${
              last ? 'is-settled' : ''
            }`}
            style={{ opacity: last ? 0.28 : 0 }}
          />
          <div className="flex flex-col gap-1.5 min-w-0 2cols:min-w-[220px]">
            <div
              data-spot="name"
              className="text-[22px] 2cols:text-[30px] font-extrabold tracking-[-.025em] min-h-7 2cols:min-h-[38px] leading-[1.2] text-white"
            >
              {stepName}
            </div>
            <div
              data-spot="cap"
              className="flex flex-wrap items-center gap-2 min-h-[26px] 2cols:min-h-[30px]"
            >
              <span
                data-spot="cap-semi"
                className="dp-dw-chip-semi inline-flex items-center gap-1.5 h-[26px] 2cols:h-[30px] px-2.5 2cols:px-3 rounded-full text-[12.5px] 2cols:text-sm font-extrabold whitespace-nowrap text-white"
                style={{ opacity: last ? 1 : 0 }}
              >
                <ArrowRight className="size-4" />
                <span data-spot="cap-semi-text">{capSemi}</span>
              </span>
              <span
                data-spot="cap-half"
                className="dp-dw-chip-half inline-flex items-center h-[26px] 2cols:h-[30px] px-2.5 2cols:px-3 rounded-full text-[12.5px] 2cols:text-sm font-extrabold whitespace-nowrap text-white"
                style={{
                  display: capHalf ? '' : 'none',
                  opacity: last ? 1 : 0,
                }}
              >
                {capHalf}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

/* ------------------------------------------------------------------ semis */

export interface LaneView {
  key: string;
  label: string;
  size: number;
  numbered: boolean;
}

interface SemisRegionProps {
  phase: DrawPhase;
  input: DrawInput;
  rules: DrawRules;
  sizes: Record<string, number>;
  placed: Record<string, Placement>;
  votes: Record<string, string[]>;
  error: DrawError | null;
  laneDefs: (stageId: string, size: number) => LaneView[];
  nameOf: (code: string) => string;
  flagSrcOf: (code: string) => string;
}

export const SemisRegion = memo(function SemisRegion({
  phase,
  input,
  rules,
  sizes,
  placed,
  votes,
  error,
  laneDefs,
  nameOf,
  flagSrcOf,
}: SemisRegionProps) {
  const t = useTranslations('setup.allocationDraw');
  const idle = phase === 'ready' || phase === 'error';
  const done = phase === 'done';
  const placedByLane = new Map<string, Map<number, [string, Placement]>>();

  Object.entries(placed).forEach(([code, p]) => {
    if (!placedByLane.has(p.lane)) placedByLane.set(p.lane, new Map());
    placedByLane.get(p.lane)!.set(p.slot, [code, p]);
  });

  return (
    <section
      aria-label={t('cuSemisTitle')}
      className="flex-none grid gap-2 2cols:gap-3 content-start"
      style={{
        gridTemplateColumns: `repeat(${Math.max(
          1,
          input.semis.length,
        )}, minmax(0, 1fr))`,
      }}
    >
      {input.semis.map((semi) => {
        const size = sizes[semi.id] ?? 0;
        const fixedLeft = input.entrants.filter(
          (e) => e.fixed === semi.id && !(e.code in placed),
        );
        const placedCount = Object.values(placed).filter(
          (p) => p.stageId === semi.id,
        ).length;
        const voteList =
          rules.preq === 'none'
            ? null
            : votes[semi.id] ??
              (rules.preq === 'all'
                ? input.preq.map((p) => p.code)
                : input.preq
                    .filter((p) => p.votesIn === semi.id)
                    .map((p) => p.code));
        const isErr =
          !!error && 'stageId' in error && error.stageId === semi.id;
        const errCodes = new Set(isErr && 'codes' in error ? error.codes : []);
        const pinnedVoters = new Set(
          input.preq.filter((p) => p.votesIn === semi.id).map((p) => p.code),
        );

        return (
          <div
            key={semi.id}
            data-panel={semi.id}
            className={`dp-dw-sp ${
              isErr ? 'is-err' : ''
            } rounded-[14px] p-[9px] 2cols:px-3 2cols:py-2.5 min-w-0`}
          >
            <div className="flex flex-col items-start 2cols:flex-row 2cols:justify-between 2cols:items-baseline gap-0 2cols:gap-2 mb-1 2cols:mb-1.5">
              <span className="text-sm 2cols:text-base font-extrabold tracking-[-.02em] text-white">
                {semi.name}
              </span>
              <span className="text-[11px] 2cols:text-xs font-bold text-white/70 tabular-nums whitespace-nowrap">
                {idle
                  ? t('countries', { count: size })
                  : t('ofTotal', { placed: placedCount, total: size })}
              </span>
            </div>

            {voteList && (
              <div className="flex items-center gap-1.5 2cols:gap-2.5 min-h-[30px] 2cols:min-h-8 py-[3px] border-t border-hair">
                <span className="flex items-center gap-1 2cols:gap-1.5 flex-none 2cols:min-w-[100px] whitespace-nowrap text-[10px] 2cols:text-[11px] font-extrabold tracking-[.06em] uppercase text-white/70">
                  <Vote className="size-3.5" />
                  {t('votesHere')}
                </span>
                <div
                  data-vl={semi.id}
                  className="flex flex-wrap gap-1 2cols:gap-1.5 min-w-0"
                >
                  {voteList.length === 0 && (
                    <span
                      data-vl-empty
                      className="text-xs font-semibold text-white/70"
                    >
                      {t('drawnFirst')}
                    </span>
                  )}
                  {voteList.map((code) => (
                    <span
                      key={code}
                      title={nameOf(code)}
                      className={`dp-dw-vf dp-dw-vf--compact ${
                        pinnedVoters.has(code) ? 'is-fx' : ''
                      } ${errCodes.has(code) ? 'is-bad' : ''}`}
                    >
                      <DrawFlag
                        src={flagSrcOf(code)}
                        className="w-[22px] h-5 2cols:w-[18px] 2cols:h-[17px]"
                      />
                      <span className="hidden 2cols:inline">
                        {nameOf(code)}
                      </span>
                    </span>
                  ))}
                  <span
                    data-vl-pending
                    className="dp-dw-vf dp-dw-vf--compact"
                    style={{ display: 'none' }}
                    aria-hidden="true"
                  >
                    <img
                      src={SLOT_GHOST_SRC}
                      alt=""
                      className="flex-none object-contain w-[22px] h-5 2cols:w-[18px] 2cols:h-[17px]"
                    />
                    <span data-vl-name className="hidden 2cols:inline" />
                  </span>
                </div>
              </div>
            )}

            {fixedLeft.length > 0 && (
              <div className="flex items-center gap-1.5 2cols:gap-2.5 min-h-[30px] 2cols:min-h-8 py-[3px] border-t border-hair">
                <span className="flex items-center gap-1 2cols:gap-1.5 flex-none 2cols:min-w-[100px] whitespace-nowrap text-[10px] 2cols:text-[11px] font-extrabold tracking-[.06em] uppercase text-white/70">
                  <Pin className="size-3.5" />
                  {t('fixed')}
                </span>
                <div className="flex flex-wrap gap-1 2cols:gap-1.5 min-w-0">
                  {fixedLeft.map((e) => (
                    <span
                      key={e.code}
                      data-fx={e.code}
                      title={nameOf(e.code)}
                      className={`dp-dw-vf dp-dw-vf--compact is-fx ${
                        errCodes.has(e.code) ? 'is-bad' : ''
                      }`}
                    >
                      <DrawFlag
                        src={flagSrcOf(e.code)}
                        className="w-[22px] h-5 2cols:w-[18px] 2cols:h-[17px]"
                      />
                      <span className="hidden 2cols:inline">
                        {nameOf(e.code)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div
              className="grid gap-1.5 2cols:gap-2.5 mt-2 grid-cols-1"
              style={{ gridTemplateColumns: undefined }}
            >
              <div
                className={`grid gap-1.5 2cols:gap-2.5 ${
                  rules.order === 'halves' ? '2cols:grid-cols-2' : ''
                }`}
              >
                {laneDefs(semi.id, size).map((lane) => {
                  const slots = placedByLane.get(lane.key);

                  return (
                    <div
                      key={lane.key}
                      data-lane={lane.key}
                      className="dp-dw-lane rounded-[10px] p-1.5 2cols:p-2 min-w-0"
                    >
                      <div className="flex justify-between text-[10px] 2cols:text-[11px] font-extrabold tracking-[.06em] uppercase text-white/70 mb-1 2cols:mb-1.5">
                        {lane.label}
                        <span className="text-white/55">{lane.size}</span>
                      </div>
                      <div
                        className={`grid gap-1 ${
                          lane.numbered ? 'dp-dw-slots--columns' : ''
                        } ${
                          done
                            ? 'grid-cols-1 2cols:grid-cols-2'
                            : 'grid-cols-4 2cols:grid-cols-2'
                        }`}
                        style={
                          lane.numbered
                            ? ({
                                '--rows': Math.ceil(lane.size / 2),
                              } as React.CSSProperties)
                            : undefined
                        }
                      >
                        {Array.from({ length: lane.size }, (_, k) => {
                          const entry = slots?.get(k);
                          const code = entry?.[0];

                          return (
                            <span
                              key={k}
                              data-slot={`${lane.key}-${k}`}
                              title={code ? nameOf(code) : undefined}
                              className={`dp-dw-slot ${code ? 'is-on' : ''} ${
                                entry?.[1].fixed ? 'is-fx' : ''
                              } flex items-center gap-[7px] h-[30px] 2cols:h-[26px] rounded-[7px] 2cols:rounded-lg min-w-0 ${
                                done
                                  ? 'justify-start px-[5px] 2cols:pl-1.5 2cols:pr-2'
                                  : 'justify-center 2cols:justify-start 2cols:pl-1.5 2cols:pr-2'
                              }`}
                            >
                              {lane.numbered && (
                                <span className="hidden 2cols:block flex-none w-[17px] text-[10.5px] font-extrabold text-white/55 tabular-nums">
                                  {String(k + 1).padStart(2, '0')}
                                </span>
                              )}
                              <img
                                src={code ? flagSrcOf(code) : SLOT_GHOST_SRC}
                                alt=""
                                aria-hidden="true"
                                className={`flex-none object-contain rounded-[4px] ${
                                  code ? '' : 'dp-dw-ghost'
                                } ${
                                  done
                                    ? 'w-[17px] h-4 2cols:w-[18px] 2cols:h-[17px]'
                                    : 'w-[22px] h-5 2cols:w-[18px] 2cols:h-[17px]'
                                }`}
                              />
                              <span
                                data-slot-name
                                className={`${
                                  done
                                    ? 'block text-[11.5px] 2cols:text-xs'
                                    : 'hidden 2cols:block text-xs'
                                } font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis min-w-0`}
                              >
                                {code ? nameOf(code) : ''}
                              </span>
                              <Pin
                                data-slot-pin
                                className="dp-accent-ink hidden 2cols:block size-3 ml-auto flex-none"
                                style={{
                                  display: entry?.[1].fixed
                                    ? undefined
                                    : 'none',
                                }}
                              />
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
});
