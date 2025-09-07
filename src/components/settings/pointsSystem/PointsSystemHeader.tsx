import React from 'react';

import { InfoIcon } from '@/assets/icons/InfoIcon';
import { RestartIcon } from '@/assets/icons/RestartIcon';
import { SparklesIcon } from '@/assets/icons/SparklesIcon';
import Button from '@/components/common/Button';
import Select from '@/components/common/Select';
import { Tooltip } from '@/components/common/Tooltip';

const predefinedSystemsOptions = [
  { value: 'default', label: 'Eurovision Standard (1-8, 10, 12)' },
  { value: 'reversed', label: 'Reversed (12-8, 10, 1)' },
  // { value: 'old', label: 'Eurovision Pre-1975 (1x10)' },
  {
    value: 'melodifestivalen',
    label: 'Melodifestivalen (1, 2, 4, 6, 8, 10, 12)',
  },
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
        <div className="flex items-center gap-2">
          <h4 className="text-base sm:text-lg font-semibold">Points System</h4>
          <Tooltip
            content={
              <div className="space-y-2 font-medium">
                <p>
                  The{' '}
                  <SparklesIcon className="w-4 h-4 mb-1 inline-block text-yellow-300" />{' '}
                  icon indicates that the points will be animated when the
                  country receives them. Click to toggle.
                </p>
              </div>
            }
            position="center"
          >
            <InfoIcon className="w-5 h-5 text-white/60 cursor-pointer" />
          </Tooltip>
        </div>
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
          className="bg-primary-800 bg-gradient-to-bl from-[10%] from-primary-800 to-primary-700/60 p-2 !rounded-md min-w-[150px] hover:bg-primary-700/60"
        >
          <span className="text-sm line-clamp-2">
            {currentSystemOption?.label}
          </span>
        </Select>
      </div>
    </div>
  );
};
