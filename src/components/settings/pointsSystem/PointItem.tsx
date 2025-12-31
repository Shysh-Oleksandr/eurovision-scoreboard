import React from 'react';

import { SparklesIcon } from '@/assets/icons/SparklesIcon';
import { CustomSortableItem } from '@/components/common/CustomSortableItem';
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
    <CustomSortableItem id={id} key={id} onRemove={onRemove}>
      <button
        onClick={onDouzePointsToggle}
        className="absolute -left-3 -top-3 p-2 hover:scale-125 transition-transform duration-300"
        title={
          showDouzePoints
            ? 'Disable DouzePoints animation'
            : 'Enable DouzePoints animation'
        }
      >
        <SparklesIcon
          className={`w-4 h-4 transition-all duration-300 ${
            showDouzePoints ? 'text-yellow-300' : 'text-white/60'
          }`}
        />
      </button>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-full text-center h-8 !px-0 bg-transparent bg-none md:mr-0 mr-1"
        step={1}
      />
    </CustomSortableItem>
  );
};
