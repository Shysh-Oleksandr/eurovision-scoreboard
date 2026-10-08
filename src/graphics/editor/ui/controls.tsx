'use client';
import { ChevronDown, Info, Lock, Minus, Plus } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { cn } from '@/helpers/utils';

/**
 * Inspector form controls (handoff §5 look): uppercase 10.5 px labels,
 * 40 px recessed inputs, segmented controls, switches, steppers, colour
 * and range fields. Styled by `editor.css` (`gfx-*`).
 */

/**
 * Label + control. Deliberately not a `<label>`: its activation target would
 * be the first labelable descendant, and for steppers and segments that is a
 * button — clicking "Rotation" used to decrement the value.
 */
export const Field: React.FC<{
  label: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ label, hint, className, children }) => (
  <div className={cn('gfx-field', className)}>
    <span className="gfx-field-label">
      {label}
      {hint !== undefined && <em>{hint}</em>}
    </span>
    {children}
  </div>
);

export const Row: React.FC<{
  cols?: 2 | 4;
  className?: string;
  children: React.ReactNode;
}> = ({ cols = 2, className, children }) => (
  <div className={cn(cols === 4 ? 'gfx-f4' : 'gfx-f2', className)}>
    {children}
  </div>
);

export const TextInput: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & {
    onValue?: (v: string) => void;
  }
> = ({ onValue, className, ...rest }) => (
  <input
    {...rest}
    className={cn('gfx-input', className)}
    onChange={(e) => {
      onValue?.(e.target.value);
      rest.onChange?.(e);
    }}
  />
);

export const TextArea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    onValue?: (v: string) => void;
  }
> = ({ onValue, className, ...rest }) => (
  <textarea
    {...rest}
    className={cn('gfx-input gfx-input--area', className)}
    onChange={(e) => {
      onValue?.(e.target.value);
      rest.onChange?.(e);
    }}
  />
);

export interface Option<T extends string | number> {
  value: T;
  label: React.ReactNode;
  title?: string;
}

export function Seg<T extends string | number>({
  value,
  options,
  onChange,
  icons,
  ariaLabel,
}: {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  icons?: boolean;
  ariaLabel?: string;
}) {
  return (
    <span
      className={cn('gfx-seg', icons && 'gfx-seg--icons')}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          aria-label={o.title}
          title={o.title}
          className={o.value === value ? 'is-on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </span>
  );
}

export interface OptionGroup<T extends string | number> {
  label: string;
  options: Option<T>[];
}

export function SelectInput<T extends string | number>({
  value,
  options = [],
  groups,
  onChange,
  ariaLabel,
  className,
}: {
  value: T;
  options?: Option<T>[];
  /** Rendered as `<optgroup>`s after the flat options. */
  groups?: OptionGroup<T>[];
  onChange: (v: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const all = [...options, ...(groups ?? []).flatMap((g) => g.options)];
  const renderOption = (o: Option<T>) => (
    <option key={String(o.value)} value={String(o.value)}>
      {typeof o.label === 'string' ? o.label : String(o.value)}
    </option>
  );

  return (
    <span className={cn('gfx-select', className)}>
      <select
        className="gfx-input"
        value={String(value)}
        aria-label={ariaLabel}
        onChange={(e) => {
          const raw = e.target.value;
          const match = all.find((o) => String(o.value) === raw);

          if (match) onChange(match.value);
        }}
      >
        {options.map(renderOption)}
        {groups?.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.options.map(renderOption)}
          </optgroup>
        ))}
      </select>
      <ChevronDown className="gfx-select-chev size-[15px]" />
    </span>
  );
}

export const Toggle: React.FC<{
  label: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}> = ({ label, checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    className={cn('gfx-toggle', checked && 'is-on')}
    onClick={() => onChange(!checked)}
  >
    <span>{label}</span>
    <span className="gfx-toggle-sw" />
  </button>
);

/**
 * Number stepper. Typing is committed on every valid change; blur re-syncs.
 * `commitOnBlur` commits typed values on blur / Enter only (canvas size,
 * where every intermediate value would re-layout the whole design).
 */
export const NumberField: React.FC<{
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  readOnly?: boolean;
  readOnlyTitle?: string;
  ariaLabel?: string;
  compact?: boolean;
  commitOnBlur?: boolean;
}> = ({
  value,
  onChange,
  step = 1,
  min,
  max,
  unit,
  readOnly,
  readOnlyTitle,
  ariaLabel,
  compact,
  commitOnBlur,
}) => {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  const clamp = (v: number) =>
    Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
  const commit = (raw: string) => {
    const n = Number(raw);

    if (raw.trim() === '' || Number.isNaN(n)) return;
    onChange(clamp(n));
  };
  const nudge = (dir: 1 | -1) => {
    const digits = step < 1 ? String(step).split('.')[1]?.length ?? 2 : 0;
    const next = clamp(Number((value + dir * step).toFixed(digits)));

    onChange(next);
    setText(String(next));
  };

  return (
    <span
      className={cn('gfx-num', readOnly && 'is-ro', compact && 'is-compact')}
      title={readOnly ? readOnlyTitle : undefined}
    >
      {!readOnly && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Decrease ${ariaLabel ?? ''}`}
          onClick={() => nudge(-1)}
        >
          <Minus className="size-[13px]" />
        </button>
      )}
      <input
        type="number"
        className="gfx-input"
        value={text}
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : undefined}
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={(e) => {
          focused.current = false;
          if (commitOnBlur) commit(e.target.value);
          setText(String(value));
        }}
        onChange={(e) => {
          setText(e.target.value);
          if (!commitOnBlur) commit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            nudge(1);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            nudge(-1);
          } else if (e.key === 'Enter' && commitOnBlur) {
            commit((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      {unit && <u>{unit}</u>}
      {readOnly ? (
        <span className="gfx-num-lock">
          <Lock className="size-3" />
        </span>
      ) : (
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Increase ${ariaLabel ?? ''}`}
          onClick={() => nudge(1)}
        >
          <Plus className="size-[13px]" />
        </button>
      )}
    </span>
  );
};

const toHex = (value: string): string => {
  const m = /^#([0-9a-f]{6})$/i.exec(value.trim());

  if (m) return value;
  const short = /^#([0-9a-f]{3})$/i.exec(value.trim());

  if (short) {
    const [r, g, b] = Array.from(short[1]);

    return `#${r}${r}${g}${g}${b}${b}`;
  }
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(value);

  if (rgba) {
    return `#${[rgba[1], rgba[2], rgba[3]]
      .map((n) => Number(n).toString(16).padStart(2, '0'))
      .join('')}`;
  }

  return '#ffffff';
};

/** Swatch + hex text; the swatch opens the native colour picker. */
export const ColorField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
}> = ({ value, onChange, ariaLabel }) => {
  const [text, setText] = useState(value);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);

  return (
    <span className="gfx-color">
      <span className="gfx-color-swatch" style={{ background: value }}>
        <input
          type="color"
          value={toHex(value)}
          aria-label={ariaLabel}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
      <input
        className="gfx-input"
        value={text}
        spellCheck={false}
        aria-label={ariaLabel}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
          setText(value);
        }}
        onChange={(e) => {
          setText(e.target.value);
          const v = e.target.value.trim();

          if (
            /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) ||
            /^rgba?\(/i.test(v) ||
            /^hsla?\(/i.test(v) ||
            /^oklch\(/i.test(v)
          ) {
            onChange(v);
          }
        }}
      />
    </span>
  );
};

export const RangeField: React.FC<{
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
  ariaLabel?: string;
}> = ({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
  format = (v) => `${Math.round(v * 100)}%`,
  ariaLabel,
}) => (
  <span className="gfx-range">
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
    />
    <b>{format(value)}</b>
  </span>
);

export const Hint: React.FC<{
  children: React.ReactNode;
  strong?: boolean;
  icon?: boolean;
  className?: string;
}> = ({ children, strong, icon, className }) => (
  <p className={cn('gfx-hint', strong && 'is-strong', className)}>
    {icon && <Info className="size-[13px] flex-none mt-[2px]" />}
    <span>{children}</span>
  </p>
);

export const Note: React.FC<{
  tone?: 'bound' | 'theme' | 'warn';
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}> = ({ tone = 'bound', icon, children, action }) => (
  <div className={cn('gfx-note', `gfx-note--${tone}`)}>
    <span className="gfx-note-ic">{icon}</span>
    <span className="gfx-note-body">{children}</span>
    {action}
  </div>
);

/**
 * Collapsible inspector section with an uppercase 11 px head. The body
 * stays mounted and animates through a `grid-template-rows` transition
 * (0fr ↔ 1fr); closed bodies are `inert`. `flashKey` scrolls the section
 * into view and highlights it briefly (top-bar chips point at sections).
 */
export const Section: React.FC<{
  title: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  flashKey?: number;
  children: React.ReactNode;
}> = ({ title, open, onToggle, flashKey, children }) => {
  const ref = useRef<HTMLElement>(null);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (!flashKey) return undefined;
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    setFlashing(true);
    const timer = setTimeout(() => setFlashing(false), 1100);

    return () => clearTimeout(timer);
  }, [flashKey]);

  return (
    <section
      ref={ref}
      className={cn('gfx-sec', !open && 'is-closed', flashing && 'is-flash')}
    >
      <button
        type="button"
        className="gfx-sec-h"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>{title}</span>
        <ChevronDown className="gfx-sec-chev size-[15px]" />
      </button>
      <div className="gfx-sec-wrap" inert={!open}>
        <div className="gfx-sec-inner">
          <div className="gfx-sec-b">{children}</div>
        </div>
      </div>
    </section>
  );
};

export const Chip: React.FC<{
  icon?: React.ReactNode;
  tone?: 'default' | 'data' | 'built';
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}> = ({ icon, tone = 'default', onClick, children, className, title }) => {
  const cls = cn(
    'gfx-chip',
    tone !== 'default' && `gfx-chip--${tone}`,
    className,
  );

  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} title={title}>
        {icon}
        <span>{children}</span>
        <ChevronDown className="size-[13px] opacity-50" />
      </button>
    );
  }

  return (
    <span className={cls} title={title}>
      {icon}
      <span>{children}</span>
    </span>
  );
};

export const IconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: 'xs' | 'sm' | 'md';
    on?: boolean;
    danger?: boolean;
    label: string;
  }
> = ({ size = 'md', on, danger, label, className, children, ...rest }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={cn(
      'gfx-iconbtn',
      `gfx-iconbtn--${size}`,
      on && 'is-on',
      danger && 'is-danger',
      className,
    )}
    {...rest}
  >
    {children}
  </button>
);
