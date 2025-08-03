import React, { useState } from 'react';

import { PlusIcon } from '@/assets/icons/PlusIcon';
import Button from '@/components/common/Button';
import { Input } from '@/components/Input';

interface AddPointButtonProps {
  onAdd: (value: string) => void;
}

export const AddPointButton: React.FC<AddPointButtonProps> = ({ onAdd }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newPoint, setNewPoint] = useState('');

  const handleAddPoint = () => {
    if (
      Number(newPoint) < 1 ||
      Number.isNaN(Number(newPoint)) ||
      newPoint.trim() === ''
    ) {
      setIsAdding(false);
      setNewPoint('');

      return;
    }

    if (newPoint.trim() !== '') {
      onAdd(newPoint);
      setNewPoint('');
      setIsAdding(false);
    }
  };

  return (
    <div>
      {isAdding ? (
        <div className="flex items-center">
          <Input
            type="number"
            value={newPoint}
            onChange={(e) => setNewPoint(e.target.value)}
            onBlur={handleAddPoint}
            autoFocus
            className="w-full !h-[35px] text-center !px-0"
          />
        </div>
      ) : (
        <Button
          onClick={() => setIsAdding(true)}
          className="h-full !py-1 !px-4 lg:!px-5 w-full flex justify-center"
        >
          <PlusIcon className="w-7 h-7" />
        </Button>
      )}
    </div>
  );
};
