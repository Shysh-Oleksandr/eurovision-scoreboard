'use client';
import React, { createContext, useContext } from 'react';

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
