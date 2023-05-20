import React from 'react';

import { ScoreboardAction, ScoreboardActionKind } from '../models';

import Button from './Button';

type Props = {
  className?: string;
  dispatch: React.Dispatch<ScoreboardAction>;
};

const StartOverButton = ({ className, dispatch }: Props) => {
  const handleStartOver = () => {
    dispatch({ type: ScoreboardActionKind.START_OVER });
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
