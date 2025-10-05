import React from 'react';

interface CircleXIconProps {
  className?: string;
}

export const CircleXIcon: React.FC<CircleXIconProps> = ({ className }) => (
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
    <path d="M4.929 4.929 19.07 19.071" />
    <circle cx="12" cy="12" r="10" />
  </svg>
);
