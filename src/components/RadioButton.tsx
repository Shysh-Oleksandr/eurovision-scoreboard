import React from 'react';

type Props = {
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  className?: string;
};

const RadioButton = ({
  label,
  checked,
  onChange,
  disabled = false,
  className = '',
}: Props) => {
  // Determine container styles
  const getContainerStyles = () => {
    if (disabled) {
      return 'opacity-50 cursor-not-allowed bg-gray-800/20';
    }
    if (checked) {
      return 'bg-primary-600/20 border border-primary-500/50';
    }

    return 'bg-gray-700/20 border border-gray-600/50 hover:bg-gray-600/30 hover:border-gray-500/70';
  };

  // Determine radio circle styles
  const getRadioStyles = () => {
    if (disabled) {
      return 'border-gray-500 bg-gray-700';
    }
    if (checked) {
      return 'border-primary-400 bg-primary-500';
    }

    return 'border-gray-400 bg-transparent';
  };

  // Determine text styles
  const getTextStyles = () => {
    if (disabled) {
      return 'text-gray-500';
    }
    if (checked) {
      return 'text-white';
    }

    return 'text-gray-300';
  };

  return (
    <label
      className={`flex items-center space-x-3 p-3 rounded-md transition-all duration-200 cursor-pointer ${getContainerStyles()} ${className}`}
      onClick={disabled ? undefined : onChange}
    >
      <div className="relative">
        <input
          type="radio"
          checked={checked}
          disabled={disabled}
          onChange={() => {}} // Controlled by onClick
          className="sr-only"
        />
        <div
          className={`w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${getRadioStyles()}`}
        >
          {checked && (
            <div
              className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                disabled ? 'bg-gray-400' : 'bg-white'
              }`}
            />
          )}
        </div>
      </div>
      <span
        className={`text-sm font-medium transition-colors duration-200 ${getTextStyles()}`}
      >
        {label}
      </span>
    </label>
  );
};

export default RadioButton;
