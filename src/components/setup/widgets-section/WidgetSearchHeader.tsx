import { useTranslations } from 'next-intl';
import React from 'react';

import SearchInputIcon from '../SearchInputIcon';

import { PlusIcon } from '@/assets/icons/PlusIcon';
import Button from '@/components/common/Button';
import { Input } from '@/components/Input';

interface WidgetSearchHeaderProps {
  search: string;
  onSearchChange: (search: string) => void;
  onCreateNew?: () => void;
  placeholder: string;
  extraActions?: React.ReactNode;
}

const WidgetSearchHeader: React.FC<WidgetSearchHeaderProps> = ({
  onCreateNew,
  search,
  onSearchChange,
  placeholder,
  extraActions,
}) => {
  const t = useTranslations();

  return (
    <div className="flex flex-col xs:flex-row gap-2 items-stretch xs:items-center">
      <div className="relative w-full">
        <Input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pr-10"
        />
        <SearchInputIcon
          showClearIcon={search.length > 0}
          onClick={() => search.length > 0 && onSearchChange('')}
        />
      </div>

      <div className="flex items-center gap-2">
        {onCreateNew && (
          <Button
            variant="tertiary"
            onClick={onCreateNew}
            Icon={<PlusIcon className="w-6 h-6" />}
            className="justify-center w-full"
          >
            {t('common.create')}
          </Button>
        )}
        {extraActions}
      </div>
    </div>
  );
};

export default WidgetSearchHeader;
