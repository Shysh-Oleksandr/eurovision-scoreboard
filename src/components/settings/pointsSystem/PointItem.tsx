import React from 'react';
import { SortableItem } from 'react-easy-sort';

import { DragGripIcon } from '@/assets/icons/DragGripIcon';
import { XCloseIcon } from '@/assets/icons/XClose';
import { Input } from '@/components/Input';

interface PointItemProps {
  id: number;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onRemove: () => void;
}

export const PointItem: React.FC<PointItemProps> = ({
  id,
  value,
  onChange,
  onBlur,
  onRemove,
}) => {
  return (
    <SortableItem key={id}>
      <div className="flex items-center bg-primary-800 bg-gradient-to-bl from-[10%] from-primary-800 to-primary-700/60 py-1 rounded-md z-10 cursor-grab">
        <div className="h-full flex items-center justify-center">
          <DragGripIcon className="w-6 h-6 text-white" />
        </div>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className="!w-12 h-8 bg-transparent bg-none"
          min={1}
          step={1}
        />
        <button onClick={onRemove} className="ml-auto pr-1">
          <XCloseIcon className="w-6 h-6 text-white" />
        </button>
      </div>
    </SortableItem>
  );
};
