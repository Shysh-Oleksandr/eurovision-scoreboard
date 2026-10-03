import React from 'react';

type ComboFieldProps = {
  label: string;
  /** Right-hand toggle chip (see `ComboChip`). */
  chip?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * Header combo: uppercase label above a bordered container holding a
 * `CustomSelect variant="combo"` trigger and an optional chip, split by a
 * hairline. Capped at 240px so a long contest or theme name truncates instead
 * of stretching the header (on phones the two-column grid bounds it).
 */
const ComboField = ({
  label,
  chip,
  children,
  className = '',
}: ComboFieldProps) => (
  <div
    className={`flex flex-col gap-[5px] min-w-0 sm:max-w-[164px] md:max-w-[200px] lg:max-w-[300px] ${className}`}
  >
    <span className="pl-0.5 text-[10.5px] font-extrabold uppercase tracking-[.09em] text-white/55">
      {label}
    </span>
    <div className="dp-combo flex items-stretch rounded-xl overflow-hidden">
      <div className="min-w-0 sm:min-w-[118px] flex-1">{children}</div>
      {chip}
    </div>
  </div>
);

export default ComboField;
