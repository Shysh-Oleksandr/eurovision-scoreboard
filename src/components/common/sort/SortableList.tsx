import React, { useRef, type ComponentPropsWithoutRef } from 'react';
import BaseSortableList, { SortableItem, SortableKnob } from 'react-easy-sort';

import { cn } from '@/helpers/utils';
import { playHaptic } from '@/native/haptics';

type BaseSortableListProps = ComponentPropsWithoutRef<typeof BaseSortableList>;

export type SortableListProps = BaseSortableListProps & {
  /**
   * When true, wraps the list in a scroll container. Use inside flex layouts with
   * a constrained height so drag-and-drop can auto-scroll while sorting.
   */
  scrollable?: boolean;
  /** Extra classes for the scroll wrapper when `scrollable` is true. */
  scrollContainerClassName?: string;
  /**
   * Index where a divider splits the list (the running order's halves): a
   * drag crossing it gets a distinct haptic instead of the per-slot tick.
   * Children that aren't sortable rows (the divider) carry
   * `data-sortable-ignore` so the row under the pointer can be counted.
   */
  hapticBoundary?: number | null;
};

/** The sortable index of the row a press started on, or null. */
const pressedRowIndex = (event: React.SyntheticEvent): number | null => {
  const container = event.currentTarget as HTMLElement;
  let node = event.target as HTMLElement | null;

  while (node && node.parentElement !== container) node = node.parentElement;
  if (!node) return null;

  let index = 0;

  for (const child of Array.from(container.children)) {
    if (child === node) return index;
    if (!child.hasAttribute('data-sortable-ignore')) index += 1;
  }

  return null;
};

/**
 * App-wide wrapper around `react-easy-sort` with scroll-aware drag enabled by
 * default (`autoScroll`). Pass through all upstream props; use `scrollable` when
 * the list itself should own the overflow container.
 *
 * Haptics (native apps, docs/haptics.md): a lift when a row is picked up, a
 * tick for each slot it passes, a distinct tick across `hapticBoundary`, and
 * a thud on the drop.
 */
export const SortableList = ({
  autoScroll = true,
  scrollable = false,
  scrollContainerClassName,
  hapticBoundary = null,
  onSortStart,
  onSortMove,
  onSortEnd,
  onMouseDownCapture,
  onTouchStartCapture,
  children,
  ...rest
}: SortableListProps) => {
  const pressedIndexRef = useRef<number | null>(null);
  const lastIndexRef = useRef<number | null>(null);
  // The container's handler types are generic over its tag; these only
  // read the event, so they are typed loosely and cast.
  const pressHandlers = {
    onMouseDownCapture: (event: React.MouseEvent) => {
      pressedIndexRef.current = pressedRowIndex(event);
      (onMouseDownCapture as React.MouseEventHandler | undefined)?.(event);
    },
    onTouchStartCapture: (event: React.TouchEvent) => {
      pressedIndexRef.current = pressedRowIndex(event);
      (onTouchStartCapture as React.TouchEventHandler | undefined)?.(event);
    },
  } as unknown as Partial<BaseSortableListProps>;

  const list = (
    <BaseSortableList
      autoScroll={autoScroll}
      {...pressHandlers}
      onSortStart={() => {
        lastIndexRef.current = pressedIndexRef.current;
        playHaptic({ id: 'dragLift' });
        onSortStart?.();
      }}
      onSortMove={(newIndex) => {
        const last = lastIndexRef.current;

        if (newIndex !== last) {
          const crossed =
            hapticBoundary !== null &&
            last !== null &&
            last < hapticBoundary !== newIndex < hapticBoundary;

          playHaptic({ id: crossed ? 'dragBoundary' : 'dragSlot' });
          lastIndexRef.current = newIndex;
        }
        onSortMove?.(newIndex);
      }}
      onSortEnd={(oldIndex, newIndex) => {
        playHaptic({ id: oldIndex === newIndex ? 'dragCancel' : 'dragDrop' });
        onSortEnd(oldIndex, newIndex);
      }}
      {...rest}
    >
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
