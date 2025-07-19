import React from 'react';

type CheckboxProps = {
  id: string;
  label: string;
  labelClassName?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'>;

export const Checkbox = ({
  id,
  label,
  className = '',
  labelClassName = '',
  ...rest
}: CheckboxProps) => {
  const checkSymbolId = `check-${id}`;

  return (
    <div className={`checkbox-wrapper ${className}`}>
      <input className="inp-cbx" id={id} type="checkbox" {...rest} />
      <label className={`cbx ${labelClassName}`} htmlFor={id}>
        <span>
          <svg width="12px" height="10px">
            <use xlinkHref={`#${checkSymbolId}`} />
          </svg>
        </span>
        <span className="text-base font-medium">{label}</span>
      </label>
      <svg className="inline-svg">
        <symbol id={checkSymbolId} viewBox="0 0 12 10">
          <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
        </symbol>
      </svg>
    </div>
  );
};
