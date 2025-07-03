import React from 'react';

type Props = {
  label: string;
  checked: boolean;
  onChange: () => void;
  className?: string;
};

const RadioButton = ({ label, checked, onChange, className = '' }: Props) => {
  return (
    <div
      className={`flex items-center cursor-pointer ${className}`}
      onClick={onChange}
    >
      <div
        className={`w-4 h-4 rounded-full border-2 transition-all duration-200 mr-2 ${
          checked
            ? 'border-primary-500 bg-primary-500'
            : 'border-gray-400 bg-transparent'
        }`}
      >
        {checked && (
          <div className="w-full h-full rounded-full bg-white scale-50 transition-transform duration-200" />
        )}
      </div>
      <span
        className={`lg:text-base text-sm transition-colors duration-200 ${
          checked ? 'text-white font-medium' : 'text-gray-300'
        }`}
      >
        {label}
      </span>
    </div>
  );
};

export default RadioButton;
