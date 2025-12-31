'use client';
import React, { ReactNode } from 'react';

import SnowPileEffect from '../effects/SnowPileEffect';

type Props = {
  label?: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive';
  title?: string;
  children?: ReactNode;
  disabled?: boolean;
  Icon?: React.ReactNode;
  isLoading?: boolean;
  snowEffect?: 'left' | 'right' | 'middle' | 'none';
  snowEffectClassName?: string;
};

const Button = ({
  label,
  className = '',
  onClick,
  variant = 'primary',
  children,
  title,
  disabled,
  Icon,
  isLoading,
  snowEffect = 'none',
  snowEffectClassName = '',
}: Props) => {
  const baseClasses =
    'lg:text-base md:text-base text-sm lg:px-5 md:px-4 sm:px-3 px-3 lg:py-3 py-[10px] font-medium uppercase rounded-md shadow-lg transition-colors lg:leading-5 duration-300 bg-gradient-to-tr from-[20%] relative';

  const variantClasses = {
    primary:
      'bg-primary-900 from-primary-900 to-primary-800/70 text-white hover:bg-primary-700',
    secondary:
      'bg-gray-600 from-gray-600 to-gray-900/70 text-white hover:bg-gray-500',
    tertiary:
      'bg-primary-800 from-primary-800 to-gray-600/70 text-white hover:bg-gray-500',
    destructive:
      'bg-red-900 from-red-900 to-red-600/40 text-white hover:bg-red-700',
  };

  const childrenContent = children || label;

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${
        Icon ? 'flex items-center gap-2' : ''
      } ${Icon && !childrenContent ? '!p-2' : ''} ${className} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${isLoading ? 'flex justify-center' : ''}`}
      onClick={onClick}
      title={title}
      disabled={disabled || isLoading}
    >
      <SnowPileEffect snowEffect={snowEffect} className={snowEffectClassName} />
      {isLoading ? (
        // TODO: fancy loading spinner
        <span className="loader" />
      ) : (
        <>
          {Icon}
          {childrenContent}
        </>
      )}
    </button>
  );
};

export default Button;
