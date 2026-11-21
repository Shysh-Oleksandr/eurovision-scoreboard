'use client';

import { Pencil, Plus } from 'lucide-react';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { playHaptic } from '@/native/haptics';

export interface LibraryGroup {
  _id: string;
  name: string;
}

interface LibraryFolderRailProps {
  groups: LibraryGroup[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd?: () => void;
  onEdit?: (group: LibraryGroup) => void;
  /** "All themes" */
  allLabel: string;
  /** "New group" */
  addLabel: string;
  /** "Edit theme group" (the group's name follows). */
  editLabel: string;
  disabled?: boolean;
}

/**
 * The user's groups as one row that scrolls sideways instead of wrapping:
 * All, then each group; the chosen one is followed by its Edit button,
 * then New group. The row's edges fade while there is more to scroll to.
 */
const LibraryFolderRail: React.FC<LibraryFolderRailProps> = ({
  groups,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  allLabel,
  addLabel,
  editLabel,
  disabled = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState<{ start: boolean; end: boolean }>({
    start: false,
    end: false,
  });

  useLayoutEffect(() => {
    const el = ref.current;

    if (!el) return undefined;

    const read = () => {
      const max = el.scrollWidth - el.clientWidth;

      setFade({ start: el.scrollLeft > 2, end: el.scrollLeft < max - 2 });
    };

    read();
    el.addEventListener('scroll', read, { passive: true });

    const observer = new ResizeObserver(read);

    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', read);
      observer.disconnect();
    };
  }, [groups.length]);

  // Keep the chosen group in view (picked off-screen, or after a rename).
  useEffect(() => {
    const chip = ref.current?.querySelector<HTMLElement>(
      '[aria-pressed="true"]',
    );

    chip?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selectedId]);

  const pick = (id: string | null) => {
    if (id === selectedId) return;
    playHaptic({ id: 'selection' });
    onSelect(id);
  };

  return (
    <div
      ref={ref}
      role="group"
      aria-label={allLabel}
      data-fade-start={fade.start || undefined}
      data-fade-end={fade.end || undefined}
      className="dp-lib-rail flex items-center gap-1.5 overflow-x-auto"
    >
      <button
        type="button"
        aria-pressed={selectedId === null}
        disabled={disabled}
        onClick={() => pick(null)}
        className="dp-lib-chip"
      >
        {allLabel}
      </button>
      {groups.map((group) => {
        const on = group._id === selectedId;

        return (
          <React.Fragment key={group._id}>
            <button
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => pick(group._id)}
              className="dp-lib-chip"
            >
              <span className="max-w-[220px] truncate">{group.name}</span>
            </button>
            {on && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(group)}
                disabled={disabled}
                aria-label={`${editLabel}: ${group.name}`}
                title={editLabel}
                className="dp-lib-chip-edit"
              >
                <Pencil className="size-[15px]" aria-hidden="true" />
              </button>
            )}
          </React.Fragment>
        );
      })}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="dp-lib-chip-add"
        >
          <Plus className="size-4 text-accent" aria-hidden="true" />
          {addLabel}
        </button>
      )}
    </div>
  );
};

export default LibraryFolderRail;
