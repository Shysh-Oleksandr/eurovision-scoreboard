import React from 'react';
import { SortableItem } from 'react-easy-sort';

import { DragGripIcon } from '@/assets/icons/DragGripIcon';
import { XCloseIcon } from '@/assets/icons/XClose';

interface CustomSortableItemProps {
  id: number | string;
  onRemove: () => void;
  children: React.ReactNode;
}

export const CustomSortableItem: React.FC<CustomSortableItemProps> = ({
  id,
  onRemove,
  children,
}) => {
  return (
    <SortableItem key={id}>
      <div className="flex items-center bg-primary-800 bg-gradient-to-bl from-[10%] from-primary-800 to-primary-700/60 py-1 rounded-md z-10 cursor-grab relative overflow-visible">
        <div className="h-full flex items-center justify-center mr-0.5">
          <DragGripIcon className="w-6 h-6 text-white" />
        </div>
        {children}
        <button onClick={onRemove} className="ml-auto pr-1 group">
          <XCloseIcon className="w-6 h-6 text-white group-hover:text-red-200 transition-colors duration-300" />
        </button>
      </div>
    </SortableItem>
  );
};
