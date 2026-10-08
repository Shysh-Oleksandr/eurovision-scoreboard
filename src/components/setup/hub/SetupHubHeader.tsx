'use client';
import { useTranslations } from 'next-intl';
import React from 'react';

import ComboChip from './ComboChip';
import ComboField from './ComboField';
import {
  getContestImageClassName,
  useContestField,
} from './hooks/useContestField';
import { useThemeField } from './hooks/useThemeField';
import ProfileButton from './ProfileButton';

import { SettingsIcon } from '@/assets/icons/SettingsIcon';
import SyncIcon from '@/assets/icons/SyncIcon';
import { TrophyIcon } from '@/assets/icons/TrophyIcon';
import Button from '@/components/common/Button';
import CustomSelect from '@/components/common/customSelect/CustomSelect';
import FeedbackInfoButton from '@/components/feedbackInfo/FeedbackInfoButton';
import GuideButton from '@/components/guide/GuideButton';

type SetupHubHeaderProps = {
  openSettingsModal: () => void;
};

/**
 * Header row: Contest combo (+ Grand Final only chip), Theme combo (+ sync
 * chip) and the Profile / Settings / Guide / Feedback cluster. On phones it
 * becomes a two-column grid with the cluster on its own row.
 */
export const SetupHubHeader: React.FC<SetupHubHeaderProps> = ({
  openSettingsModal,
}) => {
  const t = useTranslations();
  const contest = useContestField();
  const theme = useThemeField();

  return (
    <div className="grid grid-cols-2 gap-2 items-end sm:flex sm:flex-wrap sm:gap-2.5">
      <ComboField
        label={
          contest.activeContest
            ? `${t('settings.general.contest')} (${t('common.custom')})`
            : t('settings.general.contest')
        }
        chip={
          <ComboChip
            icon={<TrophyIcon className="size-4" />}
            title={t('setup.eventSetupModal.grandFinalOnly')}
            disabledTitle={t(
              'setup.eventSetupModal.gfOnlyDisabledForSavedContest',
            )}
            active={contest.isGfOnly}
            disabled={!!contest.activeContest}
            onClick={contest.handleGfOnlyChange}
          />
        }
      >
        <CustomSelect
          variant="combo"
          options={contest.contestOptions}
          groups={contest.contestGroups}
          value={contest.contestValue}
          onChange={contest.handleYearChange}
          id="year-select-box"
          className="w-full"
          getImageClassName={getContestImageClassName}
        />
      </ComboField>

      <ComboField
        label={
          theme.customTheme
            ? `${t('common.theme')} (${t('common.custom')})`
            : t('common.theme')
        }
        chip={
          <ComboChip
            icon={<SyncIcon className="size-4" />}
            title={t('setup.eventSetupModal.syncThemeToContestYear')}
            active={theme.syncEnabled}
            onClick={theme.toggleSync}
          />
        }
      >
        <CustomSelect
          variant="combo"
          options={theme.themeOptions}
          groups={theme.themeGroups}
          value={theme.themeValue}
          onChange={theme.handleThemeChange}
          id="theme-select-box"
          className="w-full"
          customThemeColor={theme.customThemeColor}
        />
      </ComboField>

      <div className="col-span-2 flex items-end gap-2 sm:ml-auto min-w-0">
        <ProfileButton className="flex-1 sm:flex-none" />
        <Button
          onClick={(e) => {
            e.stopPropagation();
            openSettingsModal();
          }}
          variant="surfaceStrong"
          size="lg"
          className="flex-1 sm:flex-none justify-center group"
          aria-label={t('common.settings')}
          Icon={
            <SettingsIcon className="size-[19px] group-hover:rotate-90 transition-transform duration-500 ease-in-out" />
          }
        >
          {t('common.settings')}
        </Button>
        <GuideButton variant="hub" />
        <FeedbackInfoButton />
      </div>
    </div>
  );
};

export default SetupHubHeader;
