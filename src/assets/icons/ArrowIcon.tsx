import React from 'react';

export const ArrowIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M6 11L6 4L10.5 7.5L6 11Z" fill="currentColor"></path>
    </svg>
  );
};
