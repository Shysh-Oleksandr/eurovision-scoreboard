'use client';
import {
  Check,
  Dices,
  Keyboard,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  SlidersHorizontal,
  X,
  Zap,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-toastify';

import { useAllocationDrawContext } from './AllocationDrawContext';
import { applyDrawPlan, stagesWithVotes } from './applyDraw';
import CustomizePanel from './CustomizePanel';
import { DrawFixId, errorCopy, useDrawCopy } from './drawCopy';
import { flashTiles } from './drawUiStore';
import {
  LaneView,
  PotGroupView,
  PotsRegion,
  SemisRegion,
  Spotlight,
} from './DrawWindowParts';
import {
  DRAW_SPEED_LABELS,
  DRAW_SPEEDS,
  useDrawCeremony,
} from './useDrawCeremony';

import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import { getFlagPath } from '@/helpers/getFlagPath';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { getDrawableSemis } from '@/state/allocationDraw/drawInput';
import { countRuleChanges } from '@/state/allocationDraw/types';
import { useAllocationDrawStore } from '@/state/allocationDrawStore';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';

interface AllocationDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoaded?: () => void;
}

/**
 * The draw window: pots / spotlight / semis in one layout, with Ready,
 * Drawing, Done and Error states, the Customize drawer, keyboard control
 * (Space = Draw next, Esc = close) and a live region for every reveal.
 */
const AllocationDrawModal: React.FC<AllocationDrawModalProps> = ({
  isOpen,
  onClose,
  onLoaded,
}) => {
  const t = useTranslations('setup.allocationDraw');
  const draw = useAllocationDrawContext();
  const stages = useCountriesStore((s) => s.configuredEventStages);
  const allCountriesForYear = useCountriesStore((s) => s.allCountriesForYear);
  const contestName = useGeneralStore((s) => s.settings.contestName);
  const contestYear = useGeneralStore((s) => s.settings.contestYear);
  const shouldShowHeartFlagIcon = useGeneralStore(
    (s) => s.settings.shouldShowHeartFlagIcon,
  );
  const rules = useAllocationDrawStore((s) => s.rules);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customizeEntering, setCustomizeEntering] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const flyRef = useRef<HTMLDivElement | null>(null);
  const liveRef = useRef<HTMLDivElement | null>(null);

  useEffectOnce(onLoaded);

  const { input, byCode } = draw;
  const nameOf = useCallback(
    (code: string) => byCode.get(code)?.name ?? code,
    [byCode],
  );
  const stageName = useCallback(
    (id: string) => stages.find((s) => s.id === id)?.name ?? id,
    [stages],
  );
  const flagSrcOf = useCallback(
    (code: string) => {
      const country = byCode.get(code);

      if (!country) return getFlagPath('ww');

      return getHostingCountryLogo(country, shouldShowHeartFlagIcon).logo;
    },
    [byCode, shouldShowHeartFlagIcon],
  );
  const copy = useDrawCopy(nameOf, stageName);
  const dom = useMemo(
    () => ({
      root: () => rootRef.current,
      fly: () => flyRef.current,
      live: () => liveRef.current,
    }),
    [],
  );

  const ceremony = useDrawCeremony({
    open: isOpen,
    input,
    copy,
    flagSrcOf,
    dom,
  });
  const { state } = ceremony;
  const { phase, plan } = state;

  const close = useCallback(() => {
    ceremony.stopAll();
    setCustomizeOpen(false);
    onClose();
  }, [ceremony, onClose]);

  const openCustomize = useCallback(() => {
    setCustomizeEntering(true);
    setCustomizeOpen(true);
    window.setTimeout(() => setCustomizeEntering(false), 300);
  }, []);

  useEffect(() => {
    if (!isOpen) setCustomizeOpen(false);
  }, [isOpen]);

  // Keyboard: Space draws, Esc closes Customize then the window.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (customizeOpen) setCustomizeOpen(false);
        else close();

        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        if (
          target?.closest('input, textarea, select, [data-draw-customize]') ||
          customizeOpen
        ) {
          return;
        }
        if (phase === 'ready' || phase === 'drawing') {
          e.preventDefault();
          ceremony.next();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, customizeOpen, close, phase, ceremony]);

  // Focus the primary control of each state.
  useEffect(() => {
    if (!isOpen) return;

    // Button does not forward data attributes, so address the controls by
    // role: the footer's accent CTA (Start / Draw next / Apply) or the first fix.
    const id = window.setTimeout(() => {
      const selector =
        phase === 'error' ? '[role="alert"] button' : 'footer .dp-cta';

      rootRef.current
        ?.querySelector<HTMLElement>(selector)
        ?.focus({ preventScroll: true });
    }, 60);

    return () => window.clearTimeout(id);
  }, [isOpen, phase]);

  const semiIds = useMemo(() => input.semis.map((s) => s.id), [input.semis]);
  const withVotes = useMemo(
    () => (phase === 'done' ? stagesWithVotes(semiIds) : []),
    [phase, semiIds],
  );
  const votesWarning = withVotes.length
    ? t('votesWarning', {
        stages: copy.listNames(withVotes.map(stageName)),
        count: withVotes.length,
      })
    : null;

  const errorView = state.error ? errorCopy(copy, state.error, rules) : null;
  const changes = countRuleChanges(rules);
  const drawableSemis = useMemo(() => getDrawableSemis(stages), [stages]);
  const hasOfficialPots = useMemo(
    () => allCountriesForYear.some((c) => !!c.pot),
    [allCountriesForYear],
  );

  const groups = useMemo<PotGroupView[]>(() => {
    const out: PotGroupView[] = [];
    const byName = (a: string, b: string) => nameOf(a).localeCompare(nameOf(b));

    if (rules.preq === 'drawn') {
      const drawn = input.preq
        .filter((p) => p.votesIn === 'drawn')
        .map((p) => p.code);

      if (drawn.length) {
        out.push({
          key: 'preq',
          label: t('preQualified'),
          members: drawn.sort(byName),
          fixedCount: 0,
          isPreq: true,
        });
      }
    }

    const fixed = new Set(
      input.entrants.filter((e) => e.fixed).map((e) => e.code),
    );
    const pots =
      rules.pots === 'none'
        ? [{ members: input.entrants.map((e) => e.code) }]
        : input.pots;

    pots.forEach((pot, i) => {
      out.push({
        key: `pot${i}`,
        label:
          rules.pots === 'none'
            ? t('semiFinalists')
            : t('pot', { number: i + 1 }),
        members: pot.members.filter((c) => !fixed.has(c)).sort(byName),
        fixedCount: pot.members.filter((c) => fixed.has(c)).length,
        isPreq: false,
      });
    });

    return out;
  }, [input, nameOf, rules.pots, rules.preq, t]);

  const taken = useMemo(() => {
    const set = new Set(Object.keys(state.placed));

    Object.values(state.votes).forEach((codes) =>
      codes.forEach((c) => set.add(c)),
    );

    return set;
  }, [state.placed, state.votes]);

  const laneDefs = useCallback(
    (stageId: string, size: number): LaneView[] => {
      if (rules.order === 'halves') {
        return [
          {
            key: `${stageId}-1`,
            label: t('firstHalf'),
            size: Math.floor(size / 2),
            numbered: false,
          },
          {
            key: `${stageId}-2`,
            label: t('secondHalf'),
            size: Math.ceil(size / 2),
            numbered: false,
          },
        ];
      }

      return [
        {
          key: `${stageId}-0`,
          label:
            rules.order === 'positions'
              ? t('runningOrderLane')
              : t('countriesLane'),
          size,
          numbered: rules.order === 'positions',
        },
      ];
    },
    [rules.order, t],
  );

  const sizes = useMemo(
    () => (plan ? plan.sizes : draw.sizes),
    [plan, draw.sizes],
  );

  const onFix = useCallback(
    (id: DrawFixId) => {
      const err = state.error;
      const store = useAllocationDrawStore.getState();

      switch (id) {
        case 'show-lineup':
        case 'back-lineup': {
          const codes = err && 'codes' in err ? err.codes : [];
          const stageId = err && 'stageId' in err ? err.stageId : null;

          close();
          if (codes.length) flashTiles({ stageId, codes });

          return;
        }
        case 'open-customize':
          openCustomize();

          return;
        case 'fix-split':
          store.setRules({ split: 'random' });
          break;
        case 'fix-preq':
          store.setRules({ preq: 'all' });
          break;
        case 'fix-sizes':
          store.setRules({ sizes: 'balanced' });
          break;
        case 'fix-semis':
          store.setRules({ semis: 'all' });
          break;
        default:
          return;
      }
      toast.info(t('toastRuleChanged'));
    },
    [close, openCustomize, state.error, t],
  );

  const apply = useCallback(() => {
    if (!plan) return;

    ceremony.stopAll();
    applyDrawPlan(plan, input);
    onClose();
    toast.success(t('toastApplied'));
  }, [ceremony, input, onClose, plan, t]);

  const subLine = `${t('windowSub', {
    contest: `${contestName} ${contestYear}`.trim(),
    count: input.entrants.length,
  })}${
    input.preq.length
      ? ` · ${t('windowSubPreq', { count: input.preq.length })}`
      : ''
  }`;

  const header = (
    <header className="flex flex-wrap md:flex-nowrap items-center gap-2.5 md:gap-3 px-3.5 py-3 2cols:px-[18px] 2cols:py-3.5 border-b border-hair text-white">
      <span className="dp-dice-badge w-10 h-10 rounded-xl grid place-items-center flex-none">
        <Dices className="size-5" />
      </span>
      <div className="min-w-0 flex-1 md:flex-none">
        <h2 className="m-0 text-lg font-extrabold tracking-[-.02em]">
          {t('title')}
        </h2>
        <p className="m-0 mt-px text-xs font-bold text-white/70 truncate">
          {subLine}
        </p>
      </div>
      <button
        type="button"
        data-dw="cust"
        disabled={phase === 'drawing'}
        aria-expanded={customizeOpen}
        onClick={() =>
          customizeOpen ? setCustomizeOpen(false) : openCustomize()
        }
        className={`dp-dw-rules-chip ${
          changes ? 'is-custom' : ''
        } order-3 md:order-none basis-full md:basis-auto justify-center md:ml-auto flex items-center gap-2 h-9 2cols:h-[38px] px-3.5 rounded-full text-[12.5px] font-extrabold whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none`}
      >
        {changes ? (
          <SlidersHorizontal className="size-3.5" />
        ) : (
          <Check className="size-3.5" />
        )}
        <span>
          {changes ? t('customRules', { count: changes }) : t('officialRules')}
        </span>
        <span className="dp-accent-ink underline underline-offset-[3px]">
          {t('customize')}
        </span>
      </button>
      <button
        type="button"
        onClick={close}
        aria-label={t('closeDraw')}
        className="dp-icon-btn w-10 h-10 rounded-xl grid place-items-center flex-none ml-auto md:ml-0"
      >
        <X className="size-[18px]" />
      </button>
    </header>
  );

  const footer = (
    <>
      <footer className="dp-dw-foot flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 md:gap-3 px-3 pt-2.5 pb-[calc(14px+var(--modal-safe-bottom,0px))] 2cols:px-[18px] 2cols:py-3 text-white">
        {(phase === 'ready' || phase === 'error') && (
          <>
            <div className="hidden md:flex items-center gap-[7px] text-[12.5px] font-bold text-white/70 min-w-0">
              {phase === 'ready' && (
                <>
                  <Keyboard className="size-4" />
                  {t('spaceHint')}
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="cta"
                size="lg"
                className="order-first basis-full md:basis-auto md:order-last justify-center !normal-case !tracking-normal h-[50px] md:!h-[42px]"
                disabled={phase === 'error'}
                Icon={<Play className="size-4" />}
                onClick={() => ceremony.start(true)}
              >
                {t('startTheDraw')}
              </Button>
              <Button
                variant="surface"
                size="md"
                className="flex-1 justify-center md:flex-none !h-[42px]"
                disabled={phase === 'error'}
                Icon={<Zap className="size-4" />}
                onClick={ceremony.instant}
              >
                {t('instantResult')}
              </Button>
            </div>
          </>
        )}
        {phase === 'drawing' && (
          <>
            <div className="flex items-center justify-between md:justify-start gap-2">
              <span
                className="text-[13px] font-extrabold tabular-nums md:min-w-[118px]"
                aria-hidden="true"
              >
                {state.group
                  ? `${
                      state.group.kind === 'preq'
                        ? t('preQualified')
                        : t('pot', { number: (state.group.potIndex ?? 0) + 1 })
                    } · `
                  : ''}
                {t('progress', {
                  done: ceremony.progress.done,
                  total: ceremony.progress.total,
                })}
              </span>
              <div
                role="group"
                aria-label={t('speed')}
                className="dp-dw-seg flex gap-[3px] p-[3px] rounded-[10px]"
              >
                {DRAW_SPEEDS.map((speed, i) => (
                  <button
                    key={speed}
                    type="button"
                    aria-pressed={state.speedIndex === i}
                    className={`${
                      state.speedIndex === i ? 'is-on' : ''
                    } px-2.5 py-1.5 rounded-[7px] text-[12.5px] font-extrabold text-white/70`}
                    onClick={() => ceremony.setSpeedIndex(i)}
                  >
                    {DRAW_SPEED_LABELS[i]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="cta"
                size="lg"
                className="order-first basis-full md:basis-auto md:order-last justify-center !normal-case !tracking-normal h-[50px] md:!h-[42px]"
                Icon={<Dices className="size-4" />}
                onClick={ceremony.next}
              >
                {t('drawNext')}
                <kbd className="hidden md:inline text-[10.5px] font-extrabold tracking-[.04em] px-1.5 py-0.5 rounded-[5px] bg-black/25 ml-0.5">
                  Space
                </kbd>
              </Button>
              <Button
                variant="surface"
                size="md"
                aria-pressed={state.auto}
                className={`flex-1 justify-center md:flex-none !h-[42px] ${
                  state.auto ? 'is-on' : ''
                }`}
                Icon={
                  state.auto ? (
                    <Pause className="size-4" />
                  ) : (
                    <Play className="size-4" />
                  )
                }
                onClick={() => ceremony.setAuto(!state.auto)}
              >
                {state.auto ? t('pause') : t('autoPlay')}
              </Button>
              <Button
                variant="surface"
                size="md"
                className="flex-1 justify-center md:flex-none !h-[42px]"
                Icon={<SkipForward className="size-4" />}
                onClick={ceremony.finish}
              >
                {t('skipToResult')}
              </Button>
            </div>
          </>
        )}
        {phase === 'done' && (
          <>
            <div className="hidden md:block">
              <Button
                variant="surface"
                size="md"
                className="!h-[42px]"
                onClick={close}
              >
                <CloseLabel />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="cta"
                size="lg"
                className="order-first basis-full md:basis-auto md:order-last justify-center !normal-case !tracking-normal h-[50px] md:!h-[42px]"
                Icon={<Check className="size-4" />}
                onClick={apply}
              >
                {votesWarning ? t('applyAndResetVotes') : t('applyToLineup')}
              </Button>
              <Button
                variant="surface"
                size="md"
                className="flex-1 justify-center md:flex-none !h-[42px]"
                Icon={<RotateCcw className="size-4" />}
                onClick={() => {
                  ceremony.redraw();
                  toast.info(t('toastNewDraw'));
                }}
              >
                {t('redraw')}
              </Button>
            </div>
          </>
        )}
      </footer>
      <div ref={liveRef} className="sr-only" aria-live="polite" />
      {customizeOpen && (
        <CustomizePanel
          input={input}
          rules={rules}
          drawableSemis={drawableSemis}
          hasOfficialPots={hasOfficialPots}
          contestYear={contestYear}
          entering={customizeEntering}
          nameOf={nameOf}
          flagSrcOf={flagSrcOf}
          onClose={() => setCustomizeOpen(false)}
        />
      )}
      <div
        ref={flyRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-30 overflow-hidden"
      />
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      ref={rootRef}
      overlayClassName="!z-[1001]"
      containerClassName="dp-hub dp-dw-surface 2cols:!w-[calc(100%-2.5rem)] !max-w-[1240px] !mx-0 !rounded-2xl"
      contentClassName="!px-3 !py-3 2cols:!px-[18px] 2cols:!py-3.5 flex flex-col gap-2.5 narrow-scrollbar 2cols:!h-[calc(100dvh-180px)] 2cols:!min-h-[380px] 2cols:!max-h-[760px]"
      unstyledSurface
      fullScreenOnPhone
      withBlur
      topContent={header}
      bottomContent={footer}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
        className="contents"
      >
        <PotsRegion
          groups={groups}
          phase={phase}
          activeKey={state.group?.key ?? null}
          taken={taken}
          errorPotIndex={
            state.error && state.error.kind === 'potFixed'
              ? state.error.potIndex
              : null
          }
          nameOf={nameOf}
          flagSrcOf={flagSrcOf}
        />
        <Spotlight
          phase={phase}
          input={input}
          plan={plan}
          error={errorView}
          group={state.group}
          last={state.last}
          copy={copy}
          flagSrcOf={flagSrcOf}
          votesWarning={votesWarning}
          onFix={onFix}
        />
        <SemisRegion
          phase={phase}
          input={input}
          rules={rules}
          sizes={sizes}
          placed={state.placed}
          votes={state.votes}
          error={state.error}
          laneDefs={laneDefs}
          nameOf={nameOf}
          flagSrcOf={flagSrcOf}
        />
      </div>
    </Modal>
  );
};

const CloseLabel = () => {
  const t = useTranslations('common');

  return <>{t('close')}</>;
};

export default AllocationDrawModal;
