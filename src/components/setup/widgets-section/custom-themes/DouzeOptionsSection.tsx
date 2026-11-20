'use client';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import ColorEditorPanel from './ColorEditorPanel';
import ColorOverridePicker from './ColorOverridePicker';

import { RangeSlider } from '@/components/common/RangeSlider';
import {
  ShareGroup,
  ShareLinkButton,
  ShareSegmented,
  ShareToggle,
} from '@/components/simulation/share/controls';
import {
  DEFAULT_VEIL_COLOR,
  type DouzeColorChoice,
  type DouzeOptions,
  DOUZE_SPEED_RANGE,
  restrictDouzeOptions,
  sanitizeDouzeOptions,
} from '@/douze/options';
import { getDouzeOptionsSupport, getDouzeSpec } from '@/douze/registry';
import { hslStringToHex, parseColor } from '@/helpers/colorConversion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { DouzePointsAnimationMode, ThemeColors } from '@/theme/types';

type Props = {
  mode: DouzePointsAnimationMode;
  /** The editor's options; may hold choices only another animation offers. */
  options: DouzeOptions | null;
  onChange: (options: DouzeOptions | null) => void;
  /** The theme's colour overrides: the douze colours live there. */
  overrides: Record<string, string>;
  /** The base theme's colours (what an override replaces). */
  defaultColors: ThemeColors;
  onOverridesChange: (overrides: Record<string, string>) => void;
};

/** One colour this section edits, whatever stores it. */
type ColorField = {
  id: string;
  label: string;
  value: string | undefined;
  defaultValue: string;
  onChange: (value: string | undefined) => void;
  enableGradient?: boolean;
  enableOpacity?: boolean;
};

/** "1.25×", "0.5×", "2×". */
const speedLabel = (speed: number) => `${Math.round(speed * 100) / 100}×`;

/** The picker's value as `#rrggbb` (options store plain hex colours). */
const toHex = (value: string): string | undefined => {
  const converted = hslStringToHex(parseColor(value));

  if (/^#[0-9a-f]{6}$/i.test(converted)) return converted.toLowerCase();

  const rgb = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(converted);

  return rgb
    ? `#${rgb
        .slice(1, 4)
        .map((channel) => Number(channel).toString(16).padStart(2, '0'))
        .join('')}`
    : undefined;
};

/**
 * "Customize animation" under the douze animation select: a custom theme's
 * changes to its douze animation (douze/options.ts), as far as the
 * animation supports them (`getDouzeOptionsSupport`), and the theme's douze
 * colours it uses (overrides, edited here rather than in the Colors step).
 * Choices, not parameters: colours, pace, which parts play and how strong
 * the glows are. Every change plays the animation on the preview.
 */
const DouzeOptionsSection: React.FC<Props> = ({
  mode,
  options,
  onChange,
  overrides,
  defaultColors,
  onOverridesChange,
}) => {
  const t = useTranslations('widgets.themes.visualDetails.douzeOptions');
  const support = getDouzeOptionsSupport(mode);
  const spec = getDouzeSpec(mode);
  // As in the Colors step: a popover picker on desktop, the whole section
  // swapped for a full editor on narrow screens.
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const [editingId, setEditingId] = useState<string | null>(null);
  const specColors = [
    spec?.palette.c1 ?? '#ffffff',
    spec?.palette.c2 ?? '#ffffff',
    spec?.palette.c3 ?? '#ffffff',
  ];
  // Kept while another colour source is chosen, so switching back keeps them.
  const [customColors, setCustomColors] = useState<string[]>(
    () => options?.custom ?? specColors,
  );

  useEffect(() => {
    if (isDesktop) setEditingId(null);
  }, [isDesktop]);

  if (!support) return null;

  // What plays: only what this animation offers.
  const shown = restrictDouzeOptions(options, support);
  const update = (patch: Partial<DouzeOptions>) =>
    onChange(sanitizeDouzeOptions({ ...options, ...patch }));

  // The animation's own colours first (2022: the flag's; hearts: the theme's).
  const [ownColors] = support.colors;
  const colorChoice: DouzeColorChoice = shown?.colors ?? ownColors;
  const pickColors = (choice: DouzeColorChoice) => {
    if (choice === ownColors || choice === 'original') {
      update({ colors: undefined, custom: undefined });
    } else if (choice === 'custom') {
      update({ colors: 'custom', custom: customColors });
    } else {
      update({ colors: choice, custom: undefined });
    }
  };

  const off = new Set(shown?.off ?? []);
  const togglePart = (part: string, on: boolean) => {
    const next = new Set(options?.off ?? []);

    if (on) next.delete(part);
    else next.add(part);
    update({ off: [...next] });
  };
  const speed = shown?.speed ?? 1;
  // The veil's controls go while its part is off.
  const washOff =
    !!spec &&
    spec.layers
      .filter((layer) => layer.intensity === 'wash')
      .every((layer) => layer.group && off.has(layer.group));
  const strengths = support.strengths.filter(
    (key) => key !== 'wash' || !washOff,
  );

  // The theme's douze colours this animation uses with this colour choice.
  const themeColorFields: ColorField[] = support.themeColors
    .filter(
      (field) =>
        (field.when === 'always' ||
          (field.when === 'notFlag' && colorChoice !== 'flag') ||
          (field.when === 'theme' && colorChoice === 'theme')) &&
        !(field.part && off.has(field.part)),
    )
    .map((field) => {
      const fullKey = `countryItem.${field.key}`;

      return {
        id: fullKey,
        label: t(`colorFields.${field.label}`),
        value: overrides[fullKey],
        defaultValue: defaultColors.countryItem[field.key],
        enableGradient: field.gradient,
        enableOpacity: field.opacity,
        onChange: (value) => {
          const next = { ...overrides };

          if (value === undefined) delete next[fullKey];
          else next[fullKey] = value;
          onOverridesChange(next);
        },
      };
    });
  // Only the colours the animation uses (2026: one gold); all three are
  // stored either way.
  const customColorFields: ColorField[] =
    colorChoice === 'custom'
      ? [0, 1, 2].slice(0, support.customColors).map((index) => ({
          id: `custom-${index}`,
          label:
            support.customColors === 1
              ? t('customColorOnly')
              : t('customColor', { number: index + 1 }),
          value: customColors[index],
          defaultValue: specColors[index],
          onChange: (value) => {
            const next = customColors.map((each, i) =>
              i === index ? (value && toHex(value)) ?? specColors[index] : each,
            );

            setCustomColors(next);
            update({ colors: 'custom', custom: next });
          },
        }))
      : [];
  const veilField: ColorField | null =
    support.veilColor && !washOff
      ? {
          id: 'veil',
          label: t('veilColor'),
          value: shown?.veil,
          defaultValue: DEFAULT_VEIL_COLOR,
          onChange: (value) =>
            update({ veil: value ? toHex(value) : undefined }),
        }
      : null;

  const editing = [
    ...themeColorFields,
    ...customColorFields,
    ...(veilField ? [veilField] : []),
  ].find((field) => field.id === editingId);

  if (editing && !isDesktop) {
    return (
      <ColorEditorPanel
        label={editing.label}
        value={editing.value}
        defaultValue={editing.defaultValue}
        onChange={editing.onChange}
        onBack={() => setEditingId(null)}
        backLabel={t('title')}
        enableGradient={editing.enableGradient}
        enableOpacity={editing.enableOpacity}
      />
    );
  }

  const picker = (field: ColorField) => (
    <ColorOverridePicker
      key={field.id}
      label={field.label}
      value={field.value}
      defaultValue={field.defaultValue}
      onChange={field.onChange}
      enableGradient={field.enableGradient}
      enableOpacity={field.enableOpacity}
      externalEdit={!isDesktop}
      onRequestEdit={() => setEditingId(field.id)}
    />
  );

  const strengthSlider = (key: 'glow' | 'wash') => {
    const value = Math.round((shown?.[key] ?? 1) * 100);

    return (
      <RangeSlider
        key={key}
        id={`douze-options-${key}`}
        label={t(key)}
        min={0}
        max={100}
        step={10}
        value={value}
        formatValue={(next) => `${next}%`}
        onChange={(next) => {
          if (next !== value) update({ [key]: next / 100 });
        }}
      />
    );
  };

  return (
    <section
      aria-labelledby="douze-options-title"
      className="flex flex-col gap-4 rounded-[14px] border border-solid border-white/10 p-3.5"
    >
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          <h3
            id="douze-options-title"
            className="m-0 text-[15px] font-extrabold text-white"
          >
            {t('title')}
          </h3>
          {shown && (
            <div className="ml-auto">
              <ShareLinkButton onClick={() => onChange(null)}>
                {t('reset')}
              </ShareLinkButton>
            </div>
          )}
        </div>
        <p className="m-0 text-[12.5px] font-semibold text-white/60">
          {t('hint')}
        </p>
      </div>

      <ShareGroup label={t('colors')}>
        <ShareSegmented
          ariaLabel={t('colors')}
          value={colorChoice}
          options={support.colors.map((choice) => ({
            value: choice,
            label: t(`colorSources.${choice}`),
          }))}
          onChange={pickColors}
        />
        {themeColorFields.length + customColorFields.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {themeColorFields.map(picker)}
            {customColorFields.map(picker)}
          </div>
        )}
        {support.themeColorsHint && colorChoice === 'theme' && (
          <p className="m-0 text-[12.5px] font-semibold text-white/60">
            {t('themeColorsHint')}
          </p>
        )}
      </ShareGroup>

      <RangeSlider
        id="douze-options-speed"
        label={t('speed')}
        min={DOUZE_SPEED_RANGE[0]}
        max={DOUZE_SPEED_RANGE[1]}
        step={0.05}
        value={speed}
        formatValue={speedLabel}
        minLabel={t('slower')}
        maxLabel={t('faster')}
        onChange={(next) => {
          const rounded = Math.round(next * 100) / 100;

          if (rounded !== speed) update({ speed: rounded });
        }}
      />

      {(support.parts.length > 0 || support.coverFlag) && (
        <ShareGroup label={t('partsTitle')}>
          <div className="grid grid-cols-2 gap-2 2cols:grid-cols-3">
            {support.parts.map((part) => (
              <ShareToggle
                key={part}
                label={t(`parts.${part}`)}
                pressed={!off.has(part)}
                onChange={(on) => togglePart(part, on)}
              />
            ))}
            {/* Off by default, unlike the parts: the hearts start at the flag. */}
            {support.coverFlag && (
              <ShareToggle
                label={t('coverFlag')}
                pressed={!!shown?.coverFlag}
                onChange={(on) => update({ coverFlag: on || undefined })}
              />
            )}
          </div>
        </ShareGroup>
      )}

      {strengths.length > 0 && (
        <div className="grid grid-cols-1 gap-3 2cols:grid-cols-2">
          {strengths.map(strengthSlider)}
        </div>
      )}

      {veilField && (
        <div className="grid grid-cols-2 gap-2">{picker(veilField)}</div>
      )}
    </section>
  );
};

export default DouzeOptionsSection;
