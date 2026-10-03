'use client';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import { useSetupUiStore } from '../../state/setupUiStore';
import CountryTile, { CountryTileProps } from '../CountryTile';
import { useLineupActions, useLineupModelContext } from '../LineupProvider';
import { POOL_ROOT_LIST } from '../listIds';
import { poolCategoryOf } from '../useLineupModel';

import { DndComponentsContext, DropZoneProps } from './DndComponentsContext';
import { acceptsDrop, dropDepth, highlightedZone, parseDrop } from './dndIds';

import { useBulkAssignCustomEntryGroupMutation } from '@/api/customEntries';
import { getCustomEntryId } from '@/components/setup/utils/getCustomEntryId';
import { useCountriesStore } from '@/state/countriesStore';
import { useAuthStore } from '@/state/useAuthStore';

const EXPAND_ON_HOVER_MS = 600;

/** Innermost zone under the pointer wins (group > category > pool root; stages are flat). */
const innermostCollision: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  const candidates = within.length > 0 ? within : rectIntersection(args);

  return [...candidates].sort(
    (a, b) => dropDepth(String(b.id)) - dropDepth(String(a.id)),
  );
};

const DraggableTile: React.FC<CountryTileProps> = memo((props) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.country.code,
    data: { listId: props.listId },
  });
  const suppressClick = useRef(false);

  // A completed drag must not also open the tile menu.
  const dragHandleProps = useMemo(
    () => ({
      ...attributes,
      ...listeners,
      onClickCapture: (e: React.MouseEvent) => {
        if (suppressClick.current) {
          suppressClick.current = false;
          e.stopPropagation();
          e.preventDefault();
        }
      },
      onMouseUp: () => {
        if (isDragging) suppressClick.current = true;
      },
      onTouchEnd: () => {
        if (isDragging) suppressClick.current = true;
      },
    }),
    [attributes, listeners, isDragging],
  );

  return (
    <CountryTile
      {...props}
      innerRef={setNodeRef}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    />
  );
});

DraggableTile.displayName = 'DraggableTile';

const DroppableZone: React.FC<DropZoneProps> = ({
  id,
  children,
  className = '',
  as = 'div',
  innerRef,
}) => {
  const { setNodeRef, over } = useDroppable({ id });
  const isOver = !!over && highlightedZone(String(over.id)) === id;
  const Tag = as;
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      if (typeof innerRef === 'function') innerRef(node);
      else if (innerRef) {
        (innerRef as React.MutableRefObject<HTMLDivElement | null>).current =
          node;
      }
    },
    [innerRef, setNodeRef],
  );

  return (
    <Tag ref={ref} className={`${className} ${isOver ? 'dp-drop-on' : ''}`}>
      {children}
    </Tag>
  );
};

const components = { Tile: DraggableTile, DropZone: DroppableZone };

/**
 * dnd-kit wiring for the lineup: tiles drag between stages, the pool, its
 * categories and custom groups. Mouse needs 6px of travel and touch a
 * 250ms hold, so plain clicks/taps still open the tile menu.
 */
const LineupDndProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { byCode } = useLineupModelContext();
  const { move } = useLineupActions();
  const user = useAuthStore((state) => state.user);
  const { mutateAsync: bulkAssignToGroup } =
    useBulkAssignCustomEntryGroupMutation();
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [dragCount, setDragCount] = useState(1);
  const hoverTimer = useRef<{ id: string; timeout: number } | null>(null);
  /** Pool categories the dragged tiles belong to (gates the custom groups). */
  const homeCategories = useRef<ReadonlySet<string>>(new Set());

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
  );

  const clearHoverTimer = () => {
    if (hoverTimer.current) {
      window.clearTimeout(hoverTimer.current.timeout);
      hoverTimer.current = null;
    }
  };

  const draggedCodes = useCallback((code: string) => {
    const { selectionMode, selected } = useSetupUiStore.getState();

    return selectionMode && selected.has(code) ? [...selected] : [code];
  }, []);

  // Zones that can't take the dragged tiles are skipped, so the pointer falls
  // through to the enclosing category instead of highlighting them.
  const collisionDetection = useCallback<CollisionDetection>(
    (args) =>
      innermostCollision({
        ...args,
        droppableContainers: args.droppableContainers.filter((container) =>
          acceptsDrop(String(container.id), homeCategories.current),
        ),
      }),
    [],
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    const code = String(active.id);
    const codes = draggedCodes(code);

    homeCategories.current = new Set(
      codes
        .map((c) => byCode.get(c))
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map(poolCategoryOf),
    );
    useSetupUiStore.getState().closeMenu();
    useSetupUiStore.getState().setDragging(code);
    setActiveCode(code);
    setDragCount(codes.length);
  };

  const onDragOver = ({ over }: DragOverEvent) => {
    const overId = over ? String(over.id) : null;

    if (hoverTimer.current?.id === overId) return;

    clearHoverTimer();

    if (!overId) return;

    hoverTimer.current = {
      id: overId,
      timeout: window.setTimeout(() => {
        const ui = useSetupUiStore.getState();

        if (overId === POOL_ROOT_LIST) ui.setPoolOpen(true);
        else ui.setExpanded(overId, true);
      }, EXPAND_ON_HOVER_MS),
    };
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    clearHoverTimer();
    setActiveCode(null);
    useSetupUiStore.getState().setDragging(null);

    if (!over) return;

    const drop = parseDrop(String(over.id));

    if (!drop) return;

    const codes = draggedCodes(String(active.id));
    const assignments = useCountriesStore.getState().eventAssignments;
    const needsMove = codes.some((code) => assignments[code] !== drop.group);

    if (needsMove) move(codes, drop.group);

    if (drop.customGroupId !== undefined && user) {
      const entryIds = codes
        .filter((code) => byCode.get(code)?.category === 'Custom')
        .filter((code) => !byCode.get(code)?.isImported)
        .filter(
          (code) => (byCode.get(code)?.groupId ?? null) !== drop.customGroupId,
        )
        .map((code) => getCustomEntryId(code))
        .filter((id): id is string => !!id);

      if (entryIds.length > 0) {
        void bulkAssignToGroup({ groupId: drop.customGroupId, entryIds });
      }
    }

    if (codes.length > 1) useSetupUiStore.getState().clearSelection();
  };

  const onDragCancel = () => {
    clearHoverTimer();
    setActiveCode(null);
    useSetupUiStore.getState().setDragging(null);
  };

  const activeCountry = activeCode ? byCode.get(activeCode) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <DndComponentsContext.Provider value={components}>
        {children}
      </DndComponentsContext.Provider>
      {/* Portaled: the modal box carries a `transform`, which would turn it into
          the containing block of the overlay's `position: fixed` and offset the
          dragged tile from the pointer by the modal's own position. */}
      {createPortal(
        <DragOverlay dropAnimation={null} zIndex={10001}>
          {activeCountry && (
            <div className="relative w-[190px]">
              <CountryTile country={activeCountry} listId="" overlay />
              {dragCount > 1 && (
                <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent text-accent-ink text-[11px] font-extrabold grid place-items-center shadow-menu">
                  {dragCount}
                </span>
              )}
            </div>
          )}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
};

export default LineupDndProvider;
