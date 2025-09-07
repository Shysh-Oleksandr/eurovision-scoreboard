import React from 'react';

import { ArrowIcon } from '@/assets/icons/ArrowIcon';

export interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps
  extends Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    'className' | 'children'
  > {
  options: SelectOption[];
  children: React.ReactNode;
  className?: string;
  selectClassName?: string;
  arrowClassName?: string;
}

const Select = ({
  options,
  children,
  className,
  selectClassName,
  arrowClassName,
  ...props
}: SelectProps) => {
  return (
    <div
      className={`relative flex items-center justify-between cursor-pointer transition-colors duration-300 flex-none rounded-md text-white overflow-hidden ${
        className || ''
      }`}
    >
      {children}
      <ArrowIcon
        className={`h-6 w-6 shrink-0 text-white rotate-90 ${
          arrowClassName || ''
        }`}
      />
      <select
        className={`absolute inset-0 h-full w-full cursor-pointer opacity-0 select ${
          selectClassName || ''
        }`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;
