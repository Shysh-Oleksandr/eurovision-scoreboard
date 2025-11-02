import React from 'react';

import { useGeneralStore } from '../../state/generalStore';
import Button from '../common/Button';
import { Checkbox } from '../common/Checkbox';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { Tooltip } from '../common/Tooltip';

import { BgImageSelect } from './BgImageSelect';
import { ContestSettings } from './ContestSettings';
import { PointsSystemSelection } from './pointsSystem/PointsSystemSelection';
import { PresetsSettings } from './presets/PresetsSettings';

export const GeneralSettings: React.FC = () => {
  const settings = useGeneralStore((state) => state.settings);
  const setSettings = useGeneralStore((state) => state.setSettings);
  const resetAllSettings = useGeneralStore((state) => state.resetAllSettings);
  const expansion = useGeneralStore((state) => state.generalSettingsExpansion);
  const setExpansion = useGeneralStore(
    (state) => state.setGeneralSettingsExpansion,
  );

  const isFullScreenSupported = document.fullscreenEnabled;

  return (
    <div className="flex flex-col gap-4">
      <CollapsibleSection
        title="Presets"
        isExpanded={expansion.presets}
        onToggle={() => setExpansion({ presets: !expansion.presets })}
      >
        <PresetsSettings />
      </CollapsibleSection>

      <CollapsibleSection
        title="Contest"
        isExpanded={expansion.contest}
        onToggle={() => setExpansion({ contest: !expansion.contest })}
        contentClassName="grid sm:grid-cols-2 grid-cols-1 gap-2 items-center"
      >
        <ContestSettings />
      </CollapsibleSection>

      <CollapsibleSection
        title="Voting"
        isExpanded={expansion.voting}
        onToggle={() => setExpansion({ voting: !expansion.voting })}
      >
        <PointsSystemSelection />
        <div className="h-px bg-primary-800 w-full my-4" />

        <div className="grid sm:grid-cols-2 grid-cols-1 gap-2">
          <div className="flex items-start gap-2 text-white">
            <Tooltip
              content={
                <div className="font-medium">
                  <p>
                    Click countries (or choose randomly) to qualify them without
                    awarding points.
                    <br />
                    The Semi-Finals voting mode still affects random qualifiers
                    and points distribution.
                  </p>
                </div>
              }
              position="left"
            />
            <Checkbox
              id="isPickQualifiersMode"
              label="Pick qualifiers without awarding points"
              labelClassName="w-full !px-0 !pt-1 !items-start"
              checked={settings.isPickQualifiersMode}
              onChange={(e) => {
                setSettings({ isPickQualifiersMode: e.target.checked });
              }}
            />
          </div>
          <div className="flex items-start gap-2 text-white">
            <Tooltip
              content={
                <div className="font-medium">
                  <p>
                    When enabled, the televote points will be announced from
                    lowest to highest (ESC 2016–2018 system). Otherwise, order
                    follows jury points.
                  </p>
                </div>
              }
              position="left"
            />
            <Checkbox
              id="announce-televote-from-lowest-to-highest"
              label="Televote reveal order: lowest to highest"
              labelClassName="w-full !px-0 !pt-1 !items-start"
              checked={settings.revealTelevoteLowestToHighest}
              onChange={(e) => {
                setSettings({
                  revealTelevoteLowestToHighest: e.target.checked,
                });
              }}
            />
          </div>
          <div className="flex items-start gap-2">
            <Tooltip
              content={
                <div className="font-medium">
                  When enabled, limits the total televote points you can award
                  (when manually entering points) and shows how many remain.
                </div>
              }
              position="left"
            />
            <Checkbox
              id="limit-manual-televote-points"
              labelClassName="w-full !px-0 !pt-1 !items-start"
              label="Limit manual televote points"
              checked={settings.shouldLimitManualTelevotePoints}
              onChange={(e) =>
                setSettings({
                  shouldLimitManualTelevotePoints: e.target.checked,
                })
              }
            />
          </div>
          <div className="flex items-start gap-2">
            <Tooltip
              content={
                <div className="font-medium">
                  When enabled, clicking 'Vote randomly' will award one set of
                  jury points, grouped as either (1–8, 10) or (12).
                </div>
              }
              position="left"
            />
            <Checkbox
              id="use-grouped-jury-points"
              labelClassName="w-full !px-0 !pt-1 !items-start"
              label="Group random jury voting"
              checked={settings.useGroupedJuryPoints}
              onChange={(e) =>
                setSettings({
                  useGroupedJuryPoints: e.target.checked,
                })
              }
            />
          </div>
          <div className="flex items-start gap-2">
            <Tooltip
              content={
                <div className="font-medium">
                  When enabled, you can set each country's votes before the
                  voting begins.
                </div>
              }
              position="left"
            />
            <Checkbox
              id="enable-predefined-votes"
              labelClassName="w-full !px-0 !pt-1 !items-start"
              label="Enable predefined voting"
              checked={settings.enablePredefinedVotes}
              onChange={(e) =>
                setSettings({
                  enablePredefinedVotes: e.target.checked,
                })
              }
            />
          </div>
          <div className="flex items-start gap-2">
            <Tooltip
              content={
                <div className="font-medium">
                  When enabled, displays the presentation panel, which allows
                  you to run voting automatically, without requiring any clicks.
                </div>
              }
              position="left"
            />
            <Checkbox
              id="presentation-mode-enabled"
              labelClassName="w-full !px-0 !pt-1 !items-start"
              label="Enable presentation mode"
              checked={settings.presentationModeEnabled}
              onChange={(e) =>
                setSettings({
                  presentationModeEnabled: e.target.checked,
                })
              }
            />
          </div>
          {settings.presentationModeEnabled && (
            <div className="flex items-start gap-2">
              <Tooltip
                content={
                  <div className="font-medium">
                    When enabled, the presentation will start automatically
                    after the voting starts.
                  </div>
                }
                position="left"
              />
              <Checkbox
                id="auto-start-presentation"
                labelClassName="w-full !px-0 !pt-1 !items-start"
                label="Auto start presentation"
                checked={settings.autoStartPresentation}
                onChange={(e) =>
                  setSettings({
                    autoStartPresentation: e.target.checked,
                  })
                }
              />
            </div>
          )}
        </div>
      </CollapsibleSection>
      <CollapsibleSection
        title="UI Preferences"
        isExpanded={expansion.uiPreferences}
        onToggle={() =>
          setExpansion({ uiPreferences: !expansion.uiPreferences })
        }
        contentClassName="grid sm:grid-cols-2 grid-cols-1 gap-1"
      >
        <Checkbox
          id="show-heart-flag-icon"
          labelClassName="w-full"
          label="Use heart icons for flags"
          checked={settings.shouldShowHeartFlagIcon}
          onChange={(e) =>
            setSettings({ shouldShowHeartFlagIcon: e.target.checked })
          }
        />
        <Checkbox
          id="show-place-number"
          labelClassName="w-full"
          label="Always show rankings"
          checked={settings.alwaysShowRankings}
          onChange={(e) =>
            setSettings({ alwaysShowRankings: e.target.checked })
          }
        />
        <Checkbox
          id="show-rank-change-indicator"
          labelClassName="w-full"
          label="Show rank change indicator"
          checked={settings.showRankChangeIndicator}
          onChange={(e) =>
            setSettings({ showRankChangeIndicator: e.target.checked })
          }
        />
        <Checkbox
          id="show-qualification-modal"
          labelClassName="w-full"
          label="Show qualifiers popup"
          checked={settings.showQualificationModal}
          onChange={(e) =>
            setSettings({ showQualificationModal: e.target.checked })
          }
        />
        <Checkbox
          id="show-winner-modal"
          labelClassName="w-full"
          label="Show winner popup"
          checked={settings.showWinnerModal}
          onChange={(e) => setSettings({ showWinnerModal: e.target.checked })}
        />
        <Checkbox
          id="show-winner-confetti"
          labelClassName="w-full"
          label="Show winner confetti"
          checked={settings.showWinnerConfetti}
          onChange={(e) =>
            setSettings({ showWinnerConfetti: e.target.checked })
          }
        />
        {isFullScreenSupported && (
          <Checkbox
            id="enable-fullscreen"
            labelClassName="w-full"
            label="Enable fullscreen mode"
            checked={settings.enableFullscreen}
            onChange={(e) =>
              setSettings({ enableFullscreen: e.target.checked })
            }
          />
        )}
        {/* iOS doesn't support beforeunload event */}
        {/* Irrelevant as we persist the state anyway */}
        {/* {!isIOS && (
          <Checkbox
            id="show-before-unload-warning"
            labelClassName="w-full"
            label="Confirm before leaving"
            checked={settings.shouldShowBeforeUnloadWarning}
            onChange={(e) =>
              setSettings({ shouldShowBeforeUnloadWarning: e.target.checked })
            }
          />
        )} */}
        <Checkbox
          id="show-reset-warning"
          labelClassName="w-full"
          label="Confirm before restarting"
          checked={settings.shouldShowResetWarning}
          onChange={(e) =>
            setSettings({ shouldShowResetWarning: e.target.checked })
          }
        />
        <Checkbox
          id="show-manual-televote-warning"
          labelClassName="w-full"
          label="Warn before manually assigning televote points"
          checked={settings.shouldShowManualTelevoteWarning}
          onChange={(e) =>
            setSettings({ shouldShowManualTelevoteWarning: e.target.checked })
          }
        />
        <Checkbox
          id="show-jury-voting-progress"
          labelClassName="w-full"
          label="Show jury voting progress bar"
          checked={settings.shouldShowJuryVotingProgress}
          onChange={(e) =>
            setSettings({
              shouldShowJuryVotingProgress: e.target.checked,
            })
          }
        />
        <BgImageSelect />
      </CollapsibleSection>

      <Button
        variant="tertiary"
        className="w-full"
        onClick={() => {
          if (
            confirm(
              "Are you sure you want to reset all settings? This won't affect your presets.",
            )
          ) {
            resetAllSettings();
          }
        }}
      >
        Reset All Settings
      </Button>
    </div>
  );
};
