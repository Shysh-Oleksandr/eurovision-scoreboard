import React from 'react';

import Button from '@/components/common/Button';
import { Input } from '@/components/Input';

interface ThemesSearchHeaderProps {
  search: string;
  onSearchChange: (search: string) => void;
  onCreateNew?: () => void;
}

const ThemesSearchHeader: React.FC<ThemesSearchHeaderProps> = ({
  onCreateNew,
  search,
  onSearchChange,
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

      {onCreateNew && (
        <Button variant="tertiary" onClick={onCreateNew}>
          Create
        </Button>
      )}
    </div>
  );
};

export default ThemesSearchHeader;
