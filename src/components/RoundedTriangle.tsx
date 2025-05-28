import React from 'react';

const getRadialGradient = (color: string) =>
  `radial-gradient(160% 183% at left -65% top -65%, transparent 99%, ${color})`;

type Props = {
  color?: string;
  className?: string;
};

const RoundedTriangle = ({ color, className }: Props) => (
  <div
    className={`triangle ${className || ''}`}
    style={{
      backgroundImage: color ? getRadialGradient(color) : undefined,
    }}
  />
);

export default RoundedTriangle;
