import { Eye, Flag, List, Shield, Sparkles, Volume2 } from 'lucide-react';
import React from 'react';

import { CustomBgUpload } from '../../BgImageSelect';
import { ConfirmationsListItem } from '../custom/ConfirmationsListItem';
import { DangerResetItem } from '../custom/DangerResetItem';
import { HostingCountryDropdown } from '../custom/HostingCountryDropdown';
import { LanguageItem } from '../custom/LanguageItem';
import { PointsBlock } from '../custom/PointsBlock';

import { Category } from './types';

import { getInterfaceFontSelectOptions } from '@/theme/fontAliases';

/**
 * Declarative source of truth for the redesigned General tab. Drives the sidebar /
 * sub-tab navigation, the search filter, and rendering. i18n keys are full dotted
 * paths (resolved with a namespace-less `useTranslations()`). Env-based visibility
 * uses `when`; parent-toggle gating uses `children`.
 */
export const CATEGORIES: Category[] = [
  {
    id: 'contest',
    titleKey: 'settings.general.contest',
    blurbKey: 'settings.general2.blurb.contest',
    icon: Flag,
    items: [
      {
        kind: 'twocol',
        id: 'contest-identity',
        items: [
          {
            kind: 'field',
            id: 'contestName',
            settingKey: 'contestName',
            inputType: 'text',
            labelKey: 'common.name',
            placeholderKey: 'settings.contest.enterContestName',
          },
          {
            kind: 'field',
            id: 'contestYear',
            settingKey: 'contestYear',
            inputType: 'number',
            labelKey: 'common.year',
            placeholderKey: 'settings.contest.enterContestYear',
          },
        ],
      },
      {
        kind: 'switch',
        id: 'showHostingCountryLogo',
        settingKey: 'showHostingCountryLogo',
        labelKey: 'settings.contest.showHostingCountryFlag',
        children: [
          {
            kind: 'custom',
            id: 'hostingCountry',
            searchTextKeys: ['settings.contest.showHostingCountryFlag'],
            render: () => <HostingCountryDropdown />,
          },
        ],
      },
    ],
  },
  {
    id: 'voting',
    titleKey: 'settings.general.voting',
    blurbKey: 'settings.general2.blurb.voting',
    icon: List,
    items: [
      {
        kind: 'custom',
        id: 'pointsBlock',
        searchTextKeys: [
          'settings.voting.pointsSystem',
          'settings.voting.splitPointsSystem',
          'settings.voting.allowMultiplePointsToSameEntry',
          'settings.voting.juryPointsSystem',
          'settings.voting.televotePointsSystem',
        ],
        render: () => <PointsBlock />,
      },
      {
        kind: 'subhead',
        id: 'sh-behaviour',
        labelKey: 'settings.general2.subhead.votingBehaviour',
      },
      {
        kind: 'switch',
        id: 'isPickQualifiersMode',
        settingKey: 'isPickQualifiersMode',
        labelKey: 'settings.voting.pickQualifiersWithoutAwardingPoints',
        tipKey: 'settings.voting.pickQualifiersWithoutAwardingPointsTooltip',
        children: [
          {
            kind: 'switch',
            id: 'enableSplitScreenQualifierRevealMode',
            settingKey: 'enableSplitScreenQualifierRevealMode',
            labelKey: 'settings.voting.enableSplitScreenQualifierRevealMode',
            tipKey:
              'settings.voting.enableSplitScreenQualifierRevealModeTooltip',
            children: [
              {
                kind: 'field',
                id: 'splitScreenCandidatesCount',
                settingKey: 'splitScreenCandidatesCount',
                inputType: 'number',
                numeric: true,
                min: 2,
                max: 6,
                compact: true,
                labelKey: 'settings.voting.splitScreenCandidatesCount',
                tipKey:
                  'settings.voting.splitScreenCandidatesCountTooltipDescription',
              },
              {
                kind: 'switch',
                id: 'enableSplitScreenForLastQualifier',
                settingKey: 'enableSplitScreenForLastQualifier',
                labelKey: 'settings.voting.enableSplitScreenForLastQualifier',
                tipKey:
                  'settings.voting.enableSplitScreenForLastQualifierTooltip',
              },
            ],
          },
        ],
      },
      {
        kind: 'switch',
        id: 'revealTelevoteLowestToHighest',
        settingKey: 'revealTelevoteLowestToHighest',
        labelKey: 'settings.voting.televoteRevealOrder',
        tipKey: 'settings.voting.televoteRevealOrderTooltip',
      },
      {
        kind: 'switch',
        id: 'shouldLimitManualTelevotePoints',
        settingKey: 'shouldLimitManualTelevotePoints',
        labelKey: 'settings.voting.limitManualTelevotePoints',
        tipKey: 'settings.voting.limitManualTelevotePointsTooltip',
      },
      {
        kind: 'switch',
        id: 'useGroupedJuryPoints',
        settingKey: 'useGroupedJuryPoints',
        labelKey: 'settings.voting.groupRandomJuryVoting',
        tipKey: 'settings.voting.groupRandomJuryVotingTooltip',
      },
      {
        kind: 'switch',
        id: 'enablePredefinedVotes',
        settingKey: 'enablePredefinedVotes',
        labelKey: 'settings.voting.enablePredefinedVoting',
        tipKey: 'settings.voting.enablePredefinedVotingTooltip',
      },
      {
        kind: 'switch',
        id: 'presentationModeEnabled',
        settingKey: 'presentationModeEnabled',
        labelKey: 'settings.voting.enablePresentationMode',
        tipKey: 'settings.voting.enablePresentationModeTooltip',
        children: [
          {
            kind: 'switch',
            id: 'autoStartPresentation',
            settingKey: 'autoStartPresentation',
            labelKey: 'settings.voting.autoStartPresentation',
            tipKey: 'settings.voting.autoStartPresentationTooltip',
          },
        ],
      },
    ],
  },
  {
    id: 'look',
    titleKey: 'settings.general2.look',
    blurbKey: 'settings.general2.blurb.look',
    icon: Eye,
    items: [
      {
        kind: 'custom',
        id: 'language',
        searchTextKeys: ['settings.ui.language'],
        render: () => <LanguageItem />,
      },
      {
        kind: 'subhead',
        id: 'sh-flags',
        labelKey: 'settings.general2.subhead.flagsRankings',
      },
      {
        kind: 'switch',
        id: 'shouldShowHeartFlagIcon',
        settingKey: 'shouldShowHeartFlagIcon',
        labelKey: 'settings.ui.useHeartIconsForFlags',
        tipKey: 'settings.general2.tip.heartFlags',
      },
      {
        kind: 'switch',
        id: 'enableMinimalisticFlags',
        settingKey: 'enableMinimalisticFlags',
        labelKey: 'settings.ui.enableMinimalisticFlags',
        tipKey: 'settings.general2.tip.minimalFlags',
      },
      {
        kind: 'switch',
        id: 'alwaysShowRankings',
        settingKey: 'alwaysShowRankings',
        labelKey: 'settings.ui.alwaysShowRankings',
      },
      {
        kind: 'switch',
        id: 'showRankChangeIndicator',
        settingKey: 'showRankChangeIndicator',
        labelKey: 'settings.ui.showRankChangeIndicator',
        tipKey: 'settings.general2.tip.rankChange',
      },
      {
        kind: 'switch',
        id: 'showQualifierTargetStages',
        settingKey: 'showQualifierTargetStages',
        labelKey: 'settings.ui.showQualifierTargetStages',
        tipKey: 'settings.general2.tip.targetStages',
      },
      {
        kind: 'subhead',
        id: 'sh-popups',
        labelKey: 'settings.general2.subhead.popupsChrome',
      },
      {
        kind: 'switch',
        id: 'showQualificationModal',
        settingKey: 'showQualificationModal',
        labelKey: 'settings.ui.showQualifiersPopup',
      },
      {
        kind: 'switch',
        id: 'showWinnerModal',
        settingKey: 'showWinnerModal',
        labelKey: 'settings.ui.showWinnerPopup',
      },
      {
        kind: 'switch',
        id: 'enableFullscreen',
        settingKey: 'enableFullscreen',
        labelKey: 'settings.ui.enableFullscreenMode',
        when: (env) => env.fullscreenEnabled,
      },
      {
        kind: 'switch',
        id: 'blurModalBackground',
        settingKey: 'blurModalBackground',
        labelKey: 'settings.ui.blurModalBackground',
        tipKey: 'settings.general2.tip.blurModal',
      },
      {
        kind: 'switch',
        id: 'hideVotingHints',
        settingKey: 'hideVotingHints',
        labelKey: 'settings.ui.hideVotingHints',
      },
      {
        kind: 'switch',
        id: 'enableIconButtonTooltips',
        settingKey: 'enableIconButtonTooltips',
        labelKey: 'settings.ui.enableIconButtonTooltips',
      },
      {
        kind: 'subhead',
        id: 'sh-personalization',
        labelKey: 'settings.general2.subhead.personalization',
      },
      {
        kind: 'switch',
        id: 'overrideThemeFont',
        settingKey: 'overrideThemeFont',
        labelKey: 'settings.ui.overrideThemeFont',
        tipKey: 'settings.general2.tip.overrideFont',
        children: [
          {
            kind: 'select',
            id: 'overrideThemeFontAlias',
            settingKey: 'overrideThemeFontAlias',
            labelKey: 'settings.ui.interfaceFont',
            options: getInterfaceFontSelectOptions,
          },
        ],
      },
      {
        kind: 'switch',
        id: 'shouldUseCustomBgImage',
        settingKey: 'shouldUseCustomBgImage',
        labelKey: 'settings.ui.useCustomBackgroundImage',
        tipKey: 'settings.general2.tip.customBg',
        children: [
          {
            kind: 'custom',
            id: 'bgUpload',
            searchTextKeys: ['settings.ui.useCustomBackgroundImage'],
            render: () => <CustomBgUpload />,
          },
        ],
      },
    ],
  },
  {
    id: 'effects',
    titleKey: 'settings.general2.effects',
    blurbKey: 'settings.general2.blurb.effects',
    icon: Sparkles,
    items: [
      {
        kind: 'switch',
        id: 'showWinnerConfetti',
        settingKey: 'showWinnerConfetti',
        labelKey: 'settings.ui.showWinnerConfetti',
      },
      {
        kind: 'switch',
        id: 'shouldShowJuryVotingProgress',
        settingKey: 'shouldShowJuryVotingProgress',
        labelKey: 'settings.ui.showJuryVotingProgressBar',
      },
      {
        kind: 'switch',
        id: 'enableWinterEffects',
        settingKey: 'enableWinterEffects',
        labelKey: 'settings.ui.enableWinterEffects',
        tipKey: 'settings.general2.tip.winter',
        children: [
          {
            kind: 'slider',
            id: 'snowFallIntensity',
            settingKey: 'snowFallIntensity',
            min: 1,
            max: 10,
            step: 1,
            labelKey: 'settings.ui.snowFallIntensity',
            minLabelKey: 'settings.ui.low',
            maxLabelKey: 'settings.ui.high',
          },
        ],
      },
      {
        kind: 'switch',
        id: 'enableFinalReveal',
        settingKey: 'enableFinalReveal',
        labelKey: 'settings.ui.enableFinalReveal',
        tipKey: 'settings.general2.tip.finalReveal',
        children: [
          {
            kind: 'slider',
            id: 'finalRevealAnimationSpeed',
            settingKey: 'finalRevealAnimationSpeed',
            min: 0.5,
            max: 1.5,
            step: 0.1,
            labelKey: 'settings.ui.finalRevealAnimationSpeed',
            minLabelKey: 'settings.ui.slow',
            maxLabelKey: 'settings.ui.fast',
          },
          {
            kind: 'switch',
            id: 'finalRevealLinearAnimation',
            settingKey: 'finalRevealLinearAnimation',
            labelKey: 'settings.ui.finalRevealLinearAnimation',
            tipKey: 'settings.general2.tip.predictableReveal',
          },
        ],
      },
    ],
  },
  {
    id: 'audio',
    titleKey: 'settings.general2.audio',
    blurbKey: 'settings.general2.blurb.audio',
    icon: Volume2,
    items: [
      {
        kind: 'note',
        id: 'audio-note',
        labelKey: 'settings.ui.audioPreferencesHint',
      },
      {
        kind: 'switch',
        id: 'disableAllThemeAudio',
        settingKey: 'disableAllThemeAudio',
        labelKey: 'settings.ui.disableAllThemeAudio',
        tipKey: 'settings.ui.disableAllThemeAudioHint',
      },
      {
        kind: 'switch',
        id: 'hideThemeSoundVolumeHud',
        settingKey: 'hideThemeSoundVolumeHud',
        labelKey: 'settings.ui.hideThemeSoundVolumeHud',
        tipKey: 'settings.ui.hideThemeSoundVolumeHudHint',
      },
      {
        kind: 'slider',
        id: 'themeSoundVolume',
        settingKey: 'themeSoundVolume',
        min: 0,
        max: 100,
        step: 1,
        displayValue: true,
        labelKey: 'settings.ui.themeSoundVolume',
        minLabel: '0%',
        maxLabel: '100%',
      },
      {
        kind: 'slider',
        id: 'themeAmbienceVolume',
        settingKey: 'themeAmbienceVolume',
        min: 0,
        max: 100,
        step: 1,
        displayValue: true,
        labelKey: 'settings.ui.themeAmbienceVolume',
        minLabel: '0%',
        maxLabel: '100%',
        when: (env) => env.hasSimBg,
      },
    ],
  },
  {
    id: 'confirmations',
    titleKey: 'settings.general2.confirmations',
    blurbKey: 'settings.general2.blurb.confirmations',
    icon: Shield,
    items: [
      {
        kind: 'custom',
        id: 'confirmationsList',
        searchTextKeys: ['settings.general2.subhead.suppressedDialogs'],
        render: () => <ConfirmationsListItem />,
      },
      {
        kind: 'subhead',
        id: 'sh-reset',
        labelKey: 'settings.general2.subhead.reset',
      },
      {
        kind: 'custom',
        id: 'dangerReset',
        searchTextKeys: ['settings.general.resetAllSettings'],
        render: () => <DangerResetItem />,
      },
    ],
  },
];
