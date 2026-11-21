'use client';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';

import { useFlagImageColors } from './useFlagImageColors';

import Button from '@/components/common/Button';
import { useThrottledEdit } from '@/components/setup/widgets-section/custom-themes/hooks/useThrottledEdit';
import SafeColorPicker from '@/components/setup/widgets-section/custom-themes/SafeColorPicker';
import { ShareSegmented } from '@/components/simulation/share/controls';
import { ENTRY_COLORS_MAX } from '@/data/countries/entryColors';
import { colorToHex } from '@/helpers/colorConversion';

type Source = 'flag' | 'custom';

/**
 * Colours flags are made of, offered in the picker after the flag's own
 * (the picker shows 18). Entry data, not interface colours.
 */
const FLAG_PRESETS = [
  '#ffffff',
  '#000000',
  '#d52b1e',
  '#8d153a',
  '#ff8200',
  '#ffcd00',
  '#c09300',
  '#009a44',
  '#006a4e',
  '#00a3e0',
  '#75aadb',
  '#0033a0',
  '#012169',
  '#7f3f98',
  '#f49ac2',
];

const channels = (hex: string) =>
  [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));

/**
 * The flag's colours, then the presets that don't look the same as one of
 * them (a flag's white reads as #fdfdff), as many as the picker shows (18).
 */
const pickerPresets = (flagColors: readonly string[]) => {
  const near = (a: string, b: string) => {
    const [ar, ag, ab] = channels(a);
    const [br, bg, bb] = channels(b);

    return Math.hypot(ar - br, ag - bg, ab - bb) < 24;
  };

  return [
    ...flagColors,
    ...FLAG_PRESETS.filter(
      (preset) => !flagColors.some((color) => near(color, preset)),
    ),
  ].slice(0, 18);
};

/** Where Custom starts when the flag's colours can't be read. */
const BLANK = '#ffffff';

const PICKER_HEIGHT = 168;

interface EntryColorsFieldProps {
  /** The entry's colours, main colour first; null: read from the flag. */
  value: string[] | null;
  onChange: (colors: string[] | null) => void;
  /** The flag being edited (as the preview draws it): Custom starts from its colours. */
  flag: string;
}

/**
 * A custom entry's colours: from the flag (nothing stored), or up to three
 * picked by hand, used wherever the app takes a country's colours from its
 * flag (data/countries/entryColors.ts). Custom starts from the colours read
 * from the chosen flag; a tapped swatch opens the picker under the row.
 */
const EntryColorsField: React.FC<EntryColorsFieldProps> = ({
  value,
  onChange,
  flag,
}) => {
  const t = useTranslations('setup.customCountryModal');
  const tCommon = useTranslations('common');
  const flagColors = useFlagImageColors(flag);
  // Picker drags re-render only this field; the modal follows on a throttle.
  const [colors, push] = useThrottledEdit(value, onChange);
  // Kept while "From the flag" is chosen, so Custom comes back as it was.
  const [kept, setKept] = useState<string[]>(value ?? []);
  const [editing, setEditing] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const pickerWrapRef = useRef<HTMLDivElement>(null);
  const [pickerWidth, setPickerWidth] = useState<number | undefined>();

  const source: Source = colors ? 'custom' : 'flag';
  const editingColor =
    colors && editing !== null ? colors[editing] ?? null : null;
  const isEditorOpen = editingColor !== null;

  // When the editor opens or moves to another swatch (not on every drag).
  useEffect(() => {
    if (!isEditorOpen) return undefined;

    editorRef.current?.scrollIntoView({ block: 'nearest' });

    // The picker draws at a fixed pixel width: give it the field's.
    const el = pickerWrapRef.current;

    if (!el || typeof ResizeObserver === 'undefined') return undefined;

    const measure = () => setPickerWidth(el.clientWidth || undefined);

    measure();
    const observer = new ResizeObserver(measure);

    observer.observe(el);

    return () => observer.disconnect();
  }, [editing, isEditorOpen]);

  const update = (next: string[]) => {
    setKept(next);
    push(next);
  };

  const pickSource = (next: Source) => {
    if (next === 'flag') {
      setEditing(null);
      push(null);

      return;
    }

    const read = flagColors?.slice(0, ENTRY_COLORS_MAX) ?? [];
    const start = kept.length > 0 ? kept : read.length > 0 ? read : [BLANK];

    update(start);
    // Nothing to start from: open the picker on the one colour.
    if (kept.length === 0 && read.length === 0) setEditing(0);
  };

  const add = () => {
    if (!colors || colors.length >= ENTRY_COLORS_MAX) return;

    const next = flagColors?.find((color) => !colors.includes(color)) ?? BLANK;

    update([...colors, next]);
    setEditing(colors.length);
  };

  const remove = (index: number) => {
    if (!colors || colors.length <= 1) return;

    update(colors.filter((_, i) => i !== index));
    setEditing(null);
  };

  const setColor = (index: number, picked: string) => {
    const hex = colorToHex(picked);

    if (!hex || !colors || colors[index] === hex) return;

    update(colors.map((color, i) => (i === index ? hex : color)));
  };

  // The picker gets the throttled value, not the per-move echo (see
  // ColorEditorPanel): a value change re-renders its whole subtree.
  const pickerValue =
    editing !== null ? (value ?? colors)?.[editing] ?? BLANK : BLANK;
  const presets = pickerPresets(flagColors ?? []);

  return (
    <section
      aria-labelledby="entryColors-label"
      className="mt-7 flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1.5">
        <h3 id="entryColors-label" className="text-white font-medium">
          {t('colors')}
        </h3>
        <p className="text-sm leading-snug text-balance text-white/60">
          {source === 'custom' ? t('colorsHintCustom') : t('colorsHintFlag')}
        </p>
      </div>

      <ShareSegmented
        ariaLabel={t('colors')}
        value={source}
        options={[
          { value: 'flag', label: t('colorsFromFlag') },
          { value: 'custom', label: t('colorsCustom') },
        ]}
        onChange={pickSource}
      />

      {colors && (
        <div className="flex items-center gap-2.5">
          {colors.map((color, index) => {
            const isOn = editing === index;

            return (
              <button
                // Swatches are positions: the first is the main colour.
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                type="button"
                aria-label={t('colorNumber', { number: index + 1 })}
                aria-expanded={isOn}
                aria-controls="entryColors-editor"
                title={color}
                onClick={() => setEditing(isOn ? null : index)}
                className={`w-[46px] h-[46px] flex-none rounded-[10px] border border-solid border-white/20 outline outline-2 outline-offset-2 transition-[outline-color] duration-150 focus-visible:outline-accent ${
                  isOn ? 'outline-accent' : 'outline-transparent'
                }`}
                style={{ background: color }}
              />
            );
          })}
          {colors.length < ENTRY_COLORS_MAX && (
            <button
              type="button"
              onClick={add}
              aria-label={t('addColor')}
              title={t('addColor')}
              className="w-[46px] h-[46px] flex-none grid place-items-center rounded-[10px] bg-white/[.06] text-white/70 hover:bg-white/[.11] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Plus className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {editing !== null && isEditorOpen && (
        <div
          ref={editorRef}
          id="entryColors-editor"
          role="group"
          aria-label={t('colorNumber', { number: editing + 1 })}
          className="flex flex-col gap-2"
        >
          <div ref={pickerWrapRef} className="w-full">
            <SafeColorPicker
              value={pickerValue}
              fallbackValue={BLANK}
              onChange={(picked) => setColor(editing, picked)}
              width={pickerWidth}
              height={PICKER_HEIGHT}
              presets={presets}
              hideColorTypeBtns
              hideOpacity
              hideAdvancedSliders
              hideColorGuide
              hideInputType
            />
          </div>
          <div className="flex items-center">
            {colors && colors.length > 1 && (
              <Button
                variant="surface"
                size="md"
                className="dp-act--quiet -ml-2.5"
                Icon={<Trash2 className="size-4" />}
                onClick={() => remove(editing)}
              >
                {t('removeColor')}
              </Button>
            )}
            <Button
              variant="surface"
              size="md"
              className="ml-auto"
              onClick={() => setEditing(null)}
            >
              {tCommon('done')}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};

export default EntryColorsField;
