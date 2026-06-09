'use client';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import { Checkbox } from '@/components/common/Checkbox';
import Select from '@/components/common/Select';
import { PointsSystemSelection } from '@/components/settings/pointsSystem/PointsSystemSelection';
import { PointsSystemController } from '@/components/settings/pointsSystem/useGlobalPointsSystemController';
import { StageVotingMode } from '@/models';

const getVotingModeLabel = (
  mode: StageVotingMode,
  t: ReturnType<typeof useTranslations>,
) => {
  switch (mode) {
    case StageVotingMode.TELEVOTE_ONLY:
      return t('televoteOnly');
    case StageVotingMode.JURY_ONLY:
      return t('juryOnly');
    case StageVotingMode.COMBINED:
      return t('combined');
    case StageVotingMode.JURY_AND_TELEVOTE:
    default:
      return t('juryAndTelevote');
  }
};

interface StageGeneralTabProps {
  controller: PointsSystemController;
  votingMode: StageVotingMode;
  onVotingModeChange: (mode: StageVotingMode) => void;
  enablePredefinedVotes: boolean | undefined;
  globalEnablePredefinedVotes: boolean;
  onEnablePredefinedVotesChange: (v: boolean | undefined) => void;
}

const StageGeneralTab: React.FC<StageGeneralTabProps> = ({
  controller,
  votingMode,
  onVotingModeChange,
  enablePredefinedVotes,
  globalEnablePredefinedVotes,
  onEnablePredefinedVotesChange,
}) => {
  const t = useTranslations('setup.eventStageModal');

  const votingModeOptions = useMemo(
    () =>
      Object.values(StageVotingMode).map((mode) => ({
        label: getVotingModeLabel(mode, t),
        value: mode,
      })),
    [t],
  );

  const effectiveEnablePredefined =
    enablePredefinedVotes ?? globalEnablePredefinedVotes;

  return (
    <div className="flex flex-col gap-4 mt-1">
      <div className="flex flex-col gap-2">
        <label className="text-white">{t('votingMode')}</label>
        <Select
          value={votingMode}
          onChange={(e) =>
            onVotingModeChange(e.target.value as StageVotingMode)
          }
          aria-label="Select voting mode"
          options={votingModeOptions}
          className="w-full h-12 py-2.5 pl-3 pr-4 bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/60 lg:text-[0.95rem] text-sm hover:bg-primary-800"
          arrowClassName="!w-6 !h-6"
        >
          <span className="flex-1">{getVotingModeLabel(votingMode, t)}</span>
        </Select>
      </div>

      <div>
        <Checkbox
          id="stage-enable-predefined-votes"
          labelClassName="w-full !px-0 !pt-1 !items-start"
          label={t('enablePredefinedVotesForStage')}
          checked={effectiveEnablePredefined}
          onChange={(e) => {
            const next = e.target.checked;

            onEnablePredefinedVotesChange(
              next !== globalEnablePredefinedVotes ? next : undefined,
            );
          }}
        />
      </div>

      {/* Divider */}
      <div className="h-px bg-white/10"></div>

      <PointsSystemSelection controller={controller} />
    </div>
  );
};

export default StageGeneralTab;
