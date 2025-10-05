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
    },
    ref,
  ) => {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <label htmlFor={id} className="text-white font-medium">
          {label}
        </label>
        <Input
          id={id}
          ref={ref}
          type={type}
          {...inputProps}
          className="h-12 lg:text-[0.95rem] text-sm"
          placeholder={placeholder}
        />
        {errors?.[id] && (
          <span className="text-red-400 text-sm">
            {errors[id].message as string}
          </span>
        )}
      </div>
    );
  },
);

InputField.displayName = 'InputField';
