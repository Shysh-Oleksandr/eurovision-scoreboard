import React from 'react';
import SortableList from 'react-easy-sort';

import { AddPointButton } from './AddPointButton';
import { PointItem } from './PointItem';

import { PointsItem } from '@/state/generalStore';

interface PointsListProps {
  points: PointsItem[];
  onSortEnd: (oldIndex: number, newIndex: number) => void;
  onPointChange: (index: number, value: string) => void;
  onPointBlur: (index: number) => void;
  onPointRemove: (index: number) => void;
  onPointAdd: (value: string) => void;
  onDouzePointsToggle: (index: number) => void;
}

export const PointsList: React.FC<PointsListProps> = ({
  points,
  onSortEnd,
  onPointChange,
  onPointBlur,
  onPointRemove,
  onPointAdd,
  onDouzePointsToggle,
}) => {
  return (
    <SortableList
      onSortEnd={onSortEnd}
      className="flex flex-wrap gap-2"
      draggedItemClassName="dragged"
    >
      {points.map((item, index) => (
        <PointItem
          key={item.id}
          id={item.id}
          value={String(item.value)}
          showDouzePoints={item.showDouzePoints}
          onChange={(value) => onPointChange(index, value)}
          onBlur={() => onPointBlur(index)}
          onRemove={() => onPointRemove(index)}
          onDouzePointsToggle={() => onDouzePointsToggle(index)}
        />
      ))}
      <AddPointButton onAdd={onPointAdd} />
    </SortableList>
  );
};
