import React from 'react';

type Props = {
  className?: string;
  withTransition?: boolean;
};

const RoundedTriangle = ({ className, withTransition = true }: Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="86.921 205.97 75.066 144.831"
    width="100%"
    height="100%"
    className={`triangle ${className} !bg-transparent scale-y-[1.05] ${
      withTransition ? '!transition-colors !duration-500' : ''
    }`}
    preserveAspectRatio="none"
  >
    <path
      fill="currentColor"
      d="M 153.493 206.086 C 155.365 228.175 129.342 323.85 98.659 350.62 L 164.411 350.417 L 164.207 206.034 L 153.493 206.086 Z"
    />
  </svg>
);

export default RoundedTriangle;
