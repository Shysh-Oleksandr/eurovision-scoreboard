'use client';
import { ArrowRight, ChevronDown, Dices, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useId, useRef, useState } from 'react';

import { CountryQualificationItem } from '../qualification/CountryQualificationItem';

import Popover from './Popover';
import { HostingLogo } from './SimHeader';
import { useSimViewStore } from './simViewStore';
import { usePhaseResults } from './usePhaseResults';
import { QualifiersState, useQualifierRandom } from './useQualifiers';
import { WindowFrame } from './VoterWindow';

import Button from '@/components/common/Button';
import { getFlagPath, handleFlagError } from '@/helpers/getFlagPath';
import { BaseCountry } from '@/models';
import { playHaptic } from '@/native/haptics';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { playThemeSound } from '@/theme/playThemeSound';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

/*
 * Pick qualifiers mode in the column layout. The window shows the latest
 * qualifier the way the standard mode shows the voter; the split screen
 * splits it into the candidates; once the stage is over it becomes the
 * qualifiers' flags, the broadcast's closing shot.
 */

const flagSrc = (country: BaseCountry) => getFlagPath(country, 'big-rectangle');

/** "4 of 10 qualified": the caption under the window, the peek and the stripe. */
export const useQualifiedCaption = (q: QualifiersState) => {
  const t = useTranslations('simulation.view');

  return t('qualifiedCount', { count: q.qualified.length, total: q.total });
};

// ---------------------------------------------------------------------------
// Split screen

/**
 * The split screen's candidates side by side, flush, like the broadcast's
 * green-room shots: tap one to qualify it. Mount one at a time (the window,
 * the sheet or the stripe's panel); it plays the theme's reveal sound and
 * the cards haptic as it appears.
 */
export const SplitTiles = ({
  candidates,
  className = '',
  small = false,
}: {
  candidates: BaseCountry[];
  className?: string;
  /** Phones and the stripe: smaller names. */
  small?: boolean;
}) => {
  const t = useTranslations('simulation');
  const pickQualifier = useScoreboardStore((state) => state.pickQualifier);
  const key = candidates.map((country) => country.code).join('|');
  const cuedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!key || cuedRef.current === key) return undefined;

    cuedRef.current = key;
    playHaptic({ id: 'qualifierCards', count: candidates.length });

    const id = window.setTimeout(() => playThemeSound('qualifierReveal'), 100);

    return () => window.clearTimeout(id);
  }, [key, candidates.length]);

  const grid =
    candidates.length === 4
      ? 'grid-cols-2 grid-rows-2'
      : candidates.length === 3
      ? 'grid-cols-3'
      : 'grid-cols-2';

  return (
    <div
      role="group"
      aria-label={t('chooseCountryToQualify')}
      className={`dp-sim-tiles grid ${grid} ${className}`}
    >
      {candidates.map((country, index) => (
        <button
          key={country.code}
          type="button"
          onClick={() => pickQualifier(country.code)}
          className="dp-sim-tile dp-sim-tile-in group relative min-h-0 overflow-hidden text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
          style={{ animationDelay: `${index * 90}ms` }}
        >
          <img
            src={flagSrc(country)}
            onError={(e) => handleFlagError(e.currentTarget, country)}
            alt=""
            className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <span
            className={`dp-sim-tile-name absolute inset-x-0 bottom-0 truncate font-extrabold uppercase tracking-[-0.01em] text-white ${
              small ? 'px-2 py-1.5 text-[11.5px]' : 'px-3 py-2 text-[13px]'
            }`}
          >
            {country.name}
          </span>
        </button>
      ))}
    </div>
  );
};

/** The qualifiers' flags in a grid: at most two rows, five across for ten. */
export const QualifiersFlagGrid = ({
  countries,
  className = '',
}: {
  countries: BaseCountry[];
  className?: string;
}) => {
  const rows = countries.length <= 5 ? 1 : countries.length <= 12 ? 2 : 3;
  const columns = Math.max(1, Math.ceil(countries.length / rows));

  return (
    <div
      aria-hidden="true"
      className={`dp-sim-tiles grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      {countries.map((country, index) => (
        <img
          key={country.code}
          src={flagSrc(country)}
          onError={(e) => handleFlagError(e.currentTarget, country)}
          alt=""
          className="dp-sim-tile-in size-full object-cover"
          style={{ animationDelay: `${index * 50}ms` }}
        />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// The window (desktop column)

/**
 * Whether the window shows the qualifiers' flags: once the stage is over. Part
 * of the column, not a popup, so "Show qualifiers popup" doesn't hide it.
 */
export const useShowsClosingGrid = (q: QualifiersState) =>
  q.isOver && q.qualified.length > 0;

export const QualifierWindow = ({
  q,
  className,
  windowClassName,
}: {
  q: QualifiersState;
  className?: string;
  windowClassName?: string;
}) => {
  const t = useTranslations('simulation');
  const showProgress = useGeneralStore(
    (state) => state.settings.shouldShowJuryVotingProgress,
  );
  const caption = useQualifiedCaption(q);
  const showsGrid = useShowsClosingGrid(q);
  const progress = showProgress && !q.isOver ? q.progress : undefined;
  const frame = { className, windowClassName, caption, progress };

  if (showsGrid) {
    return (
      <WindowFrame
        {...frame}
        sentenceTitle
        feature={
          <QualifiersFlagGrid
            countries={q.qualified}
            className="absolute inset-0"
          />
        }
        title={t('view.stageOver', { stage: q.stage?.name ?? '' })}
      />
    );
  }

  if (q.splitCandidates.length > 0) {
    return (
      <WindowFrame
        {...frame}
        sentenceTitle
        feature={
          <SplitTiles
            candidates={q.splitCandidates}
            className="absolute inset-0"
          />
        }
        title={t('chooseCountryToQualify')}
      />
    );
  }

  if (q.latest) {
    return <WindowFrame {...frame} country={q.latest} title={q.latest.name} />;
  }

  // Before the first pick: the host's heart, and how many places there are.
  return (
    <WindowFrame
      {...frame}
      sentenceTitle
      feature={
        <div className="absolute inset-0 grid place-items-center">
          <HostingLogo size={88} />
        </div>
      }
      title={q.stage?.name ?? ''}
    />
  );
};

// ---------------------------------------------------------------------------
// One line: the latest qualifier (the sheet's peek, the stripe)

export const QualifierLine = ({
  q,
  trailing,
}: {
  q: QualifiersState;
  trailing?: React.ReactNode;
}) => {
  const caption = useQualifiedCaption(q);
  const { latest } = q;

  return (
    <div className="flex items-center gap-3">
      {latest ? (
        <img
          src={flagSrc(latest)}
          onError={(e) => handleFlagError(e.currentTarget, latest)}
          alt=""
          className="h-[31px] w-[46px] shrink-0 rounded-[5px] object-cover ring-1 ring-white/20"
        />
      ) : (
        <span className="grid h-[31px] w-[46px] shrink-0 place-items-center">
          <HostingLogo size={30} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[16px] font-extrabold leading-tight tracking-[-0.01em] text-white ${
            latest ? 'uppercase' : ''
          }`}
        >
          {latest ? latest.name : q.stage?.name}
        </p>
        <p className="truncate text-[12.5px] font-semibold text-white/75">
          {caption}
        </p>
      </div>
      {trailing}
    </div>
  );
};

// ---------------------------------------------------------------------------
// The places: flags (peek, stripe) and the full list (column, open sheet)

/** Circles never get smaller than this: past it the places take a second row. */
const MIN_CHIP = 22;

/**
 * The places as flags in the order they were named, empty ones numbered:
 * where the standard mode shows the jury points strip. One row while every
 * circle can be at least MIN_CHIP wide, otherwise as many rows as needed
 * (a big contest's 20-odd places); a number scales with its circle
 * (`.dp-sim-chip-num`).
 */
export const PlaceChips = ({
  q,
  className = '',
  size = 28,
}: {
  q: QualifiersState;
  className?: string;
  size?: number;
}) => (
  <div
    aria-hidden="true"
    className={`grid ${className}`}
    style={{
      // As many MIN_CHIP tracks per row as fit (auto-fit counts with the
      // minimum, then drops the empty ones), sharing the row; each circle
      // stays at most `size` wide, centred in its track.
      gridTemplateColumns: `repeat(auto-fit, minmax(${MIN_CHIP}px, 1fr))`,
      gap: '4px 6px',
    }}
  >
    {Array.from({ length: q.total }, (_, index) => {
      const country = q.qualified[index];

      return country ? (
        <img
          key={country.code}
          src={flagSrc(country)}
          onError={(e) => handleFlagError(e.currentTarget, country)}
          alt=""
          className="dp-sim-chip aspect-square w-full justify-self-center rounded-full object-cover"
          style={{ maxWidth: size }}
        />
      ) : (
        <span
          key={`empty-${index}`}
          className="dp-sim-chip is-empty grid aspect-square w-full place-items-center justify-self-center rounded-full font-bold tabular-nums"
          style={{ maxWidth: size }}
        >
          <span className="dp-sim-chip-num">{index + 1}</span>
        </span>
      );
    })}
  </div>
);

/**
 * "Qualified for the Grand Final": every place numbered, in two columns
 * filled top to bottom, in the order the qualifiers were named; empty places
 * as outlines of the theme's row.
 */
export const QualifiedList = ({ q }: { q: QualifiersState }) => {
  const t = useTranslations('simulation.view');
  const { roundedCountryContainer } = useThemeSpecifics();
  const headingId = useId();
  const rows = Math.ceil(q.total / 2);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-3">
        <h3
          id={headingId}
          className="min-w-0 flex-1 text-[15px] font-extrabold leading-tight tracking-[-0.01em] text-white"
        >
          {q.heading}
        </h3>
        <span className="shrink-0 text-[12.5px] font-bold tabular-nums text-white/75">
          {t('countOfTotal', { count: q.qualified.length, total: q.total })}
        </span>
      </div>
      <ol
        className="grid grid-flow-col gap-x-2.5 gap-y-1.5"
        style={{
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gridTemplateRows: `repeat(${rows}, auto)`,
        }}
      >
        {Array.from({ length: q.total }, (_, index) => {
          const country = q.qualified[index];

          return (
            <li
              key={country?.code ?? `empty-${index}`}
              className="flex min-w-0 items-center gap-1.5"
            >
              <span
                className={`grid size-[22px] shrink-0 place-items-center rounded-full text-[11px] font-bold tabular-nums ${
                  country
                    ? 'bg-white/[0.12] text-white'
                    : 'dp-sim-chip is-empty'
                }`}
              >
                {index + 1}
              </span>
              {country ? (
                <div className="min-w-0 flex-1">
                  <CountryQualificationItem
                    country={country}
                    compact
                    shouldAnimate
                    targetStageName={q.targetNameFor(country.code)}
                  />
                </div>
              ) : (
                <span
                  className={`dp-sim-slot h-[30px] min-w-0 flex-1 ${
                    roundedCountryContainer ? 'rounded-full' : 'rounded-[6px]'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
};

// ---------------------------------------------------------------------------
// At random

/**
 * Next qualifier (one of the split's candidates while it shows), all left.
 * `onRunAll` runs after "All left" only: a single pick leaves the caller as
 * it is, like the peek's Random.
 */
export const QualifierRandomGroup = ({
  q,
  onRunAll,
}: {
  q: QualifiersState;
  onRunAll?: () => void;
}) => {
  const t = useTranslations('simulation.view');
  const random = useQualifierRandom();
  const groupId = useId();
  const splitCount = q.splitCandidates.length;

  return (
    <div
      role="group"
      aria-labelledby={groupId}
      className="flex flex-col gap-1.5"
    >
      <span id={groupId} className="text-[12.5px] font-bold text-white/75">
        {t('atRandom')}
      </span>
      <div
        className={`grid gap-1.5 ${
          q.remaining > 1 ? 'grid-cols-2' : 'grid-cols-1'
        }`}
      >
        <Button
          variant="surface"
          size="lg"
          className="min-w-0 justify-center !px-2"
          onClick={random.next}
        >
          <span className="truncate">
            {splitCount > 0
              ? t('oneOfThese', { count: splitCount })
              : t('nextQualifier')}
          </span>
        </Button>
        {q.remaining > 1 && (
          <Button
            variant="surface"
            size="lg"
            className="min-w-0 justify-center !px-2"
            onClick={() => {
              random.all();
              onRunAll?.();
            }}
          >
            <span className="truncate">
              {t('allLeft', { count: q.remaining })}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
};

/** The peek's one-tap Random: the next qualifier. */
export const QualifierRandomQuickButton = ({ q }: { q: QualifiersState }) => {
  const t = useTranslations('simulation');
  const random = useQualifierRandom();
  const splitCount = q.splitCandidates.length;

  return (
    <Button
      variant="surface"
      size="lg"
      className="shrink-0"
      Icon={<Dices className="size-[18px]" />}
      aria-label={`${t('view.atRandom')}: ${
        splitCount > 0
          ? t('view.oneOfThese', { count: splitCount })
          : t('view.nextQualifier')
      }`}
      onClick={random.next}
    >
      {t('random')}
    </Button>
  );
};

/**
 * The stripe's random control, split like the standard mode's: the left part
 * names the next qualifier at random, the chevron offers every place left.
 */
export const QualifierRandomSplitButton = ({ q }: { q: QualifiersState }) => {
  const t = useTranslations('simulation');
  const random = useQualifierRandom();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const half =
    'flex h-full items-center focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent hover:bg-white/[0.07]';
  const splitCount = q.splitCandidates.length;
  const nextLabel =
    splitCount > 0
      ? t('view.oneOfThese', { count: splitCount })
      : t('view.nextQualifier');

  return (
    <>
      <div
        ref={ref}
        className={`dp-act flex h-[40px] shrink-0 items-stretch overflow-hidden rounded-xl text-white ${
          open ? 'is-on' : ''
        }`}
      >
        <button
          type="button"
          onClick={random.next}
          aria-label={`${t('view.atRandom')}: ${nextLabel}`}
          className={`${half} gap-2 pl-3 pr-2.5 text-[13px] font-extrabold`}
        >
          <Dices className="size-[18px] shrink-0" />
          {t('random')}
        </button>
        <span className="my-2 w-px shrink-0 bg-white/15" aria-hidden="true" />
        <button
          type="button"
          aria-label={t('view.atRandom')}
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((value) => !value)}
          className={`${half} w-9 justify-center`}
        >
          <ChevronDown
            className={`size-4 opacity-80 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>
      <Popover
        open={open}
        anchor={ref.current}
        onClose={() => setOpen(false)}
        ariaLabel={t('view.atRandom')}
        align="center"
        className="w-[240px] !p-1.5"
      >
        <div className="px-2.5 pb-1 pt-2 text-[12.5px] font-bold text-white/70">
          {t('view.atRandom')}
        </div>
        {[
          { label: nextLabel, run: random.next },
          ...(q.remaining > 1
            ? [
                {
                  label: t('view.allLeft', { count: q.remaining }),
                  run: random.all,
                },
              ]
            : []),
        ].map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => {
              setOpen(false);
              action.run();
            }}
            className="flex min-h-10 w-full items-center rounded-lg px-2.5 text-left text-[14px] font-bold hover:bg-white/[0.08] focus-visible:bg-white/[0.08] focus-visible:outline-none"
          >
            <span className="min-w-0 truncate">{action.label}</span>
          </button>
        ))}
      </Popover>
    </>
  );
};

/** Until the first row is tapped (as in the standard mode). */
export const QualifierHint = ({ className = '' }: { className?: string }) => {
  const t = useTranslations('simulation');
  const hideVotingHints = useGeneralStore(
    (state) => state.settings.hideVotingHints,
  );
  const boardTapped = useSimViewStore((state) => state.boardTapped);

  if (hideVotingHints || boardTapped) return null;

  return (
    <p
      className={`text-[15px] font-semibold leading-snug text-white ${className}`}
    >
      {t('chooseCountryToQualify')}
    </p>
  );
};

// ---------------------------------------------------------------------------
// Results

/** Share, then Continue: the stage is over. */
export const QualifierResultsActions = ({
  onShare,
  compact = false,
}: {
  onShare: () => void;
  /** The sheet: Share as an icon next to the title instead. */
  compact?: boolean;
}) => {
  const t = useTranslations('simulation');
  const { canContinue, nextPhase, handleContinue } = usePhaseResults();

  return (
    <div className="flex flex-col gap-3">
      {!compact && (
        <Button
          variant="surface"
          size="lg"
          className="justify-center"
          Icon={<Share2 className="size-[18px]" />}
          onClick={onShare}
        >
          {t('header.share')}
        </Button>
      )}
      {canContinue && (
        <Button
          variant="cta"
          size="xl"
          className="w-full justify-center gap-2"
          onClick={handleContinue}
        >
          <span className="flex items-center gap-2">
            {t('phaseActions.continueTo', { nextPhase: nextPhase ?? '' })}
            <ArrowRight className="size-[18px]" />
          </span>
        </Button>
      )}
    </div>
  );
};
