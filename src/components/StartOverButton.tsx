import React from 'react';

import { useScoreboardStore } from '../state/scoreboardStore';

import Button from './Button';

type Props = {
  className?: string;
};

const StartOverButton = ({ className }: Props) => {
  const { startOver } = useScoreboardStore();

  const handleStartOver = () => {
    startOver();
  };

  return (
    <Button
      label="Start over"
      onClick={handleStartOver}
      className={`w-1/2 ${className}`}
    />
  );
};

export default StartOverButton;
