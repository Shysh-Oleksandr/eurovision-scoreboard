import React from 'react';

interface ListRestartIconProps {
  className?: string;
}

export const ListRestartIcon: React.FC<ListRestartIconProps> = ({
  className,
}) => (
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
    <path d="M21 5H3" />
    <path d="M7 12H3" />
    <path d="M7 19H3" />
    <path d="M12 18a5 5 0 0 0 9-3 4.5 4.5 0 0 0-4.5-4.5c-1.33 0-2.54.54-3.41 1.41L11 14" />
    <path d="M11 10v4h4" />
  </svg>
);
