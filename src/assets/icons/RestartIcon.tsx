import React from 'react';

interface RestartIconProps {
  className?: string;
}

export const RestartIcon: React.FC<RestartIconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    className={className}
  >
    <g>
      <path d="M15,6V1.76l-1.7,1.7A7,7,0,1,0,14.92,9H13.51a5.63,5.63,0,1,1-1.2-4.55L10.76,6Z" />
    </g>
  </svg>
);
