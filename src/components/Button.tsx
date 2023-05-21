import React from 'react';

type Props = {
  label: string;
  className?: string;
  onClick: () => void;
};

const Button = ({ label, className, onClick }: Props) => {
  return (
    <button
      className={`bg-blue-900 lg:text-base md:text-sm text-xs lg:px-5 md:px-4 sm:px-3 px-2 lg:py-3 md:py-2 py-[6px] text-white font-medium uppercase rounded-md shadow-lg transition-colors lg:leading-5 duration-300 hover:bg-blue-800 ${className}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

export default Button;
