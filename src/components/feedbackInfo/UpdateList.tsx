import React from 'react';

import { UpdateItem, getDateLabel } from './types';

interface UpdateListProps {
  items: UpdateItem[];
}

const UpdateList: React.FC<UpdateListProps> = ({ items }) => {
  return (
    <ul className="sm:space-y-3 space-y-2">
      {items.map((item) => (
        <li
          key={item.date ? `${item.date}-${item.title}` : item.title}
          className="border-l-2 rounded border-solid border-white sm:pl-4 pl-3"
        >
          <p className="text-white/70 text-sm font-medium">
            {getDateLabel(item)}
          </p>
          <p className="mt-1">{item.title}</p>
        </li>
      ))}
    </ul>
  );
};

export default UpdateList;
