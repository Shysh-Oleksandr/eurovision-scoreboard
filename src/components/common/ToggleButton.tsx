import React from 'react';

type ToggleButtonProps = {
  isActive: boolean;
  onToggle: () => void;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'>;

export const ToggleButton = ({
  isActive,
  onToggle,
  className = '',
}: ToggleButtonProps) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-[23px] w-12 items-center rounded-full transition-colors focus:outline-none hover:bg-primary-700/70 ${
        isActive ? 'bg-primary-700' : 'bg-primary-800'
      } ${className}`}
    >
      <span
        className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow-sm transition-transform ${
          isActive ? 'translate-x-[21px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
};
