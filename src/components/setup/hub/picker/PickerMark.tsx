import React from 'react';

import { PickerItem } from './pickerItems';

import { getFlagPath } from '@/helpers/getFlagPath';

type MarkSize = 'trigger' | 'latest' | 'tile' | 'row';

const SIZES: Record<
  MarkSize,
  { heart: string; flag: string; swatch: string; thumb: string }
> = {
  trigger: {
    heart: 'size-6',
    flag: 'h-6 w-8 rounded-sm',
    swatch: 'size-[22px]',
    thumb: 'h-[22px] w-8',
  },
  latest: {
    heart: 'size-7',
    flag: 'h-[22px] w-[30px] rounded-sm',
    swatch: 'size-6',
    thumb: 'h-6 w-9',
  },
  tile: {
    heart: 'size-[22px]',
    flag: 'h-4 w-[22px] rounded-sm',
    swatch: 'size-[18px]',
    thumb: 'h-4 w-6',
  },
  row: {
    heart: 'size-6',
    flag: 'h-5 w-7 rounded-sm',
    swatch: 'size-5',
    thumb: 'h-5 w-8',
  },
};

const FALLBACK_FLAG = getFlagPath('ww');

/**
 * A picker item's picture: the host heart (or a saved contest's flag), a
 * built-in theme's background thumbnail (`thumbnail`), or a theme swatch.
 */
const PickerMark = ({
  item,
  size,
  thumbnail = false,
}: {
  item: PickerItem;
  size: MarkSize;
  /** Show a theme's background thumbnail instead of its swatch. */
  thumbnail?: boolean;
}) => {
  const classes = SIZES[size];

  if (item.imageUrl) {
    return (
      <img
        src={item.imageUrl}
        // The item's name is in the text beside it.
        alt=""
        width={24}
        height={24}
        loading="lazy"
        className={`flex-none ${
          item.isHeart === false
            ? `${classes.flag} object-cover`
            : `${classes.heart} object-contain`
        }`}
        onError={(e) => {
          if (e.currentTarget.dataset.fallback) return;
          e.currentTarget.dataset.fallback = '1';
          e.currentTarget.src = FALLBACK_FLAG;
        }}
      />
    );
  }

  if (thumbnail && item.thumbnailUrl) {
    return (
      <span
        aria-hidden="true"
        className={`${classes.thumb} flex-none rounded-[5px] bg-cover bg-center`}
        style={{ backgroundImage: `url(${item.thumbnailUrl})` }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`dp-swatch ${classes.swatch} flex-none rounded-full`}
      style={{ backgroundColor: item.color ?? '#fff' }}
    />
  );
};

export default PickerMark;
