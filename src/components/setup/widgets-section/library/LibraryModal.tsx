'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useId, useRef, useState } from 'react';

import Modal from '@/components/common/Modal/Modal';
import { playHaptic } from '@/native/haptics';

export type LibraryPlace = 'yours' | 'saved' | 'community';

export const LIBRARY_PLACES: LibraryPlace[] = ['yours', 'saved', 'community'];

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** "Themes", "Contests" */
  title: string;
  place: LibraryPlace;
  onPlaceChange: (place: LibraryPlace) => void;
  /** Width from `2cols` (`2cols:!w-[min(100%,850px)]`). */
  widthClassName: string;
  /** A place's content; each mounts on its first visit and then stays. */
  renderPlace: (place: LibraryPlace) => React.ReactNode;
}

/**
 * The frame of the Themes and Contests libraries: the title with the three
 * places (Yours, Saved, Community) beside it and × in the header; on phones
 * the places move to a bar under the thumb, where Close used to be. Each
 * place lays out its own toolbar and list (`LibraryPlaceLayout`).
 */
const LibraryModal: React.FC<LibraryModalProps> = ({
  isOpen,
  onClose,
  title,
  place,
  onPlaceChange,
  widthClassName,
  renderPlace,
}) => {
  const t = useTranslations();
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const [visited, setVisited] = useState<LibraryPlace[]>([place]);

  if (!visited.includes(place)) setVisited([...visited, place]);

  const labels: Record<LibraryPlace, string> = {
    yours: t('widgets.library.yours'),
    saved: t('widgets.library.saved'),
    community: t('widgets.community'),
  };

  const tabId = (p: LibraryPlace) => `${baseId}-tab-${p}`;
  const panelId = (p: LibraryPlace) => `${baseId}-panel-${p}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      unstyledSurface
      fullScreenOnPhone
      ariaLabelledBy={titleId}
      containerClassName={`dp-flat dp-lib-surface ${widthClassName} 2cols:!rounded-2xl`}
      contentClassName="!p-0 !overflow-hidden flex flex-col 2cols:!h-[calc(100dvh-170px)] 2cols:!max-h-[740px] 2cols:!min-h-[440px]"
      overlayClassName="!z-[1001]"
      topContent={
        <div className="flex h-[56px] flex-none items-center gap-4 pl-4 pr-1.5 2cols:h-[66px] 2cols:pl-[22px] 2cols:pr-3">
          <h2
            id={titleId}
            className="min-w-0 truncate text-[19px] font-extrabold tracking-[-0.024em] 2cols:text-[20px]"
          >
            {title}
          </h2>
          <PlaceTabs
            className="hidden 2cols:flex"
            place={place}
            labels={labels}
            onChange={onPlaceChange}
            tabId={tabId}
            panelId={panelId}
            ariaLabelledBy={titleId}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="ml-auto grid size-11 flex-none place-items-center rounded-xl text-white/70 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <X className="size-[22px]" aria-hidden="true" />
          </button>
        </div>
      }
      bottomContent={
        <div className="dp-lib-foot flex-none px-3 pb-[calc(10px+var(--modal-safe-bottom,0px))] pt-2.5 2cols:hidden">
          <PlaceTabs
            className="flex"
            place={place}
            labels={labels}
            onChange={onPlaceChange}
            ariaLabelledBy={titleId}
            large
          />
        </div>
      }
    >
      {LIBRARY_PLACES.map((p) => (
        <div
          key={p}
          id={panelId(p)}
          role="tabpanel"
          aria-labelledby={tabId(p)}
          hidden={p !== place}
          className={p === place ? 'flex min-h-0 flex-1 flex-col' : undefined}
        >
          {visited.includes(p) && renderPlace(p)}
        </div>
      ))}
    </Modal>
  );
};

interface PlaceTabsProps {
  place: LibraryPlace;
  labels: Record<LibraryPlace, string>;
  onChange: (place: LibraryPlace) => void;
  ariaLabelledBy: string;
  /** The header's tabs carry the ids the panels point at. */
  tabId?: (place: LibraryPlace) => string;
  panelId?: (place: LibraryPlace) => string;
  /** Phones' bar: 44px segments that share its width. */
  large?: boolean;
  className?: string;
}

/**
 * The places as the simulation's segmented well (`dp-sim-seg`): tabs, with
 * the arrow keys, Home and End moving between them.
 */
const PlaceTabs: React.FC<PlaceTabsProps> = ({
  place,
  labels,
  onChange,
  ariaLabelledBy,
  tabId,
  panelId,
  large = false,
  className = '',
}) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (next: LibraryPlace, focus = false) => {
    if (next !== place) {
      playHaptic({ id: 'selection' });
      onChange(next);
    }
    if (focus) refs.current[LIBRARY_PLACES.indexOf(next)]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const index = LIBRARY_PLACES.indexOf(place);
    const last = LIBRARY_PLACES.length - 1;
    const target =
      e.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : e.key === 'ArrowLeft'
        ? index === 0
          ? last
          : index - 1
        : e.key === 'Home'
        ? 0
        : e.key === 'End'
        ? last
        : null;

    if (target === null) return;
    e.preventDefault();
    select(LIBRARY_PLACES[target], true);
  };

  return (
    <div
      role="tablist"
      aria-labelledby={ariaLabelledBy}
      onKeyDown={onKeyDown}
      className={`dp-sim-seg min-w-0 gap-0.5 rounded-xl p-[3px] ${className}`}
    >
      {LIBRARY_PLACES.map((p, i) => {
        const on = p === place;

        return (
          <button
            key={p}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId?.(p)}
            aria-controls={panelId?.(p)}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => select(p)}
            className={`${on ? 'is-on' : 'text-white/70 hover:text-white'} ${
              large
                ? 'h-11 min-w-0 flex-auto px-2.5 text-[14px]'
                : 'h-[36px] px-4 text-[13.5px]'
            } truncate whitespace-nowrap rounded-[9px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}
          >
            {labels[p]}
          </button>
        );
      })}
    </div>
  );
};

export default LibraryModal;
