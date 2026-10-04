'use client';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { memo, useEffect, useState } from 'react';

import { useSetupUiStore } from '../state/setupUiStore';

import CountPill from './CountPill';
import { useDndComponents } from './dnd/DndComponentsContext';
import { headerToggleHandler } from './headerToggle';
import { useLineupActions } from './LineupProvider';
import { ListId } from './listIds';
import TileGrid from './TileGrid';
import { useListExpanded } from './useLineupSearch';

import { PencilIcon } from '@/assets/icons/PencilIcon';
import { PlusIcon } from '@/assets/icons/PlusIcon';
import { EventStage } from '@/models';

export interface StageCardProps {
  title: string;
  listId: ListId;
  codes: string[];
  kind: 'semi' | 'final' | 'notQualified' | 'draw';
  /** 1-based position shown in the index chip (hidden for the not-qualified card). */
  index?: number;
  /** Replaces the index chip (the "To be drawn" dice). */
  badge?: React.ReactNode;
  /** One line under the title (draw-mode hints). */
  description?: string;
  /** Small chip next to the title (the "Drawn" chip). */
  chip?: React.ReactNode;
  stage?: EventStage;
  qualifiers?: Array<{ sourceStageName: string; amount: number }> | null;
  matches: Set<string> | null;
  /** Load flags eagerly (the first stage on screen). */
  eager?: boolean;
  /** Allocation draw: pin description per code. */
  pinnedFor?: (code: string) => string | null;
  /** Extra cell after the tiles (the "+N from the draw" placeholder). */
  extraTile?: React.ReactNode;
  /** Rendered above the body (rule warnings). */
  notice?: React.ReactNode;
  /** Replaces the default tile grid. */
  children?: React.ReactNode;
}

const surfaceClass = {
  semi: 'dp-stage',
  final: 'dp-stage dp-stage--final',
  notQualified: 'dp-stage dp-stage--muted',
  draw: 'dp-stage dp-stage--draw',
};

/**
 * One lineup stage (or the GF-only "Not qualified" / draw-mode "To be drawn"
 * bucket): collapsible header with index chip, title, count pill (move all)
 * and pencil (edit stage), then the tile grid and, for any stage fed by
 * another, the qualifiers block.
 */
const StageCard: React.FC<StageCardProps> = ({
  title,
  listId,
  codes,
  kind,
  index,
  badge,
  description,
  chip,
  stage,
  qualifiers,
  matches,
  eager = false,
  pinnedFor,
  extraTile,
  notice,
  children,
}) => {
  const t = useTranslations();
  const { DropZone } = useDndComponents();
  const { onEditStage, openMoveAllMenu } = useLineupActions();
  const expanded = useListExpanded(listId, true, codes, matches);
  const [hasBeenOpened, setHasBeenOpened] = useState(expanded);

  useEffect(() => {
    if (expanded) setHasBeenOpened(true);
  }, [expanded]);

  const toggle = () => useSetupUiStore.getState().toggleExpanded(listId, true);

  return (
    <DropZone
      id={listId}
      as="section"
      className={`${surfaceClass[kind]} rounded-[14px] overflow-hidden`}
    >
      <div
        className="flex items-center gap-[11px] px-3.5 py-[13px] cursor-pointer select-none"
        onClick={headerToggleHandler(toggle)}
      >
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          aria-label={title}
          className="w-6 h-6 rounded-[7px] grid place-items-center text-white/70 hover:bg-white/10 hover:text-white flex-none"
        >
          <ChevronDown
            className={`size-[19px] transition-transform duration-200 ${
              expanded ? '' : '-rotate-90'
            }`}
          />
        </button>
        {badge ??
          (index !== undefined && (
            <span
              className="hidden 2cols:grid w-[26px] h-[26px] rounded-lg place-items-center flex-none text-[11.5px] font-extrabold bg-white/10 border border-hair text-white/70 tabular-nums"
              aria-label={t('setup.eventSetupModal.stageIndexLabel', { index })}
            >
              {String(index).padStart(2, '0')}
            </span>
          ))}
        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <button
              type="button"
              onClick={toggle}
              className="min-w-0 text-left"
              tabIndex={-1}
            >
              <span className="block truncate text-[17.5px] 2cols:text-xl font-extrabold tracking-[-.024em] text-white">
                {title}
              </span>
            </button>
            {chip}
          </div>
          {description && (
            <p className="m-0 text-[11.5px] 2cols:text-[12.5px] font-semibold text-white/70 leading-[1.35] text-pretty">
              {description}
            </p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-[7px] flex-none">
          <CountPill
            count={codes.length}
            ariaLabel={t('setup.eventSetupModal.moveAllTo')}
            onClick={(e) => openMoveAllMenu(listId, e.currentTarget)}
          />
          {stage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditStage(stage);
              }}
              aria-label={t('common.editSection', { section: title })}
              title={t('common.editSection', { section: title })}
              className="dp-icon-btn w-[34px] h-[34px] rounded-[9px] grid place-items-center"
            >
              <PencilIcon className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          {hasBeenOpened && (
            <div className="px-3.5 pb-3.5">
              {notice}
              {children ?? (
                <TileGrid
                  codes={codes}
                  listId={listId}
                  variant="stage"
                  matches={matches}
                  eager={eager}
                  pinnedFor={pinnedFor}
                  extra={extraTile}
                />
              )}
              {qualifiers && qualifiers.length > 0 && (
                <div className="mt-2.5">
                  <div className="dp-qual-div text-[11.5px] font-extrabold tracking-[.1em] uppercase mb-2.5">
                    {t('setup.eventSetupModal.qualifiers')}
                  </div>
                  <div className="flex flex-wrap gap-[9px]">
                    {qualifiers.map((q) => (
                      <span
                        key={q.sourceStageName}
                        className="dp-qual-chip flex items-center gap-2 px-[13px] py-[9px] rounded-[10px] text-[12.5px] font-bold"
                      >
                        <PlusIcon className="size-3.5 text-accent" />
                        <span>
                          {t.rich('setup.eventStageModal.qualifiersFrom', {
                            amount: q.amount,
                            sourceStageName: q.sourceStageName,
                            span: (chunks) => (
                              <span className="font-extrabold text-white">
                                {chunks}
                              </span>
                            ),
                            span2: (chunks) => (
                              <span className="text-white/70">{chunks}</span>
                            ),
                          })}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DropZone>
  );
};

export default memo(StageCard);
