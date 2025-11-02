import React from 'react';

import ColorOverridePicker from './ColorOverridePicker';

import { ThemeColors } from '@/theme/types';

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
  const setOverride = (key: string, value: string | undefined) => {
    const next = { ...overrides };

    if (value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
    onChange(next);
  };

  const juryColors = [
    { key: 'juryBg', label: 'Jury Background', enableGradient: true },
    { key: 'juryCountryText', label: 'Jury Text' },
    {
      key: 'juryPointsBg',
      label: 'Jury Points Background',
    },
    { key: 'juryPointsText', label: 'Jury Points Text' },
    {
      key: 'juryLastPointsBg',
      label: 'Jury Last Points Background',
    },
    { key: 'juryLastPointsText', label: 'Jury Last Points Text' },
  ];

  const isGradientJuryBg =
    overrides['countryItem.juryBg'] &&
    /gradient\(/i.test(overrides['countryItem.juryBg']);

  if (!isGradientJuryBg) {
    juryColors.push({
      key: 'juryHoverBg',
      label: 'Jury Hover Background',
    });
  }

  const douzePointsColors = [
    {
      key: 'douzePointsBg',
      label: 'Douze Points Background',
      enableGradient: true,
    },
    { key: 'douzePointsText', label: 'Douze Points Text' },
    { key: 'douzePointsBlock1', label: 'Douze Points Block 1' },
    { key: 'douzePointsBlock2', label: 'Douze Points Block 2' },
  ];

  const televoteColors = [
    {
      key: 'televoteUnfinishedBg',
      label: 'Televote Background',
      enableGradient: true,
    },
    { key: 'televoteUnfinishedText', label: 'Televote Text' },
    {
      key: 'televoteUnfinishedPointsBg',
      label: 'Televote Points Background',
    },
    {
      key: 'televoteUnfinishedPointsText',
      label: 'Televote Points Text',
    },
    {
      key: 'televoteLastPointsBg',
      label: 'Televote Last Points Background',
    },
    {
      key: 'televoteLastPointsText',
      label: 'Televote Last Points Text',
    },
  ];

  const televoteActiveColors = [
    {
      key: 'televoteActiveBg',
      label: 'Televote Active Background',
      enableGradient: true,
    },
    { key: 'televoteActiveText', label: 'Televote Active Text' },
    {
      key: 'televoteActivePointsBg',
      label: 'Televote Active Points Background',
    },
    {
      key: 'televoteActivePointsText',
      label: 'Televote Active Points Text',
    },
    {
      key: 'televoteActiveLastPointsBg',
      label: 'Televote Active Last Points Background',
    },
    {
      key: 'televoteActiveLastPointsText',
      label: 'Televote Active Last Points Text',
    },
    {
      key: 'televoteOutline',
      label: 'Televote Active Outline',
    },
  ];

  const finishedColors = [
    {
      key: 'televoteFinishedBg',
      label: 'Finished Background',
      enableGradient: true,
    },
    { key: 'televoteFinishedText', label: 'Finished Text' },
    {
      key: 'televoteFinishedPointsBg',
      label: 'Finished Points Background',
    },
    {
      key: 'televoteFinishedPointsText',
      label: 'Finished Points Text',
    },
    {
      key: 'televoteFinishedLastPointsBg',
      label: 'Finished Last Points Background',
    },
    {
      key: 'televoteFinishedLastPointsText',
      label: 'Finished Last Points Text',
    },
  ];

  const unqualifiedColors = [
    {
      key: 'unqualifiedBg',
      label: 'Unqualified Background',
      enableGradient: true,
    },
    { key: 'unqualifiedText', label: 'Unqualified Text' },
    {
      key: 'unqualifiedPointsBg',
      label: 'Unqualified Points Background',
    },
    {
      key: 'unqualifiedPointsText',
      label: 'Unqualified Points Text',
    },
    {
      key: 'unqualifiedLastPointsBg',
      label: 'Unqualified Last Points Background',
    },
    {
      key: 'unqualifiedLastPointsText',
      label: 'Unqualified Last Points Text',
    },
  ];

  const rankColors = [
    {
      key: 'placeContainerBg',
      label: 'Rank Container Background',
      // enableGradient: true,
    },
    { key: 'placeText', label: 'Rank Text' },
  ];

  const panelInfoColors = [
    {
      key: 'activeBg',
      label: 'Active Background',
      // enableGradient: true
    },
    { key: 'activeText', label: 'Active Text' },
    {
      key: 'inactiveBg',
      label: 'Inactive Background',
      // enableGradient: true
    },
    { key: 'inactiveText', label: 'Inactive Text' },
  ];

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
        {colors.map(({ key, label, enableGradient }) => (
          <ColorOverridePicker
            key={key}
            label={label}
            value={overrides[`${groupKey}.${key}`]}
            defaultValue={
              (defaultColors[groupKey as keyof ThemeColors] as any)[key]
            }
            onChange={(val) => setOverride(`${groupKey}.${key}`, val)}
            enableGradient={enableGradient}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {renderColorGroup(juryColors, 'Jury Colors')}

      <div className="border-t border-white/20 border-solid"></div>

      {renderColorGroup(douzePointsColors, 'Douze Points Animation Colors')}

      <div className="border-t border-white/20 border-solid"></div>

      {renderColorGroup(televoteColors, 'Televote Colors')}

      <div className="border-t border-white/20 border-solid"></div>

      {renderColorGroup(televoteActiveColors, 'Televote Active Colors')}

      <div className="border-t border-white/20 border-solid"></div>

      {renderColorGroup(finishedColors, 'Finished Colors')}

      <div className="border-t border-white/20 border-solid"></div>

      {renderColorGroup(unqualifiedColors, 'Unqualified Colors')}

      <div className="border-t border-white/20 border-solid"></div>

      {renderColorGroup(rankColors, 'Rank Colors')}
      <div className="border-t border-white/20 border-solid"></div>

      {renderColorGroup(
        panelInfoColors,
        'Jury Points Panel Colors',
        'panelInfo',
      )}
    </div>
  );
};

export default ColorOverridesSection;
