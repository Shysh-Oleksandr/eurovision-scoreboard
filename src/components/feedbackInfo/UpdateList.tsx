import React, { useState } from 'react';

import { UpdateItem, getDateLabel } from './types';

interface UpdateListProps {
  items: UpdateItem[];
  compact?: boolean;
  initialCount?: number;
  loadMoreCount?: number;
}

const UpdateList = ({
  items,
  compact = false,
  initialCount = 5,
  loadMoreCount = 5,
}: UpdateListProps) => {
  const [displayCount, setDisplayCount] = useState(
    compact ? initialCount : items.length,
  );

  const handleLoadMore = () => {
    setDisplayCount((prev) => Math.min(prev + loadMoreCount, items.length));
  };

  const displayedItems = items.slice(0, displayCount);
  const hasMoreItems = displayCount < items.length;

  return (
    <div className="space-y-1">
      <ul className="space-y-2">
        {displayedItems.map((item) => (
          <li
            key={item.date ? `${item.date}-${item.title}` : item.title}
            className="border-l-2 rounded border-solid border-white sm:pl-4 pl-3 bg-gradient-to-r from-primary-800/30 to-primary-900/30 shadow-sm rounded-r-lg sm:w-fit w-full sm:p-1 p-0.5 pr-2"
          >
            <p className="text-white/70 text-sm font-medium">
              {getDateLabel(item)}
            </p>
            <p className="mt-0.5 leading-normal">{item.title}</p>
          </li>
        ))}
      </ul>

      {compact && hasMoreItems && (
        <button
          onClick={handleLoadMore}
          className="text-primary-300 w-full hover:text-primary-200 py-3 text-sm font-medium transition-colors duration-200 hover:underline"
        >
          Load {Math.min(loadMoreCount, items.length - displayCount)} more
          updates
        </button>
      )}
    </div>
  );
};

export default UpdateList;
