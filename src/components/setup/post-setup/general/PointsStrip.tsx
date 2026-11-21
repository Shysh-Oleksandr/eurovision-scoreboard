'use client';
import { arrayMoveImmutable } from 'array-move';
import { Plus, Star, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { noDrag } from '../noDrag';

import {
  SortableItem,
  SortableList,
} from '@/components/common/sort/SortableList';
import { PointsItem } from '@/models';
import { playHaptic } from '@/native/haptics';

interface PointsStripProps {
  points: PointsItem[];
  onChange: (points: PointsItem[]) => void;
  /** Names the strip for assistive tech ("Jury points"). */
  label: string;
}

const parseValue = (text: string): number | null => {
  const trimmed = text.trim();

  if (trimmed === '') return null;
  const value = Number(trimmed);

  return Number.isFinite(value) ? value : null;
};

/**
 * A points system as one strip in a well, in the order the points are
 * given: each value is a field, its star plays the douze points animation
 * when that value is given, × removes it, and a drag moves it. The dashed
 * tile at the end adds a value.
 */
const PointsStrip: React.FC<PointsStripProps> = ({
  points,
  onChange,
  label,
}) => {
  const t = useTranslations('setup.stageSetup');
  const tCommon = useTranslations('common');
  // Values being typed, by item id; committed on blur or Enter.
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState('');

  const commit = (index: number) => {
    const item = points[index];
    const draft = drafts[item.id];

    if (draft === undefined) return;
    const value = parseValue(draft);

    setDrafts((current) => {
      const next = { ...current };

      delete next[item.id];

      return next;
    });
    if (value === null || value === item.value) return;
    onChange(points.map((p, i) => (i === index ? { ...p, value } : p)));
  };

  const addValue = () => {
    const value = parseValue(newValue);

    setAdding(false);
    setNewValue('');
    if (value === null) return;
    onChange([...points, { value, showDouzePoints: false, id: Math.random() }]);
  };

  // Enter commits like leaving the field (blur does the work, once).
  const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  return (
    <div className="dp-ss-strip" role="group" aria-label={label}>
      <SortableList
        onSortEnd={(from, to) => {
          if (from !== to) onChange(arrayMoveImmutable(points, from, to));
        }}
        className="flex flex-wrap gap-1.5"
        draggedItemClassName="dp-ss-dragged"
      >
        {points.map((item, index) => (
          <SortableItem key={item.id}>
            <div
              className={`dp-ss-pt ${item.showDouzePoints ? 'is-douze' : ''}`}
            >
              <input
                type="text"
                inputMode="numeric"
                enterKeyHint="done"
                autoComplete="off"
                value={drafts[item.id] ?? String(item.value)}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [item.id]: e.target.value }))
                }
                onBlur={() => commit(index)}
                onKeyDown={blurOnEnter}
                aria-label={t('pointValue', { position: index + 1 })}
                className="dp-ss-pt-field"
              />
              <span className="flex items-center justify-between">
                <button
                  ref={noDrag}
                  type="button"
                  aria-pressed={item.showDouzePoints}
                  aria-label={t('douzeFor', { value: item.value })}
                  title={t('douzeFor', { value: item.value })}
                  onClick={() => {
                    playHaptic({ id: 'selection' });
                    onChange(
                      points.map((p, i) =>
                        i === index
                          ? { ...p, showDouzePoints: !p.showDouzePoints }
                          : p,
                      ),
                    );
                  }}
                  className="dp-ss-pt-star grid size-7 place-items-center rounded-md"
                >
                  <Star className="size-[14px]" aria-hidden="true" />
                </button>
                <button
                  ref={noDrag}
                  type="button"
                  aria-label={t('removePoint', { value: item.value })}
                  title={t('removePoint', { value: item.value })}
                  onClick={() => onChange(points.filter((_, i) => i !== index))}
                  className="dp-ss-x grid size-7 place-items-center rounded-md"
                >
                  <X className="size-[14px]" aria-hidden="true" />
                </button>
              </span>
            </div>
          </SortableItem>
        ))}
        <div className="dp-ss-pt is-add" data-sortable-ignore="">
          {adding ? (
            <input
              type="text"
              inputMode="numeric"
              enterKeyHint="done"
              autoComplete="off"
              autoFocus
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onBlur={addValue}
              onKeyDown={blurOnEnter}
              aria-label={tCommon('addPoint')}
              className="dp-ss-pt-field my-auto"
            />
          ) : (
            <button
              ref={noDrag}
              type="button"
              onClick={() => setAdding(true)}
              aria-label={tCommon('addPoint')}
              title={tCommon('addPoint')}
              className="grid size-full place-items-center rounded-[9px] text-white/70 hover:text-white"
            >
              <Plus className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </SortableList>
    </div>
  );
};

export default PointsStrip;
