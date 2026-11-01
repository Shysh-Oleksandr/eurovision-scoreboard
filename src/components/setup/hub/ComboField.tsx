import React from 'react';

type ComboFieldProps = {
  /** Right-hand toggle chip (see `ComboChip`). */
  chip?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * Header combo: a bordered container holding a `CustomSelect
 * variant="combo"` trigger (its caption names the field) and an optional
 * chip, split by a hairline. Its width is set by the header layout
 * (`.dp-hub-header` in styles.css).
 */
const ComboField = ({ chip, children, className = '' }: ComboFieldProps) => (
  <div
    className={`dp-combo-field dp-combo flex items-stretch rounded-xl overflow-hidden min-w-0 ${className}`}
  >
    <div className="min-w-0 flex-1">{children}</div>
    {chip}
  </div>
);

export default ComboField;
