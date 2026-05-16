import { useTranslations } from 'next-intl';
import React from 'react';

import { useGeneralStore } from '../../state/generalStore';
import { Checkbox } from '../common/Checkbox';
import { Tooltip } from '../common/Tooltip';
import { Input } from '../Input';

import { PointsSystemSelection } from './pointsSystem/PointsSystemSelection';

const SPLIT_SCREEN_CANDIDATES_MIN = 2;
const SPLIT_SCREEN_CANDIDATES_MAX = 6;

const clampSplitScreenCandidatesCount = (value: number) =>
  Math.max(
    SPLIT_SCREEN_CANDIDATES_MIN,
    Math.min(SPLIT_SCREEN_CANDIDATES_MAX, value),
  );

const SplitScreenCandidatesCountInput: React.FC<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => {
  const [inputValue, setInputValue] = React.useState(value.toString());

  React.useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleBlur = () => {
    const parsedValue = parseInt(inputValue, 10);
    const validatedValue = Number.isNaN(parsedValue)
      ? value
      : clampSplitScreenCandidatesCount(parsedValue);

    setInputValue(validatedValue.toString());
    onChange(validatedValue);
  };

  return (
    <Input
      id="splitScreenCandidatesCount"
      type="number"
      step={1}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onBlur={handleBlur}
      className="!w-12 !h-8 text-center font-medium"
    />
  );
};

export const VotingSettings: React.FC = () => {
  const t = useTranslations('settings.voting');
  const settings = useGeneralStore((state) => state.settings);
  const setSettings = useGeneralStore((state) => state.setSettings);

  return (
    <>
      <PointsSystemSelection />
      <div className="h-px bg-primary-800 w-full my-4" />

      <div className="grid sm:grid-cols-2 grid-cols-1 gap-2">
        <div className="flex items-start gap-2 text-white">
          <Tooltip
            content={
              <div className="font-medium">
                {t.rich('pickQualifiersWithoutAwardingPointsTooltip', {
                  br: () => <br />,
                })}
              </div>
            }
            position="left"
          />
          <Checkbox
            id="isPickQualifiersMode"
            label={t('pickQualifiersWithoutAwardingPoints')}
            labelClassName="w-full !px-0 !pt-1 !items-start"
            checked={settings.isPickQualifiersMode}
            onChange={(e) => {
              setSettings({ isPickQualifiersMode: e.target.checked });
            }}
          />
        </div>
        {settings.isPickQualifiersMode && (
          <div className="flex items-start gap-2 text-white">
            <Tooltip
              content={
                <div className="font-medium">
                  {t('splitScreenCandidatesCountTooltipDescription')}
                </div>
              }
              position="left"
            />
            <Checkbox
              id="enableSplitScreenQualifierRevealMode"
              label={t('enableSplitScreenQualifierRevealMode')}
              labelClassName="w-full !px-0 !pt-1 !items-start"
              checked={settings.enableSplitScreenQualifierRevealMode}
              onChange={(e) => {
                setSettings({
                  enableSplitScreenQualifierRevealMode: e.target.checked,
                });
              }}
            />
          </div>
        )}
        {settings.isPickQualifiersMode &&
          settings.enableSplitScreenQualifierRevealMode && (
            <div className="flex items-start gap-2 text-white">
              <Tooltip
                content={
                  <div className="font-medium">
                    {t.rich('enableSplitScreenQualifierRevealModeTooltip', {
                      br: () => <br />,
                    })}
                  </div>
                }
                position="left"
              />

              <div className="flex items-center gap-2">
                <SplitScreenCandidatesCountInput
                  value={settings.splitScreenCandidatesCount}
                  onChange={(splitScreenCandidatesCount) =>
                    setSettings({ splitScreenCandidatesCount })
                  }
                />
                <span className="text-white font-medium">
                  {t('splitScreenCandidatesCount')}
                </span>
              </div>
            </div>
          )}
        {settings.isPickQualifiersMode &&
          settings.enableSplitScreenQualifierRevealMode && (
            <div className="flex items-start gap-2 text-white">
              <Tooltip
                content={
                  <div className="font-medium">
                    {t.rich('enableSplitScreenForLastQualifierTooltip', {
                      br: () => <br />,
                    })}
                  </div>
                }
                position="left"
              />
              <Checkbox
                id="enable-split-screen-for-last-qualifier"
                label={t('enableSplitScreenForLastQualifier')}
                labelClassName="w-full !px-0 !pt-1 !items-start"
                checked={settings.enableSplitScreenForLastQualifier}
                onChange={(e) => {
                  setSettings({
                    enableSplitScreenForLastQualifier: e.target.checked,
                  });
                }}
              />
            </div>
          )}
        <div className="flex items-start gap-2 text-white">
          <Tooltip
            content={
              <div className="font-medium">
                <p>{t('televoteRevealOrderTooltip')}</p>
              </div>
            }
            position="left"
          />
          <Checkbox
            id="announce-televote-from-lowest-to-highest"
            label={t('televoteRevealOrder')}
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
                {t('limitManualTelevotePointsTooltip')}
              </div>
            }
            position="left"
          />
          <Checkbox
            id="limit-manual-televote-points"
            labelClassName="w-full !px-0 !pt-1 !items-start"
            label={t('limitManualTelevotePoints')}
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
                {t('groupRandomJuryVotingTooltip')}
              </div>
            }
            position="left"
          />
          <Checkbox
            id="use-grouped-jury-points"
            labelClassName="w-full !px-0 !pt-1 !items-start"
            label={t('groupRandomJuryVoting')}
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
                {t('enablePredefinedVotingTooltip')}
              </div>
            }
            position="left"
          />
          <Checkbox
            id="enable-predefined-votes"
            labelClassName="w-full !px-0 !pt-1 !items-start"
            label={t('enablePredefinedVoting')}
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
                {t('enablePresentationModeTooltip')}
              </div>
            }
            position="left"
          />
          <Checkbox
            id="presentation-mode-enabled"
            labelClassName="w-full !px-0 !pt-1 !items-start"
            label={t('enablePresentationMode')}
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
                  {t('autoStartPresentationTooltip')}
                </div>
              }
              position="left"
            />
            <Checkbox
              id="auto-start-presentation"
              labelClassName="w-full !px-0 !pt-1 !items-start"
              label={t('autoStartPresentation')}
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
    </>
  );
};
