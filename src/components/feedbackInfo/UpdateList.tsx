import React from 'react';

import { UpdateItem, getDateLabel } from './types';

interface UpdateListProps {
  items: UpdateItem[];
}

const UpdateList: React.FC<UpdateListProps> = ({ items }) => {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.date ? `${item.date}-${item.title}` : item.title}
          className="border-l-2 rounded border-solid border-white sm:pl-4 pl-3 bg-gradient-to-r from-primary-800/30 to-primary-900/30 shadow-sm rounded-r-lg sm:w-fit w-full sm:p-1 p-0.5 pr-2"
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
