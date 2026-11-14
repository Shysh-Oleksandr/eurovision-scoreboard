'use client';
import React, { useId, useRef } from 'react';

import Button from '@/components/common/Button';
import { useTelevoteEntry } from '@/components/controlsPanel/useTelevoteEntry';
import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';

/**
 * Where the entry sits. The points given so far ("265 / 1044") sit quietly
 * inside the field everywhere; their share is the round's progress line
 * (`useRoundProgress`). Only an error's placement differs:
 * - `panel` (the desktop column, the phone sheet): under the field.
 * - `stripe` (the minimal view, which keeps one height in every round): a
 *   bubble above the stripe.
 */
export type TelevoteEntryVariant = 'panel' | 'stripe';

interface TelevoteEntryProps {
  variant?: TelevoteEntryVariant;
  /** Field and button height: 40px (the desktop stripe's) or 46px. */
  size?: 'md' | 'lg';
  /** Focus the input when the next country comes up (desktop only). */
  autoFocus?: boolean;
  className?: string;
}

/**
 * The televote points input of the column layout: the same validation as
 * the classic panel (`useTelevoteEntry`), drawn with the layout's controls.
 * Enter votes.
 */
const TelevoteEntry = ({
  variant = 'panel',
  size = variant === 'stripe' ? 'md' : 'lg',
  autoFocus = false,
  className = '',
}: TelevoteEntryProps) => {
  const {
    t,
    televotingProgress,
    televoteProgress,
    shouldLimitManualTelevotePoints,
    revealTelevoteLowestToHighest,
    enteredPoints,
    error,
    disableLimit,
    setDisableLimit,
    disableLimitForShow,
    setDisableLimitForShow,
    handleInputChange,
    handleVoting,
    isVoteDisabled,
  } = useTelevoteEntry();
  const inputId = useId();
  const errorId = useId();
  const awardedId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const isLimitOverridden = disableLimit || disableLimitForShow;
  const awarded =
    shouldLimitManualTelevotePoints && televoteProgress
      ? {
          given: toFixedIfDecimalFloat(televoteProgress.totalAwardedPoints),
          total: toFixedIfDecimalFloat(televoteProgress.totalAvailablePoints),
        }
      : null;
  const awardedLabel =
    awarded &&
    t('simulation.awarded', {
      count: awarded.given,
      totalAvailablePoints: awarded.total,
    });
  const height = size === 'md' ? 'h-[40px]' : 'h-[46px]';

  const limitOptions = (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-2.5 text-[13px] font-semibold">
        <input
          type="checkbox"
          className="dp-sim-check size-[18px]"
          checked={disableLimit}
          onChange={(e) => setDisableLimit(e.target.checked)}
        />
        {t('simulation.disableLimitForThisVote')}
      </label>
      <label className="flex items-center gap-2.5 text-[13px] font-semibold">
        <input
          type="checkbox"
          className="dp-sim-check size-[18px]"
          checked={disableLimitForShow}
          onChange={(e) => setDisableLimitForShow(e.target.checked)}
        />
        {t('simulation.disableLimitForThisShow')}
      </label>
    </div>
  );

  const errorText = error !== '' && (
    <p
      id={errorId}
      role="alert"
      className="text-[13px] font-semibold text-[var(--badge-red-ink)]"
    >
      {error}
    </p>
  );
  // Overriding the limit is offered whenever a vote was refused.
  const errorOptions = error !== '' && awarded && limitOptions;

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      <div className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          {t('simulation.enterTelevotePoints')}
        </label>
        {/* The field's frame holds the input and, quietly, the running
            count; a press anywhere in it types into the input. */}
        <div
          className={`dp-sim-input ${height} flex min-w-0 flex-1 cursor-text items-center gap-2 rounded-xl px-3`}
          onMouseDown={(e) => {
            if (e.target !== inputRef.current) {
              e.preventDefault();
              inputRef.current?.focus();
            }
          }}
        >
          <input
            ref={inputRef}
            // Remount per country so autofocus lands on each new entry.
            key={autoFocus ? televotingProgress : undefined}
            id={inputId}
            type="number"
            inputMode="numeric"
            enterKeyHint="done"
            autoComplete="off"
            autoFocus={autoFocus}
            placeholder={t('simulation.enterPoints')}
            value={enteredPoints}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isVoteDisabled) {
                e.preventDefault();
                handleVoting();
              }
            }}
            aria-invalid={error !== ''}
            aria-describedby={
              [error ? errorId : '', awarded ? awardedId : '']
                .filter(Boolean)
                .join(' ') || undefined
            }
            className="h-full min-w-0 flex-1 bg-transparent text-[16px] font-bold text-white tabular-nums outline-none"
          />
          {awarded && (
            // The running count, quiet: most people never read it.
            <span
              id={awardedId}
              title={
                isLimitOverridden
                  ? `${awardedLabel} · ${t('simulation.limitDisabled')}`
                  : awardedLabel ?? undefined
              }
              className="shrink-0 text-[12px] font-bold tabular-nums text-white/45"
            >
              <span className="sr-only">{awardedLabel}</span>
              <span aria-hidden="true">
                {awarded.given} / {awarded.total}
              </span>
            </span>
          )}
        </div>
        <Button
          variant="cta"
          size="lg"
          className={size === 'md' ? '!h-[40px] !px-4' : '!px-5'}
          disabled={isVoteDisabled}
          onClick={handleVoting}
        >
          {revealTelevoteLowestToHighest
            ? t('common.save')
            : t('simulation.vote')}
        </Button>
      </div>

      {variant === 'panel' && errorText && (
        <div className="flex flex-col gap-2.5">
          {errorText}
          {errorOptions}
        </div>
      )}

      {variant === 'stripe' && errorText && (
        // Positioned against the stripe itself (fixed, the nearest containing
        // block): a bubble above it, so the stripe keeps its height.
        <div className="pointer-events-none absolute inset-x-0 bottom-full mb-2.5 flex justify-center">
          <div className="dp-sim-float dp-sim-float-in pointer-events-auto flex max-w-[440px] flex-col gap-2.5 rounded-[14px] p-3.5">
            {errorText}
            {errorOptions}
          </div>
        </div>
      )}
    </div>
  );
};

export default TelevoteEntry;
