import { useTranslations } from 'next-intl';
import React from 'react';

import ColorOverridePicker, {
  ColorFieldDefinition,
} from './ColorOverridePicker';

import { ThemeColors } from '@/theme/types';

type ColorField = Omit<ColorFieldDefinition, 'groupKey'>;

interface ColorOverridesSectionProps {
  defaultColors: ThemeColors;
  overrides: Record<string, string>;
  onChange: (overrides: Record<string, string>) => void;
}

const ColorOverridesSection: React.FC<ColorOverridesSectionProps> = ({
  defaultColors,
  overrides,
  onChange,
}) => {
  const t = useTranslations('widgets.themes.colorOverrides');

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
      enableGradient: true,
      enableOpacity: true,
    },
    { key: 'douzePointsText', label: t('douzePointsText') },
    { key: 'douzePointsBlock1', label: t('douzePointsBlock1') },
    { key: 'douzePointsBlock2', label: t('douzePointsBlock2') },
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
    addFields(douzePointsColors, 'countryItem');
    addFields(televoteColors, 'countryItem');
    addFields(televoteActiveColors, 'countryItem');
    addFields(finishedColors, 'countryItem');
    addFields(unqualifiedColors, 'countryItem');
    addFields(panelInfoColors, 'panelInfo');

    return fields;
  })();

  const renderColorGroup = (
    colors: typeof juryColors,
    title: string,
    groupKey: keyof ThemeColors = 'countryItem',
  ) => (
    <div className="space-y-2">
      <h5 className="text-xs font-medium text-white/70 uppercase tracking-wide">
        {title}
      </h5>
      <div className="grid grid-cols-2 gap-2">
        {colors.map(({ key, label, enableGradient, enableOpacity }) => {
          const fullKey = `${groupKey}.${key}`;

          return (
            <ColorOverridePicker
              key={key}
              label={label}
              value={overrides[fullKey]}
              defaultValue={
                (defaultColors[groupKey as keyof ThemeColors] as any)[key]
              }
              onChange={(val) => setOverride(fullKey, val)}
              enableGradient={enableGradient}
              enableOpacity={enableOpacity}
              allColorFields={allColorFields}
              currentFieldKey={fullKey}
              onBulkChange={handleBulkChange}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {renderColorGroup(juryColors, t('juryColors'))}

      <div className="border-t border-white/20 border-solid"></div>

      {renderColorGroup(douzePointsColors, t('douzePointsAnimationColors'))}

      <div className="border-t border-white/20 border-solid"></div>

      {renderColorGroup(televoteColors, t('televoteColors'))}

      <div className="border-t border-white/20 border-solid"></div>

      {renderColorGroup(televoteActiveColors, t('televoteActiveColors'))}

      <div className="border-t border-white/20 border-solid"></div>

      {renderColorGroup(finishedColors, t('finishedColors'))}

      <div className="border-t border-white/20 border-solid"></div>

      {renderColorGroup(unqualifiedColors, t('unqualifiedColors'))}

      <div className="border-t border-white/20 border-solid"></div>

      {renderColorGroup(
        panelInfoColors,
        t('juryPointsPanelColors'),
        'panelInfo',
      )}
    </div>
  );
};

export default ColorOverridesSection;
