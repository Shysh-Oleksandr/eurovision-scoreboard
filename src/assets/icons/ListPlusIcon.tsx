import React from 'react';

interface ListPlusIconProps {
  className?: string;
}

export const ListPlusIcon: React.FC<ListPlusIconProps> = ({ className }) => (
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
    <path d="M16 5H3" />
    <path d="M11 12H3" />
    <path d="M16 19H3" />
    <path d="M18 9v6" />
    <path d="M21 12h-6" />
  </svg>
);
