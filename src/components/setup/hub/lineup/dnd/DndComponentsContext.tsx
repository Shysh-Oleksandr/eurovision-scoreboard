'use client';
import React, { createContext, RefObject, useContext } from 'react';

import CountryTile, { CountryTileProps } from '../CountryTile';

export interface DropZoneProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section';
  innerRef?: React.Ref<HTMLDivElement>;
}

export interface DndComponents {
  Tile: React.ComponentType<CountryTileProps>;
  DropZone: React.ComponentType<DropZoneProps>;
}

const PlainDropZone: React.FC<DropZoneProps> = ({
  children,
  className,
  as = 'div',
  innerRef,
}) => {
  const Tag = as;

  return (
    <Tag className={className} ref={innerRef}>
      {children}
    </Tag>
  );
};

/**
 * The lineup renders tiles and drop zones through this context so the
 * drag-and-drop implementation (`LineupDndProvider`, a lazy chunk) can swap in
 * draggable/droppable versions without the lineup importing dnd-kit.
 */
export const DndComponentsContext = createContext<DndComponents>({
  Tile: CountryTile,
  DropZone: PlainDropZone,
});

export const useDndComponents = () => useContext(DndComponentsContext);

/**
 * `current` is true during the commit in which `LineupDndBoundary` swaps the
 * draggable components in. That swap remounts the whole lineup, so whatever
 * mounts in it is not a reveal (the stage tiles skip their entrance).
 */
export const DndSwapContext = createContext<RefObject<boolean>>({
  current: false,
});
