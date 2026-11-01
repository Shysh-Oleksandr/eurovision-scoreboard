'use client';
import { useTranslations } from 'next-intl';
import React, { useRef } from 'react';

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
import { CONTEST_TYPE_NAMES, ContestType } from '@/data/contestTypes';
import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';

/** Short series names for the contest caption on phones. */
const SERIES_SHORT_NAMES: Record<ContestType, string> = {
  esc: 'ESC',
  jesc: 'JESC',
  asia: 'ESC Asia',
};

/** Built-in JESC themes read "JESC 2025" instead of a bare year. */
const themeDisplayLabel = (option: { value: string; label: string }) =>
  option.value.startsWith('JESC-') ? `JESC ${option.label}` : option.label;

/**
 * One row while everything fits at its natural width; otherwise the phone
 * layout (the combos share the first row, the rest stretch across the
 * second), and on narrow screens the profile button shrinks to the avatar.
 * See `.dp-hub-header` in styles.css.
 */
const HEADER_STEPS = [
  { layout: 'row', profile: 'full' },
  { layout: 'stack', profile: 'full' },
  { layout: 'stack', profile: 'avatar' },
] as const;

type SetupHubHeaderProps = {
  openSettingsModal: () => void;
};

/**
 * Header: Contest combo (+ Grand Final only chip), Theme combo (+ sync chip)
 * and the Profile / Settings / Guide / Feedback cluster.
 */
export const SetupHubHeader: React.FC<SetupHubHeaderProps> = ({
  openSettingsModal,
}) => {
  const t = useTranslations();
  const contest = useContestField();
  const theme = useThemeField();
  const ref = useRef<HTMLDivElement>(null);
  const step = useFitStep(ref, HEADER_STEPS);

  // The caption inside each combo names it. Phones get the short form (ESC,
  // "Custom") so the caption never truncates.
  const caption = (short: string, full: string) => (
    <>
      <span className="2cols:hidden">{short}</span>
      <span className="hidden 2cols:inline">{full}</span>
    </>
  );
  const contestCaption = contest.activeContest
    ? caption(t('common.custom'), t('setup.eventSetupModal.customContest'))
    : caption(
        SERIES_SHORT_NAMES[contest.contestType],
        CONTEST_TYPE_NAMES[contest.contestType],
      );
  const themeCaption = theme.customTheme
    ? caption(t('common.custom'), t('setup.eventSetupModal.customTheme'))
    : t('common.theme');

  return (
    <div
      ref={ref}
      className="dp-hub-header"
      {...fitStepAttributes(HEADER_STEPS[step])}
    >
      <ComboField
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
          caption={contestCaption}
        />
      </ComboField>

      <ComboField
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
          caption={themeCaption}
          getDisplayLabel={themeDisplayLabel}
        />
      </ComboField>

      <div className="dp-hub-tools">
        <ProfileButton className="dp-hub-tool-grow" />
        <Button
          onClick={(e) => {
            e.stopPropagation();
            openSettingsModal();
          }}
          variant="surfaceStrong"
          size="lg"
          className="dp-hub-tool-grow justify-center group"
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
