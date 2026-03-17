'use client';

import {
  LayoutGrid,
  List,
  ListRestartIcon,
  Share,
  ShuffleIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';
import SortableList from 'react-easy-sort';

import Tabs from '../../../common/tabs/Tabs';
import { CountrySortableItem } from '../../event-stage/CountrySortableItem';

import SortAZIcon from '@/assets/icons/SortAZIcon';
import SortZAIcon from '@/assets/icons/SortZAIcon';
import Button from '@/components/common/Button';
import type { Country } from '@/models';
import { ScoreboardMobileLayout } from '@/state/generalStore';

const layoutTabs = [
  {
    value: 'grid',
    label: <LayoutGrid className="w-6 h-6" />,
  },
  {
    value: 'list',
    label: <List className="w-6 h-6" />,
  },
];

export const RunningOrderTab = ({
  stageId,
  orderedCountries,
  selectedLayout,
  setSelectedLayout,
  onSortEnd,
  onQuickSort,
  onShare,
}: {
  stageId: string;
  orderedCountries: Country[];
  selectedLayout: 'list' | 'grid';
  setSelectedLayout: (layout: 'list' | 'grid') => void;
  onSortEnd: (oldIndex: number, newIndex: number) => void;
  onQuickSort: (sort: 'az' | 'za' | 'shuffle' | 'reset') => void;
  onShare: () => void;
}) => {
  const t = useTranslations('setup.eventStageModal');

  const layoutValue = useMemo(
    () => selectedLayout || ScoreboardMobileLayout.ONE_COLUMN,
    [selectedLayout],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-white">
            {t('participants', { count: orderedCountries.length })}
          </h3>
          <p className="text-white/50 text-sm">{t('dragAndDropToReorder')}</p>
        </div>
        <div className="flex items-center flex-wrap sm:gap-3 gap-2">
          <div className="flex items-center sm:gap-2 gap-1">
            <ActionButton
              onClick={() => onQuickSort('az')}
              title="Sort A-Z"
              icon={<SortAZIcon className="w-5 h-5" />}
            />
            <ActionButton
              onClick={() => onQuickSort('za')}
              title="Sort Z-A"
              icon={<SortZAIcon className="w-5 h-5" />}
            />
            <ActionButton
              onClick={() => onQuickSort('shuffle')}
              title="Shuffle"
              icon={<ShuffleIcon className="w-5 h-5" />}
            />
            <ActionButton
              onClick={() => onQuickSort('reset')}
              title="Reset list"
              icon={<ListRestartIcon className="w-5 h-5" />}
            />
          </div>
          <Tabs
            tabs={layoutTabs}
            activeTab={layoutValue}
            setActiveTab={(tab) => setSelectedLayout(tab as 'list' | 'grid')}
            containerClassName="!px-0 !py-0 !overflow-hidden !h-10 !w-32"
            overlayClassName="!top-0 !h-10"
          />
        </div>
      </div>

      <SortableList
        onSortEnd={onSortEnd}
        className={`${
          selectedLayout === 'grid'
            ? 'grid md:grid-cols-4 2cols:grid-cols-3 grid-cols-2 gap-2'
            : 'flex flex-col gap-2'
        }`}
        draggedItemClassName="dragged"
      >
        {orderedCountries.map((country, index) => (
          <CountrySortableItem
            key={country.code}
            id={country.code}
            country={country}
            stageId={stageId}
            withGroupLabel={false}
            index={index}
          />
        ))}
      </SortableList>
      <Button
        variant="tertiary"
        className="w-full justify-center mt-2"
        Icon={<Share className="w-5 h-5" />}
        onClick={onShare}
      >
        {t('shareRunningOrder')}
      </Button>
    </div>
  );
};

const ActionButton = ({
  onClick,
  title,
  icon,
}: {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
}) => {
  return (
    <Button
      onClick={onClick}
      className="!p-2.5"
      aria-label={title}
      title={title}
    >
      {icon}
    </Button>
  );
};
