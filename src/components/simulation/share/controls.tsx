'use client';
import { Check, Minus, Plus } from 'lucide-react';
import React, { useId, useRef } from 'react';

import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';
import { playHaptic } from '@/native/haptics';

/*
 * The share modal's option controls (docs/graphics-studio.md §8, DESIGN.md
 * "Share image modal"). Flat theme surfaces, sentence-case labels, 44px
 * touch targets; every control changes the picture at once.
 */

/** A labelled group of options; `aside` sits on the label's line (Auto, Reset). */
export const ShareGroup = ({
  label,
  aside,
  children,
}: {
  label: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const id = useId();

  return (
    <section role="group" aria-labelledby={id} className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 min-h-[18px]">
        <h3 id={id} className="m-0 text-[13px] font-bold text-white/70">
          {label}
        </h3>
        {aside && <div className="ml-auto">{aside}</div>}
      </div>
      {children}
    </section>
  );
};

/** The quiet "Auto" note on a group's label line. */
export const ShareAutoNote = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[12.5px] font-semibold text-white/55">{children}</span>
);

/** A small text button on a group's label line ("Reset"). */
export const ShareLinkButton = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="dp-accent-ink text-[12.5px] font-bold underline-offset-[3px] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded"
  >
    {children}
  </button>
);

// ---------------------------------------------------------------------------
// Segmented choice

export interface ShareSegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

/** One row while every label fits, else one option per row (long translations). */
const SEG_STEPS = [{ seg: 'row' }, { seg: 'stack' }] as const;

export function ShareSegmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: ShareSegmentedOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const step = useFitStep(ref, SEG_STEPS, { targets: '[data-seg-label]' });
  const hasIcons = options.some((option) => option.icon);

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={ariaLabel}
      {...fitStepAttributes(SEG_STEPS[step])}
      className="dp-share-seg dp-sim-seg flex gap-0.5 rounded-xl p-[3px]"
    >
      {options.map((option) => {
        const isOn = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isOn}
            onClick={() => {
              if (isOn) return;
              playHaptic({ id: 'selection' });
              onChange(option.value);
            }}
            className={`${isOn ? 'is-on' : 'text-white/70 hover:text-white'} ${
              hasIcons ? 'h-[54px] flex-col gap-[5px]' : 'h-11 gap-2'
            } flex min-w-0 flex-1 items-center justify-center rounded-[9px] px-2 text-[13px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}
          >
            {option.icon}
            <span
              data-seg-label
              className="block max-w-full overflow-hidden whitespace-nowrap leading-none"
            >
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The outline of an image format, drawn at its proportions. */
const FORMAT_SHAPES = {
  wide: { width: 22, height: 12 },
  square: { width: 15, height: 15 },
  tall: { width: 12, height: 16 },
} as const;

export const FormatShape = ({ kind }: { kind: keyof typeof FORMAT_SHAPES }) => (
  <span className="grid h-[17px] place-items-center" aria-hidden="true">
    <span
      className="block rounded-[2.5px] border-solid border-current"
      style={{ ...FORMAT_SHAPES[kind], borderWidth: 1.5 }}
    />
  </span>
);

// ---------------------------------------------------------------------------
// Fields

/** A text field with its name as a caption inside the frame. */
export const ShareTextField = ({
  label,
  value,
  onChange,
  maxLength = 120,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
}) => {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className="dp-share-field flex h-[54px] cursor-text flex-col justify-center rounded-xl px-3.5"
    >
      <span className="text-[11.5px] font-semibold leading-tight text-white/55">
        {label}
      </span>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        // 16px keeps iOS from zooming the page on focus.
        className="w-full min-w-0 border-0 bg-transparent p-0 text-[16px] font-semibold leading-[1.4] text-white outline-none placeholder:text-white/40"
      />
    </label>
  );
};

/** An on/off option shown as a pressed button. */
export const ShareToggle = ({
  label,
  pressed,
  onChange,
}: {
  label: string;
  pressed: boolean;
  onChange: (pressed: boolean) => void;
}) => (
  <button
    type="button"
    aria-pressed={pressed}
    onClick={() => {
      playHaptic({ id: 'selection' });
      onChange(!pressed);
    }}
    className={`dp-share-toggle ${
      pressed ? 'is-on' : ''
    } flex min-h-[44px] min-w-0 items-center justify-center gap-1.5 rounded-[11px] px-2 py-1.5 text-center text-[13px] font-bold leading-[1.15] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}
  >
    {pressed && (
      <Check
        className="size-[15px] flex-none text-accent"
        strokeWidth={2.6}
        aria-hidden="true"
      />
    )}
    <span className="min-w-0 text-balance">{label}</span>
  </button>
);

const stepButtonClass =
  'grid h-10 w-9 flex-none place-items-center rounded-[9px] text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent';

/**
 * A value with − / + buttons. With `number`, the value is also a field you
 * can type into (the custom number of countries).
 */
export const ShareStepper = ({
  label,
  value,
  number,
  onDecrease,
  onIncrease,
  canDecrease,
  canIncrease,
  decreaseLabel,
  increaseLabel,
}: {
  label: string;
  value?: string;
  number?: {
    value: number;
    min: number;
    max: number;
    onChange: (n: number) => void;
  };
  onDecrease: () => void;
  onIncrease: () => void;
  canDecrease: boolean;
  canIncrease: boolean;
  decreaseLabel: string;
  increaseLabel: string;
}) => {
  const id = useId();

  return (
    <div className="dp-share-field flex h-[54px] min-w-0 items-center gap-0.5 rounded-xl pl-3.5 pr-1">
      <div className="min-w-0 flex-1">
        <label
          htmlFor={number ? id : undefined}
          className="block truncate text-[11.5px] font-semibold leading-tight text-white/55"
        >
          {label}
        </label>
        {number ? (
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={number.min}
            max={number.max}
            value={number.value}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);

              if (!Number.isNaN(n)) {
                number.onChange(Math.min(number.max, Math.max(number.min, n)));
              }
            }}
            className="w-full min-w-0 border-0 bg-transparent p-0 text-[16px] font-bold leading-[1.4] text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        ) : (
          <span
            className="block text-[15px] font-bold leading-[1.45]"
            aria-live="polite"
          >
            {value}
          </span>
        )}
      </div>
      <button
        type="button"
        aria-label={decreaseLabel}
        disabled={!canDecrease}
        onClick={onDecrease}
        className={stepButtonClass}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={increaseLabel}
        disabled={!canIncrease}
        onClick={onIncrease}
        className={stepButtonClass}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
};

/** A full-width row button: the Customize disclosure, the editor link. */
export const ShareRowButton = ({
  icon,
  title,
  sub,
  trailing,
  onClick,
  ariaExpanded,
}: {
  icon?: React.ReactNode;
  title: string;
  sub?: string;
  trailing?: React.ReactNode;
  onClick: () => void;
  ariaExpanded?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-expanded={ariaExpanded}
    className="dp-share-row flex min-h-[56px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
  >
    {icon}
    <span className="min-w-0 flex-1">
      <span className="block text-[14.5px] font-extrabold leading-tight tracking-[-0.01em]">
        {title}
      </span>
      {sub && (
        <span className="mt-0.5 block text-[12.5px] font-semibold leading-snug text-white/70">
          {sub}
        </span>
      )}
    </span>
    {trailing}
  </button>
);
