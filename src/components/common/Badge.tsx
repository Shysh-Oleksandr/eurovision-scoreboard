import React from 'react';

type BadgeProps = {
  label: string;
  onClick: () => void;
  isActive: boolean;
  className?: string;
};

const Badge: React.FC<BadgeProps> = ({
  label,
  onClick,
  isActive,
  className = '',
}) => (
  <button
    onClick={onClick}
    className={`xs:px-4 px-3 py-1 text-base font-medium rounded-full whitespace-nowrap transition-colors ${
      isActive
        ? 'bg-primary-800 text-white'
        : 'bg-primary-900 hover:bg-primary-800 text-gray-300'
    } ${className}`}
  >
    {label}
  </button>
);

export default Badge;
