import React from 'react';

import Button from '@/components/common/Button';
import Select from '@/components/common/Select';
import { Input } from '@/components/Input';

type SortBy = 'createdAt' | 'likes';

const sortByOptions = [
  { value: 'createdAt', label: 'Most Recent' },
  { value: 'likes', label: 'Most Liked' },
];

interface ThemesSearchHeaderProps {
  search: string;
  onSearchChange: (search: string) => void;
  sortBy: SortBy;
  onSortByChange: (sortBy: SortBy) => void;
  onCreateNew?: () => void;
}

const ThemesSearchHeader: React.FC<ThemesSearchHeaderProps> = ({
  onCreateNew,
  search,
  onSearchChange,
  // sortBy,
  // onSortByChange,
}) => {
  return (
    <div className="flex flex-col xs:flex-row gap-2 items-stretch xs:items-center">
      <Input
        type="text"
        placeholder="Search themes..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 text-sm"
      />
      {/* <Select
        id="sortBy"
        value={sortBy}
        onChange={(e) => onSortByChange(e.target.value as SortBy)}
        aria-label="Select sort by"
        options={sortByOptions}
        className="py-2.5 px-3 bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/60 lg:text-[0.95rem] text-sm hover:bg-primary-800"
        arrowClassName="!w-6 !h-6"
      >
        <span className="flex-1">
          {sortBy === 'createdAt' ? 'Most Recent' : 'Most Liked'}
        </span>
      </Select> */}
      {onCreateNew && (
        <Button variant="tertiary" onClick={onCreateNew}>
          Create
        </Button>
      )}
    </div>
  );
};

export default ThemesSearchHeader;
