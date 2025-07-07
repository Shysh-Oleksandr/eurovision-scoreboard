import React from 'react';

import Button from '../common/Button';

import { PlusIcon } from '@/assets/icons/PlusIcon';

interface AddEventStageButtonProps {
  onClick: () => void;
}

const AddEventStageButton: React.FC<AddEventStageButtonProps> = ({
  onClick,
}) => {
  return (
    <Button
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onClick();
      }}
      className="justify-center flex items-center !p-2"
    >
      <PlusIcon className="w-8 h-8" />
    </Button>
  );
};

export default AddEventStageButton;
