import React, { type ComponentPropsWithoutRef } from 'react';
import BaseSortableList, { SortableItem, SortableKnob } from 'react-easy-sort';

import { cn } from '@/helpers/utils';

type BaseSortableListProps = ComponentPropsWithoutRef<typeof BaseSortableList>;

export type SortableListProps = BaseSortableListProps & {
  /**
   * When true, wraps the list in a scroll container. Use inside flex layouts with
   * a constrained height so drag-and-drop can auto-scroll while sorting.
   */
  scrollable?: boolean;
  /** Extra classes for the scroll wrapper when `scrollable` is true. */
  scrollContainerClassName?: string;
};

/**
 * App-wide wrapper around `react-easy-sort` with scroll-aware drag enabled by
 * default (`autoScroll`). Pass through all upstream props; use `scrollable` when
 * the list itself should own the overflow container.
 */
export const SortableList = ({
  autoScroll = true,
  scrollable = false,
  scrollContainerClassName,
  children,
  ...rest
}: SortableListProps) => {
  const list = (
    <BaseSortableList autoScroll={autoScroll} {...rest}>
      {children}
    </BaseSortableList>
  );

  if (!scrollable) {
    return list;
  }

  return (
    <div
      className={cn(
        'narrow-scrollbar overflow-auto flex-1 min-h-0 pb-2',
        scrollContainerClassName,
      )}
    >
      {list}
    </div>
  );
};

export { SortableItem, SortableKnob };
