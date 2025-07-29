import React from 'react';

import { RestartIcon } from '@/assets/icons/RestartIcon';
import Button from '@/components/common/Button';
import Select from '@/components/common/Select';
import { POINTS_ARRAY } from '@/data/data';

export const PREDEFINED_SYSTEMS_MAP = {
  default: POINTS_ARRAY,
  reversed: [...POINTS_ARRAY].reverse(),
  old: Array(10).fill(1),
};

const predefinedSystemsOptions = [
  { value: 'default', label: 'Eurovision Standard (1-8, 10, 12)' },
  { value: 'reversed', label: 'Reversed (12-8, 10, 1)' },
  { value: 'old', label: 'Eurovision Pre-1975 (1x10)' },
];

interface PointsSystemHeaderProps {
  currentSystem: string;
  onSystemChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onReset: () => void;
}

export const PointsSystemHeader: React.FC<PointsSystemHeaderProps> = ({
  currentSystem,
  onSystemChange,
  onReset,
}) => {
  const currentSystemOption = predefinedSystemsOptions.find(
    (option) => option.value === currentSystem,
  ) || { value: 'custom', label: 'Custom' };

  const isDefaultSystem = currentSystemOption.value === 'default';

  return (
    <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
      <div>
        <h4 className="text-base sm:text-lg font-semibold">Points System</h4>
        <p className="text-sm text-white/50">Drag and drop to reorder</p>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        {!isDefaultSystem && (
          <Button
            onClick={onReset}
            className="!p-2.5"
            aria-label="Restart"
            title="Restart"
          >
            <RestartIcon className="w-5 h-5" />
          </Button>
        )}
        <Select
          id="predefined-systems"
          onChange={onSystemChange}
          value={currentSystemOption?.value}
          options={predefinedSystemsOptions}
          className="bg-primary-800 bg-gradient-to-bl from-[10%] from-primary-800 to-primary-700/60 p-2 !rounded-md min-w-[150px]"
        >
          <span className="text-sm line-clamp-2">
            {currentSystemOption?.label}
          </span>
        </Select>
      </div>
    </div>
  );
};
