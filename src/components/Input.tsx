import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    const baseClasses = [
      'w-full',
      'py-3',
      'pl-3',
      'rounded-md',
      '!text-[1.145rem] md:!text-sm',
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
      <input ref={ref} className={`${baseClasses} ${className}`} {...props} />
    );
  },
);

Input.displayName = 'Input';
