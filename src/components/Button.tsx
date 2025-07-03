import React, { ReactNode } from 'react';

type Props = {
  label?: string;
  className?: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  children?: ReactNode;
  disabled?: boolean;
};

const Button = ({
  label,
  className = '',
  onClick,
  variant = 'primary',
  children,
  disabled = false,
}: Props) => {
  const baseClasses =
    'lg:text-base md:text-base text-sm lg:px-5 md:px-4 sm:px-3 px-3 lg:py-3 py-[10px] font-medium uppercase rounded-md shadow-lg transition-colors lg:leading-5 duration-300 bg-gradient-to-tr from-[20%]';

  const variantClasses = {
    primary:
      'bg-primary-900 from-primary-900 to-primary-800/70 text-white hover:bg-primary-700',
    secondary:
      'bg-gray-600 from-gray-600 to-gray-900/70 text-white hover:bg-gray-500',
    destructive:
      'bg-red-900 from-red-900 to-red-600/40 text-white hover:bg-red-700',
  };

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {children || label}
    </button>
  );
};

export default Button;
