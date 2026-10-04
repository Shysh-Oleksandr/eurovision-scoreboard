'use client';

import {
  ArrowDownToLine,
  ArrowUpToLine,
  Dices,
  LayoutGrid,
  List,
  ListRestartIcon,
  Share,
  ShuffleIcon,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import Tabs from '../../../common/tabs/Tabs';
import { CountrySortableItem } from '../../event-stage/CountrySortableItem';

import SortAZIcon from '@/assets/icons/SortAZIcon';
import SortZAIcon from '@/assets/icons/SortZAIcon';
import Button from '@/components/common/Button';
import { SortableList } from '@/components/common/sort/SortableList';
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

const HalfDivider: React.FC<{ half: 1 | 2; count: number }> = ({
  half,
  count,
}) => {
  const t = useTranslations('setup.allocationDraw');

  return (
    <div
      role="presentation"
      className={`dp-ro-divider ${
        half === 1 ? 'dp-ro-divider--first' : ''
      } col-span-full flex items-center gap-2.5 px-0.5 ${
        half === 1 ? 'pt-1 pb-1 text-white/70' : 'pt-3 pb-1 text-white'
      } text-[11.5px] font-extrabold tracking-[.09em] uppercase`}
    >
      <span>{half === 1 ? t('firstHalf') : t('secondHalf')}</span>
      <em className="not-italic font-bold tracking-normal text-white/70 order-2">
        {count}
      </em>
    </div>
  );
};

export const RunningOrderTab = ({
  stageId,
  orderedCountries,
  firstHalfSize = null,
  selectedLayout,
  setSelectedLayout,
  onSortEnd,
  onQuickSort,
  onShare,
  onDrawHalves,
  onRemoveHalves,
  onMoveToOtherHalf,
}: {
  stageId: string;
  orderedCountries: Country[];
  /** Allocation-draw halves: index where the second half starts; null = no halves. */
  firstHalfSize?: number | null;
  selectedLayout: 'list' | 'grid';
  setSelectedLayout: (layout: 'list' | 'grid') => void;
  onSortEnd: (oldIndex: number, newIndex: number) => void;
  onQuickSort: (sort: 'az' | 'za' | 'shuffle' | 'reset') => void;
  onShare: () => void;
  /** Allocation draw: draw halves for a stage that has none (e.g. the final). */
  onDrawHalves?: () => void;
  onRemoveHalves?: () => void;
  onMoveToOtherHalf?: (code: string) => void;
}) => {
  const t = useTranslations('setup.eventStageModal');
  const tCommon = useTranslations('common');
  const tDraw = useTranslations('setup.allocationDraw');

  const layoutValue = useMemo(
    () => selectedLayout || ScoreboardMobileLayout.ONE_COLUMN,
    [selectedLayout],
  );
  const hasHalves =
    firstHalfSize !== null &&
    firstHalfSize >= 0 &&
    firstHalfSize <= orderedCountries.length &&
    orderedCountries.length > 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-white">
            {t('participants', { count: orderedCountries.length })}
          </h3>
          <p className="text-white/50 text-sm">{t('dragAndDropToReorder')}</p>
        </div>
        <div className="flex items-center flex-wrap sm:gap-3 gap-2 sm:w-auto w-full">
          <div className="flex items-center sm:gap-2 gap-1">
            <ActionButton
              onClick={() => onQuickSort('az')}
              title={tCommon('sortAZ')}
              icon={<SortAZIcon className="w-5 h-5" />}
            />
            <ActionButton
              onClick={() => onQuickSort('za')}
              title={tCommon('sortZA')}
              icon={<SortZAIcon className="w-5 h-5" />}
            />
            <ActionButton
              onClick={() => onQuickSort('shuffle')}
              title={tCommon('shuffle')}
              icon={<ShuffleIcon className="w-5 h-5" />}
            />
            <ActionButton
              onClick={() => onQuickSort('reset')}
              title={tCommon('resetList')}
              icon={<ListRestartIcon className="w-5 h-5" />}
            />
          </div>
          <Tabs
            tabs={layoutTabs}
            activeTab={layoutValue}
            setActiveTab={(tab) => setSelectedLayout(tab as 'list' | 'grid')}
            containerClassName="!p-[3px] ml-auto !overflow-hidden !h-11 !w-[112px]"
            overlayClassName="!inset-y-[2px]"
            buttonClassName="!py-0 !px-0 h-full"
          />
        </div>
      </div>

      {hasHalves ? (
        <div className="flex items-start gap-2 flex-wrap">
          <p className="flex-1 min-w-[200px] flex gap-2 items-start m-0 text-[12.5px] font-semibold text-white/70 leading-[1.4] text-pretty">
            <Dices className="dp-accent-ink size-[15px] flex-none mt-px" />
            <span>{tDraw('roHalvesNote')}</span>
          </p>
          {onRemoveHalves && (
            <Button
              variant="surface"
              size="sm"
              Icon={<X className="size-3.5" />}
              onClick={onRemoveHalves}
            >
              {tDraw('roRemoveHalves')}
            </Button>
          )}
        </div>
      ) : (
        onDrawHalves &&
        orderedCountries.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="surface"
              size="sm"
              Icon={<Dices className="size-4" />}
              onClick={onDrawHalves}
            >
              {tDraw('roDrawHalves')}
            </Button>
            <span className="text-[12.5px] font-semibold text-white/55 text-pretty">
              {tDraw('roDrawHalvesHint')}
            </span>
          </div>
        )
      )}

      <SortableList
        onSortEnd={onSortEnd}
        className={`${
          selectedLayout === 'grid'
            ? 'grid md:grid-cols-4 2cols:grid-cols-3 grid-cols-2 gap-2'
            : 'flex flex-col gap-2'
        }`}
        draggedItemClassName="dragged"
      >
        {orderedCountries.flatMap((country, index) => {
          const items: React.ReactNode[] = [];

          if (hasHalves && index === 0) {
            items.push(
              <HalfDivider key="half-1" half={1} count={firstHalfSize!} />,
            );
          }
          if (hasHalves && index === firstHalfSize) {
            items.push(
              <HalfDivider
                key="half-2"
                half={2}
                count={orderedCountries.length - firstHalfSize!}
              />,
            );
          }
          const inFirstHalf = hasHalves && index < firstHalfSize!;
          const moveLabel = inFirstHalf
            ? tDraw('roMoveToSecondHalf')
            : tDraw('roMoveToFirstHalf');

          items.push(
            <CountrySortableItem
              key={country.code}
              id={country.code}
              country={country}
              stageId={stageId}
              withGroupLabel={false}
              index={index}
              actions={
                hasHalves && onMoveToOtherHalf ? (
                  <button
                    type="button"
                    aria-label={moveLabel}
                    title={moveLabel}
                    className="ml-auto mr-1 w-7 h-7 rounded-lg grid place-items-center text-white/55 hover:text-white hover:bg-white/10 flex-none"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveToOtherHalf(country.code);
                    }}
                  >
                    {inFirstHalf ? (
                      <ArrowDownToLine className="size-4" />
                    ) : (
                      <ArrowUpToLine className="size-4" />
                    )}
                  </button>
                ) : undefined
              }
            />,
          );

          return items;
        })}
        {hasHalves && firstHalfSize === orderedCountries.length && (
          <HalfDivider key="half-2-end" half={2} count={0} />
        )}
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
