import React from 'react';

const getRadialGradient = (color: string) =>
  `radial-gradient(160% 183% at left -65% top -65%, transparent 99%, ${color})`;

type Props = {
  color: string;
};

const RoundedTriangle = ({ color }: Props) => (
  <div
    className="triangle"
    style={{
      backgroundImage: getRadialGradient(color),
    }}
  />
);

export default RoundedTriangle;
