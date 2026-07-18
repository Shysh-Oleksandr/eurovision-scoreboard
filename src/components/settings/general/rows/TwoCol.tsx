import React from 'react';

import { TwoColItem } from '../model/types';

import { FieldRow } from './FieldRow';

interface TwoColProps {
  item: TwoColItem;
  query?: string;
}

export const TwoCol: React.FC<TwoColProps> = ({ item, query }) => (
  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
    {item.items.map((field) => (
      <FieldRow key={field.id} item={field} query={query} />
    ))}
  </div>
);
