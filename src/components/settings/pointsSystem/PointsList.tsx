import React from 'react';
import SortableList from 'react-easy-sort';

import { AddPointButton } from './AddPointButton';
import { PointItem } from './PointItem';

interface Point {
  id: number;
  value: string;
}

interface PointsListProps {
  points: Point[];
  onSortEnd: (oldIndex: number, newIndex: number) => void;
  onPointChange: (index: number, value: string) => void;
  onPointBlur: (index: number) => void;
  onPointRemove: (index: number) => void;
  onPointAdd: (value: string) => void;
}

export const PointsList: React.FC<PointsListProps> = ({
  points,
  onSortEnd,
  onPointChange,
  onPointBlur,
  onPointRemove,
  onPointAdd,
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
          value={item.value}
          onChange={(value) => onPointChange(index, value)}
          onBlur={() => onPointBlur(index)}
          onRemove={() => onPointRemove(index)}
        />
      ))}
      <AddPointButton onAdd={onPointAdd} />
    </SortableList>
  );
};
