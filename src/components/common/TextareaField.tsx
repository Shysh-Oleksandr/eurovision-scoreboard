import React, { forwardRef } from 'react';
import { FieldErrors } from 'react-hook-form';

interface TextareaFieldProps {
  className?: string;
  id: string;
  label: string;
  errors?: FieldErrors;
  placeholder?: string;
  type?: string;
  textareaProps?: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
  rows?: number;
}

export const TextareaField = forwardRef<
  HTMLTextAreaElement,
  TextareaFieldProps
>(
  (
    { className = '', id, label, errors, placeholder, textareaProps, rows = 2 },
    ref,
  ) => {
    const baseClasses = [
      'w-full leading-5',
      'min-h-12 max-h-48',
      'py-3',
      'pl-3',
      'rounded-md',
      'bg-primary-900',
      'bg-gradient-to-bl',
      'from-[10%]',
      'from-primary-900',
      'to-primary-800/60',
      'transition-colors',
      'duration-300',
      'placeholder:text-white/55',
      'text-white',
      'border-solid',
      'border-transparent',
      'border-b-2',
      'hover:bg-primary-800',
      'focus:bg-primary-800',
      'focus:border-white',
    ].join(' ');

    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <label htmlFor={id} className="text-white font-medium">
          {label}
        </label>
        <textarea
          id={id}
          ref={ref}
          placeholder={placeholder}
          className={`${baseClasses} ${className}`}
          rows={rows}
          {...textareaProps}
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

TextareaField.displayName = 'TextareaField';
