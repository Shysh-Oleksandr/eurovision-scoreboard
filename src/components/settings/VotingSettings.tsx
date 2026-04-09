import { useTranslations } from 'next-intl';
import React from 'react';

import { useGeneralStore } from '../../state/generalStore';
import { Checkbox } from '../common/Checkbox';
import { Tooltip } from '../common/Tooltip';
import { Input } from '../Input';

import { PointsSystemSelection } from './pointsSystem/PointsSystemSelection';

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
                <Input
                  id="splitScreenCandidatesCount"
                  type="number"
                  min={2}
                  max={6}
                  step={1}
                  value={settings.splitScreenCandidatesCount.toString()}
                  onChange={(e) => {
                    const parsedValue = parseInt(e.target.value, 10);

                    if (Number.isNaN(parsedValue)) return;

                    setSettings({
                      splitScreenCandidatesCount: Math.max(
                        2,
                        Math.min(6, parsedValue),
                      ),
                    });
                  }}
                  className="!w-12 !h-8 text-center font-medium"
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
