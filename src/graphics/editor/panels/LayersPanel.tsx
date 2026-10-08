'use client';
import {
  ChevronDown,
  Eye,
  EyeOff,
  GripVertical,
  Lock,
  Unlock,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { DesignElement, isStack } from '../../model/design';
import { canHide, elementLabel } from '../../model/elements';
import { useEditorStore } from '../editorStore';
import { TYPE_ICONS } from '../inspector/Inspector';
import { Hint, IconButton } from '../ui/controls';

import { cn } from '@/helpers/utils';

interface RowProps {
  el: DesignElement;
  depth: number;
  index: number;
  parentId: string | null;
  compact: boolean;
}

const LayerRow: React.FC<RowProps & { children?: React.ReactNode }> = ({
  el,
  depth,
  index,
  parentId,
  compact,
}) => {
  const t = useTranslations('graphics.layers');
  const selected = useEditorStore((s) => s.selectedIds.includes(el.id));
  const select = useEditorStore((s) => s.select);
  const toggleSelect = useEditorStore((s) => s.toggleSelect);
  const update = useEditorStore((s) => s.updateElement);
  const moveElement = useEditorStore((s) => s.moveElement);
  const setSheet = useEditorStore((s) => s.setSheet);
  const [open, setOpen] = useState(true);
  const [over, setOver] = useState(false);
  const topLevel = parentId === null;

  const onPick = (e: React.MouseEvent) => {
    if (e.shiftKey || compact) {
      toggleSelect(el.id);
    } else {
      select([el.id]);
    }
  };

  return (
    <>
      <div
        role="listitem"
        aria-current={selected ? 'true' : undefined}
        tabIndex={0}
        draggable={topLevel}
        className={cn(
          'gfx-layer',
          selected && 'is-on',
          el.hidden && 'is-hidden',
          over && 'is-over',
        )}
        style={{ paddingLeft: 6 + depth * 18 }}
        onClick={onPick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            select([el.id]);
            if (compact) setSheet('inspector');
          }
        }}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/gfx-layer', el.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          if (!topLevel) return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          setOver(false);
          if (!topLevel) return;
          const id = e.dataTransfer.getData('text/gfx-layer');

          if (id && id !== el.id) {
            e.preventDefault();
            moveElement(id, index);
          }
        }}
      >
        {topLevel ? (
          <span className="gfx-layer-grip">
            <GripVertical className="size-3" />
          </span>
        ) : (
          <span className="w-[10px]" />
        )}
        {isStack(el) && (
          <button
            type="button"
            className={cn('gfx-layer-chev', !open && 'is-closed')}
            aria-label={t('toggleGroup')}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
          >
            <ChevronDown className="size-[13px]" />
          </button>
        )}
        <span className="opacity-70 flex-none">{TYPE_ICONS[el.type]}</span>
        <span className="gfx-layer-name">{elementLabel(el)}</span>
        {topLevel && (
          <>
            {canHide(el) && (
              <IconButton
                size="xs"
                on={el.hidden}
                label={el.hidden ? t('show') : t('hide')}
                onClick={(e) => {
                  e.stopPropagation();
                  update(el.id, { hidden: !el.hidden });
                }}
              >
                {el.hidden ? (
                  <EyeOff className="size-[13px]" />
                ) : (
                  <Eye className="size-[13px]" />
                )}
              </IconButton>
            )}
            <IconButton
              size="xs"
              on={el.locked}
              label={el.locked ? t('unlock') : t('lock')}
              onClick={(e) => {
                e.stopPropagation();
                update(el.id, { locked: !el.locked });
              }}
            >
              {el.locked ? (
                <Lock className="size-[13px]" />
              ) : (
                <Unlock className="size-[13px]" />
              )}
            </IconButton>
          </>
        )}
      </div>
      {isStack(el) &&
        open &&
        el.children.map((child, i) => (
          <LayerRow
            key={child.id}
            el={child}
            depth={depth + 1}
            index={i}
            parentId={el.id}
            compact={compact}
          />
        ))}
    </>
  );
};

/** Top of the list is in front; drag to reorder top-level rows (§6). */
const LayersPanel: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const t = useTranslations('graphics.layers');
  const elements = useEditorStore((s) => s.design.elements);
  const reversed = [...elements].map((el, i) => ({ el, index: i })).reverse();

  return (
    <>
      <div className="gfx-layers" role="list" aria-label={t('title')}>
        {reversed.map(({ el, index }) => (
          <LayerRow
            key={el.id}
            el={el}
            depth={0}
            index={index}
            parentId={null}
            compact={compact}
          />
        ))}
      </div>
      <Hint>{compact ? t('hintPhone') : t('hint')}</Hint>
    </>
  );
};

export default LayersPanel;
