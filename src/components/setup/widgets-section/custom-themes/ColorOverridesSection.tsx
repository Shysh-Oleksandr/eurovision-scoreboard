import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import ColorEditorPanel from './ColorEditorPanel';
import ColorOverridePicker, {
  ColorFieldDefinition,
} from './ColorOverridePicker';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ThemeColors } from '@/theme/types';
import { DouzePointsAnimationMode } from '@/types/customTheme';

type ColorField = Omit<ColorFieldDefinition, 'groupKey'>;

interface ColorOverridesSectionProps {
  defaultColors: ThemeColors;
  overrides: Record<string, string>;
  onChange: (overrides: Record<string, string>) => void;
  douzePointsAnimationMode: DouzePointsAnimationMode;
}

type EditingColor = {
  fullKey: string;
  label: string;
  defaultValue: string;
  enableGradient?: boolean;
  enableOpacity?: boolean;
};

const ColorOverridesSection: React.FC<ColorOverridesSectionProps> = ({
  defaultColors,
  overrides,
  onChange,
  douzePointsAnimationMode,
}) => {
  const t = useTranslations('widgets.themes.colorOverrides');

  // On desktop the inline popover picker has room; on narrow screens we swap the
  // whole grid for a full-card ColorEditorPanel instead.
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const [activeCategory, setActiveCategory] = useState('jury');
  const [editingColor, setEditingColor] = useState<EditingColor | null>(null);

  // Close the mobile editor when widening to desktop (popover takes over there).
  useEffect(() => {
    if (isDesktop) setEditingColor(null);
  }, [isDesktop]);

  const setOverride = (key: string, value: string | undefined) => {
    const next = { ...overrides };

    if (value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
    onChange(next);
  };

  const handleBulkChange = (updates: Record<string, string>) => {
    const next = { ...overrides };

    Object.entries(updates).forEach(([key, value]) => {
      next[key] = value;
    });

    onChange(next);
  };

  const juryColors: ColorField[] = [
    {
      key: 'juryBg',
      label: t('juryBg'),
      enableGradient: true,
      enableOpacity: true,
    },
    { key: 'juryCountryText', label: t('juryText') },
    {
      key: 'juryPointsBg',
      label: t('juryPointsBg'),
    },
    { key: 'juryPointsText', label: t('juryPointsText') },
    {
      key: 'juryLastPointsBg',
      label: t('juryLastPointsBg'),
    },
    { key: 'juryLastPointsText', label: t('juryLastPointsText') },
    {
      key: 'juryPlaceContainerBg',
      label: t('juryPlaceContainerBg'),
      enableGradient: true,
      enableOpacity: true,
    },
    { key: 'juryPlaceText', label: t('juryPlaceText') },
  ];

  const douzePointsColors: ColorField[] = [
    {
      key: 'douzePointsBg',
      label: t('douzePointsBg'),
      enableGradient: douzePointsAnimationMode === 'parallelograms',
      enableOpacity: true,
    },
    { key: 'douzePointsText', label: t('douzePointsText') },
  ];
  const douzePointsParallelogramOnlyColors: ColorField[] =
    douzePointsAnimationMode === 'parallelograms'
      ? [
          { key: 'douzePointsBlock1', label: t('douzePointsBlock1') },
          { key: 'douzePointsBlock2', label: t('douzePointsBlock2') },
        ]
      : [];
  const allDouzePointsColors = [
    ...douzePointsColors,
    ...douzePointsParallelogramOnlyColors,
  ];

  const televoteColors: ColorField[] = [
    {
      key: 'televoteUnfinishedBg',
      label: t('televoteUnfinishedBg'),
      enableGradient: true,
      enableOpacity: true,
    },
    { key: 'televoteUnfinishedText', label: t('televoteUnfinishedText') },
    {
      key: 'televoteUnfinishedPointsBg',
      label: t('televoteUnfinishedPointsBg'),
    },
    {
      key: 'televoteUnfinishedPointsText',
      label: t('televoteUnfinishedPointsText'),
    },
    {
      key: 'televoteLastPointsBg',
      label: t('televoteLastPointsBg'),
    },
    {
      key: 'televoteLastPointsText',
      label: t('televoteLastPointsText'),
    },
    {
      key: 'televoteUnfinishedPlaceContainerBg',
      label: t('televoteUnfinishedPlaceContainerBg'),
      enableGradient: true,
    },
    {
      key: 'televoteUnfinishedPlaceText',
      label: t('televoteUnfinishedPlaceText'),
    },
  ];

  const televoteActiveColors: ColorField[] = [
    {
      key: 'televoteActiveBg',
      label: t('televoteActiveBg'),
      enableGradient: true,
      enableOpacity: true,
    },
    { key: 'televoteActiveText', label: t('televoteActiveText') },
    {
      key: 'televoteActivePointsBg',
      label: t('televoteActivePointsBg'),
    },
    {
      key: 'televoteActivePointsText',
      label: t('televoteActivePointsText'),
    },
    {
      key: 'televoteActiveLastPointsBg',
      label: t('televoteActiveLastPointsBg'),
    },
    {
      key: 'televoteActiveLastPointsText',
      label: t('televoteActiveLastPointsText'),
    },
    {
      key: 'televoteActivePlaceContainerBg',
      label: t('televoteActivePlaceContainerBg'),
      enableGradient: true,
      enableOpacity: true,
    },
    { key: 'televoteActivePlaceText', label: t('televoteActivePlaceText') },
    {
      key: 'televoteOutline',
      label: t('televoteOutline'),
    },
  ];

  const finishedColors: ColorField[] = [
    {
      key: 'televoteFinishedBg',
      label: t('televoteFinishedBg'),
      enableGradient: true,
      enableOpacity: true,
    },
    { key: 'televoteFinishedText', label: t('televoteFinishedText') },
    {
      key: 'televoteFinishedPointsBg',
      label: t('televoteFinishedPointsBg'),
    },
    {
      key: 'televoteFinishedPointsText',
      label: t('televoteFinishedPointsText'),
    },
    {
      key: 'televoteFinishedLastPointsBg',
      label: t('televoteFinishedLastPointsBg'),
    },
    {
      key: 'televoteFinishedLastPointsText',
      label: t('televoteFinishedLastPointsText'),
    },
    {
      key: 'televoteFinishedPlaceContainerBg',
      label: t('televoteFinishedPlaceContainerBg'),
      enableGradient: true,
      enableOpacity: true,
    },
    { key: 'televoteFinishedPlaceText', label: t('televoteFinishedPlaceText') },
  ];

  const unqualifiedColors: ColorField[] = [
    {
      key: 'unqualifiedBg',
      label: t('unqualifiedBg'),
      enableGradient: true,
      enableOpacity: true,
    },
    { key: 'unqualifiedText', label: t('unqualifiedText') },
    {
      key: 'unqualifiedPointsBg',
      label: t('unqualifiedPointsBg'),
    },
    {
      key: 'unqualifiedPointsText',
      label: t('unqualifiedPointsText'),
    },
    {
      key: 'unqualifiedLastPointsBg',
      label: t('unqualifiedLastPointsBg'),
    },
    {
      key: 'unqualifiedLastPointsText',
      label: t('unqualifiedLastPointsText'),
    },
    {
      key: 'unqualifiedPlaceContainerBg',
      label: t('unqualifiedPlaceContainerBg'),
      enableGradient: true,
    },
    { key: 'unqualifiedPlaceText', label: t('unqualifiedPlaceText') },
  ];

  const panelInfoColors: ColorField[] = [
    {
      key: 'activeBg',
      label: t('activeBg'),
      enableGradient: true,
      enableOpacity: true,
    },
    { key: 'activeText', label: t('activeText') },
    {
      key: 'inactiveBg',
      label: t('inactiveBg'),
      enableGradient: true,
      enableOpacity: true,
    },
    { key: 'inactiveText', label: t('inactiveText') },
  ];

  // Collect all color fields for copy functionality
  const allColorFields: ColorFieldDefinition[] = (() => {
    const fields: ColorFieldDefinition[] = [];

    // Helper to add fields from a color array
    const addFields = (colors: ColorField[], groupKey: keyof ThemeColors) => {
      colors.forEach(({ key, label, enableGradient, enableOpacity }) => {
        fields.push({
          key,
          label,
          enableGradient,
          enableOpacity,
          groupKey: groupKey as string,
        });
      });
    };

    // Add all fields from each group
    addFields(juryColors, 'countryItem');
    addFields(allDouzePointsColors, 'countryItem');
    addFields(televoteColors, 'countryItem');
    addFields(televoteActiveColors, 'countryItem');
    addFields(finishedColors, 'countryItem');
    addFields(unqualifiedColors, 'countryItem');
    addFields(panelInfoColors, 'panelInfo');

    return fields;
  })();

  // One entry per color category. Pills switch between them; only the active
  // category's grid is rendered at a time.
  const categories: {
    id: string;
    label: string;
    colors: ColorField[];
    groupKey: keyof ThemeColors;
  }[] = [
    {
      id: 'jury',
      label: t('juryColors'),
      colors: juryColors,
      groupKey: 'countryItem',
    },
    {
      id: 'douze',
      label: t('douzePointsAnimationColors'),
      colors: allDouzePointsColors,
      groupKey: 'countryItem',
    },
    {
      id: 'televote',
      label: t('televoteColors'),
      colors: televoteColors,
      groupKey: 'countryItem',
    },
    {
      id: 'tvactive',
      label: t('televoteActiveColors'),
      colors: televoteActiveColors,
      groupKey: 'countryItem',
    },
    {
      id: 'finished',
      label: t('finishedColors'),
      colors: finishedColors,
      groupKey: 'countryItem',
    },
    {
      id: 'unqual',
      label: t('unqualifiedColors'),
      colors: unqualifiedColors,
      groupKey: 'countryItem',
    },
    {
      id: 'jurypanel',
      label: t('juryPointsPanelColors'),
      colors: panelInfoColors,
      groupKey: 'panelInfo',
    },
  ];

  const current =
    categories.find((c) => c.id === activeCategory) ?? categories[0];

  // Mobile: editing a single swatch replaces the whole grid with a full editor.
  if (editingColor && !isDesktop) {
    return (
      <ColorEditorPanel
        label={editingColor.label}
        value={overrides[editingColor.fullKey]}
        defaultValue={editingColor.defaultValue}
        onChange={(val) => setOverride(editingColor.fullKey, val)}
        onBack={() => setEditingColor(null)}
        enableGradient={editingColor.enableGradient}
        enableOpacity={editingColor.enableOpacity}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => {
          const isActive = c.id === activeCategory;

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setActiveCategory(c.id);
                setEditingColor(null);
              }}
              className={`rounded-full px-2.5 py-1.5 text-xs font-bold transition-colors ${
                isActive
                  ? 'bg-primary-700 text-white border border-transparent'
                  : 'bg-white/[0.06] text-white/70 border border-white/10 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="border-t border-white/20 border-solid"></div>

      <div className="grid grid-cols-2 gap-2">
        {current.colors.map(({ key, label, enableGradient, enableOpacity }) => {
          const fullKey = `${current.groupKey}.${key}`;

          return (
            <ColorOverridePicker
              key={key}
              label={label}
              value={overrides[fullKey]}
              defaultValue={(defaultColors[current.groupKey] as any)[key]}
              onChange={(val) => setOverride(fullKey, val)}
              enableGradient={enableGradient}
              enableOpacity={enableOpacity}
              allColorFields={allColorFields}
              currentFieldKey={fullKey}
              onBulkChange={handleBulkChange}
              externalEdit={!isDesktop}
              onRequestEdit={() =>
                setEditingColor({
                  fullKey,
                  label: `${current.label} — ${label}`,
                  defaultValue: (defaultColors[current.groupKey] as any)[key],
                  enableGradient,
                  enableOpacity,
                })
              }
            />
          );
        })}
      </div>
    </div>
  );
};

export default ColorOverridesSection;
