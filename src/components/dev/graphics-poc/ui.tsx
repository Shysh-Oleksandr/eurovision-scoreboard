'use client';
import React, { useEffect, useState } from 'react';

/* Tiny unstyled-ish controls for the PoC. Not for product use. */

export const Btn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
> = ({ active, className = '', children, ...rest }) => (
  <button
    type="button"
    className={`px-2.5 py-1 rounded text-sm border transition-colors disabled:opacity-40 ${
      active
        ? 'bg-sky-500 border-sky-400 text-white'
        : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-neutral-100'
    } ${className}`}
    {...rest}
  >
    {children}
  </button>
);

export const Field: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, children, className = '' }) => (
  <label
    className={`flex flex-col gap-0.5 text-xs text-neutral-400 ${className}`}
  >
    <span>{label}</span>
    {children}
  </label>
);

export const inputCls =
  'bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-100 w-full';

export const NumberInput: React.FC<{
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}> = ({ value, onChange, step = 1, min, max }) => (
  <input
    type="number"
    className={inputCls}
    value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
    step={step}
    min={min}
    max={max}
    onChange={(e) => {
      const v = parseFloat(e.target.value);

      if (Number.isFinite(v)) onChange(v);
    }}
  />
);

export const Section: React.FC<{
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}> = ({ title, children, right }) => (
  <section className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 flex flex-col gap-2">
    <header className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-neutral-200">{title}</h3>
      {right}
    </header>
    {children}
  </section>
);

export const Mono: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <pre
    className={`text-[11px] leading-snug font-mono whitespace-pre-wrap break-all text-neutral-300 ${className}`}
  >
    {children}
  </pre>
);

export const envInfo = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return '';
  }

  return [
    navigator.userAgent,
    `dpr=${window.devicePixelRatio}`,
    `viewport=${window.innerWidth}×${window.innerHeight}`,
    `touch=${navigator.maxTouchPoints > 0}`,
    `cores=${navigator.hardwareConcurrency ?? '?'}`,
    `mem=${(navigator as any).deviceMemory ?? '?'}GB`,
  ].join(' · ');
};

/** Client-only env string (avoids SSR/hydration mismatch). */
export const useEnvInfo = () => {
  const [info, setInfo] = useState('');

  useEffect(() => setInfo(envInfo()), []);

  return info;
};
