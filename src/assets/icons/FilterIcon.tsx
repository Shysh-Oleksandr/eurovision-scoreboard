import React from 'react';

interface FilterIconProps {
  className?: string;
}

export const FilterIcon: React.FC<FilterIconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M2 5h20" />
    <path d="M6 12h12" />
    <path d="M9 19h6" />
  </svg>
);
