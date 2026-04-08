'use client';

import { FolderOpen, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import Button from '@/components/common/Button';
import { cn } from '@/helpers/utils';

type VotingPresetToolbarProps = {
  onSavePreset: () => void;
  onLoadPreset: () => void;
  /** Defaults to a padded row under the header; use a tighter class when embedded in another toolbar. */
  wrapperClassName?: string;
};

/**
 * Save / Load voting preset buttons for the Detailed or Totals tab.
 */
export const VotingPresetToolbar: React.FC<VotingPresetToolbarProps> = ({
  onSavePreset,
  onLoadPreset,
  wrapperClassName = '',
}) => {
  const tSetup = useTranslations('setup.votingPredefinition');

  return (
    <div className={cn('flex flex-wrap gap-2', wrapperClassName)}>
      <Button
        variant="tertiary"
        className="gap-2 sm:!px-4 !px-2.5"
        Icon={<Save className="w-5 h-5 shrink-0" />}
        onClick={onSavePreset}
      >
        {tSetup('presets.savePreset')}
      </Button>
      <Button
        variant="tertiary"
        className="gap-2 sm:!px-4 !px-2.5"
        Icon={<FolderOpen className="w-5 h-5 shrink-0" />}
        onClick={onLoadPreset}
      >
        {tSetup('presets.loadPreset')}
      </Button>
    </div>
  );
};

export default VotingPresetToolbar;
