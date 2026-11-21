'use client';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useId } from 'react';

import StagePointsSection from './general/StagePointsSection';
import StageToggle from './general/StageToggle';

import { PointsSystemController } from '@/components/settings/pointsSystem/useGlobalPointsSystemController';
import { StageVotingMode } from '@/models';

const VOTING_MODES = [
  StageVotingMode.JURY_AND_TELEVOTE,
  StageVotingMode.TELEVOTE_ONLY,
  StageVotingMode.JURY_ONLY,
  StageVotingMode.COMBINED,
] as const;

export const VOTING_MODE_LABEL_KEYS = {
  [StageVotingMode.JURY_AND_TELEVOTE]: 'juryAndTelevote',
  [StageVotingMode.TELEVOTE_ONLY]: 'televoteOnly',
  [StageVotingMode.JURY_ONLY]: 'juryOnly',
  [StageVotingMode.COMBINED]: 'combined',
} as const;

interface StageGeneralTabProps {
  controller: PointsSystemController;
  /** The points differ from Settings' (stored as this stage's own). */
  pointsOverridden: boolean;
  onUseSettingsPoints: () => void;
  votingMode: StageVotingMode;
  onVotingModeChange: (mode: StageVotingMode) => void;
  enablePredefinedVotes: boolean | undefined;
  globalEnablePredefinedVotes: boolean;
  onEnablePredefinedVotesChange: (v: boolean | undefined) => void;
}

/**
 * How the stage votes: the voting mode (the stage editor's well, with the
 * hint that explains it), predefined votes, and the points. Each setting
 * that can follow Settings says whether it does.
 */
const StageGeneralTab: React.FC<StageGeneralTabProps> = ({
  controller,
  pointsOverridden,
  onUseSettingsPoints,
  votingMode,
  onVotingModeChange,
  enablePredefinedVotes,
  globalEnablePredefinedVotes,
  onEnablePredefinedVotesChange,
}) => {
  const t = useTranslations('setup');
  const ids = useId();
  const votingId = `${ids}-voting`;
  const votingHintId = `${ids}-voting-hint`;
  const predefinedHintId = `${ids}-predefined-hint`;

  const votingLabel = (mode: StageVotingMode) =>
    t(`eventStageModal.${VOTING_MODE_LABEL_KEYS[mode] ?? 'juryAndTelevote'}`);

  const ownPredefined = enablePredefinedVotes !== undefined;
  const effectivePredefined =
    enablePredefinedVotes ?? globalEnablePredefinedVotes;

  const predefinedStatus = ownPredefined
    ? t(
        effectivePredefined
          ? 'stageSetup.predefinedOwnOn'
          : 'stageSetup.predefinedOwnOff',
      )
    : t(
        globalEnablePredefinedVotes
          ? 'stageSetup.predefinedFollowsOn'
          : 'stageSetup.predefinedFollowsOff',
      );

  return (
    <div className="flex max-w-[700px] flex-col">
      <div>
        {/* The native select covers the well: the OS picker on phones,
            arrow keys and type-ahead on desktop. */}
        <label
          htmlFor={votingId}
          className="dp-field relative flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl px-3 py-1.5"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="text-[12px] font-semibold leading-none text-white/75">
              {t('eventStageModal.votingMode')}
            </span>
            <span className="truncate text-[16px] font-bold leading-[1.3] md:text-[14.5px]">
              {votingLabel(votingMode)}
            </span>
          </span>
          <ChevronDown
            className="size-[18px] flex-none text-white/75"
            aria-hidden="true"
          />
          <select
            id={votingId}
            value={votingMode}
            onChange={(e) =>
              onVotingModeChange(e.target.value as StageVotingMode)
            }
            aria-label={t('eventStageModal.votingMode')}
            aria-describedby={votingHintId}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            {VOTING_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {votingLabel(mode)}
              </option>
            ))}
          </select>
        </label>
        <p id={votingHintId} className="dp-ss-hint">
          {t(`eventStageModal.votingModeHint.${votingMode}`)}
        </p>
      </div>

      <div className="mt-3.5">
        <StageToggle
          label={t('stageSetup.predefined')}
          pressed={effectivePredefined}
          describedBy={predefinedHintId}
          onChange={(next) =>
            onEnablePredefinedVotesChange(
              next !== globalEnablePredefinedVotes ? next : undefined,
            )
          }
        />
        <p id={predefinedHintId} className="dp-ss-hint">
          {t('stageSetup.predefinedHint')} {predefinedStatus}
        </p>
      </div>

      <hr className="my-5 border-0 border-t border-white/10" />

      <StagePointsSection
        controller={controller}
        overridden={pointsOverridden}
        onUseSettings={onUseSettingsPoints}
      />
    </div>
  );
};

export default StageGeneralTab;
