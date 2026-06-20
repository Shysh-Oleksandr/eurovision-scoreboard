'use client';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';
import ColorPicker from 'react-best-gradient-color-picker';

import {
  getColorDisplayValue,
  getColorPickerValue,
  sanitizeGradient,
} from './ColorOverridePicker';

import { UndoIcon } from '@/assets/icons/UndoIcon';
import Button from '@/components/common/Button';
import { parseColor } from '@/helpers/colorConversion';

interface ColorEditorPanelProps {
  label: string;
  value: string | undefined;
  defaultValue: string;
  onChange: (value: string | undefined) => void;
  onBack: () => void;
  enableGradient?: boolean;
  enableOpacity?: boolean;
}

/**
 * Full-card color editor used on mobile (and narrow screens) where there is no
 * room for the inline popover picker. Replaces the Colors tab content while
 * editing a single swatch; `onBack` returns to the grid.
 */
const ColorEditorPanel: React.FC<ColorEditorPanelProps> = ({
  label,
  value,
  defaultValue,
  onChange,
  onBack,
  enableGradient = false,
  enableOpacity = false,
}) => {
  const t = useTranslations('widgets.themes');

  // The gradient picker renders at a fixed pixel width, so measure the panel and
  // pass that width to make it fill the available space on mobile.
  const pickerWrapRef = useRef<HTMLDivElement>(null);
  const [pickerWidth, setPickerWidth] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = pickerWrapRef.current;

    if (!el || typeof ResizeObserver === 'undefined') return;

    const measure = () => setPickerWidth(el.clientWidth || undefined);

    measure();
    const observer = new ResizeObserver(measure);

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const currentValue = value || defaultValue || '#000000';
  const displayColor = getColorPickerValue(currentValue);
  const isCustom = value !== undefined && value !== defaultValue;

  const handleColorChange = (color: string) => {
    const normalized = parseColor(color);
    const sanitized = /gradient\(/i.test(normalized)
      ? sanitizeGradient(normalized)
      : normalized;

    onChange(sanitized);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-primary-700 text-[10px] font-bold uppercase tracking-wider">
            {t('editingColor')}
          </p>
          <h4 className="text-white text-sm font-bold truncate">{label}</h4>
        </div>
        <Button
          variant="tertiary"
          onClick={onBack}
          className="!py-1.5 !px-3 text-sm shrink-0"
        >
          ← {t('colorOverrides.colors')}
        </Button>
      </div>

      <div className="flex items-center gap-2 bg-primary-800 border border-white/10 rounded-md py-2 px-3">
        <div
          className="w-8 h-8 rounded border border-white/20 shrink-0"
          style={{ background: displayColor }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-white/40 text-[10.5px] font-medium">
            {t('colorOverrides.currentValue')}
          </p>
          <p className="text-white/70 text-xs font-mono truncate">
            {getColorDisplayValue(currentValue)}
          </p>
        </div>
        {isCustom && (
          <Button
            variant="secondary"
            onClick={() => onChange(undefined)}
            className="!px-2.5 !py-2 shrink-0"
            Icon={<UndoIcon className="w-4 h-4" />}
          ></Button>
        )}
      </div>

      <div ref={pickerWrapRef} className="w-full">
        <ColorPicker
          value={displayColor}
          onChange={handleColorChange}
          width={pickerWidth}
          height={200}
          hideColorTypeBtns={!enableGradient}
          hideOpacity={!enableOpacity}
        />
      </div>
    </div>
  );
};

export default ColorEditorPanel;
