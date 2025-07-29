import React from 'react';
import { SortableItem } from 'react-easy-sort';

import { DragGripIcon } from '@/assets/icons/DragGripIcon';
import { SparklesIcon } from '@/assets/icons/SparklesIcon';
import { XCloseIcon } from '@/assets/icons/XClose';
import { Input } from '@/components/Input';

interface PointItemProps {
  id: number;
  value: string;
  showDouzePoints: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  onRemove: () => void;
  onDouzePointsToggle: () => void;
}

export const PointItem: React.FC<PointItemProps> = ({
  id,
  value,
  showDouzePoints,
  onChange,
  onBlur,
  onRemove,
  onDouzePointsToggle,
}) => {
  return (
    <SortableItem key={id}>
      <div className="flex items-center bg-primary-800 bg-gradient-to-bl from-[10%] from-primary-800 to-primary-700/60 py-1 rounded-md z-10 cursor-grab relative overflow-visible">
        <button
          onClick={onDouzePointsToggle}
          className="absolute -left-3 -top-3 p-2"
          title={
            showDouzePoints
              ? 'Disable DouzePoints animation'
              : 'Enable DouzePoints animation'
          }
        >
          <SparklesIcon
            className={`w-4 h-4 transition-all duration-300 ${
              showDouzePoints ? 'text-yellow-300' : 'text-gray-500'
            }`}
          />
        </button>
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
