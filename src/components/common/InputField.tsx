import React, { forwardRef } from 'react';
import { FieldErrors } from 'react-hook-form';

import { Input } from '../Input';

interface InputFieldProps {
  className?: string;
  id: string;
  label: string;
  errors?: FieldErrors;
  placeholder?: string;
  type?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  /** A line under the field (rules, where the value shows); an error replaces it. */
  hint?: React.ReactNode;
  /** A fixed character drawn inside the field before the value, like "@". */
  prefix?: string;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      className = '',
      id,
      label,
      errors,
      placeholder,
      type = 'text',
      inputProps,
      hint,
      prefix,
    },
    ref,
  ) => {
    const error = errors?.[id]?.message as string | undefined;
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;
    const describedBy = error ? errorId : hint ? hintId : undefined;

    const input = (
      <Input
        id={id}
        ref={ref}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...inputProps}
        className={`h-12 lg:text-[0.95rem] text-sm ${
          prefix ? '!pl-[28px] md:!pl-[24px]' : ''
        } ${inputProps?.className || ''}`}
        placeholder={placeholder}
      />
    );

    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <label htmlFor={id} className="text-white font-medium">
          {label}
        </label>
        {prefix ? (
          <div className="relative">
            <span
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[1.145rem] md:text-sm text-white/55 pointer-events-none"
            >
              {prefix}
            </span>
            {input}
          </div>
        ) : (
          input
        )}
        {error ? (
          <span id={errorId} className="text-red-400 text-sm">
            {error}
          </span>
        ) : hint ? (
          <span id={hintId} className="text-white/60 text-sm leading-snug">
            {hint}
          </span>
        ) : null}
      </div>
    );
  },
);

InputField.displayName = 'InputField';
