import React, { ReactNode } from 'react';

type Props = {
  label?: string;
  className?: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  children?: ReactNode;
};

const Button = ({
  label,
  className = '',
  onClick,
  variant = 'primary',
  children,
}: Props) => {
  const baseClasses =
    'lg:text-base md:text-base text-sm lg:px-5 md:px-4 sm:px-3 px-3 lg:py-3 py-[10px] font-medium uppercase rounded-md shadow-lg transition-colors lg:leading-5 duration-300 bg-gradient-to-tr from-[20%]';

  const variantClasses = {
    primary:
      'bg-primary-900 from-primary-900 to-primary-800/70 text-white hover:bg-primary-700',
    secondary:
      'bg-gray-700 from-gray-700 to-gray-600/70 text-white hover:bg-gray-500',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
    >
      {children || label}
    </button>
  );
};

export default Button;
