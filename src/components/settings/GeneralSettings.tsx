import { useTranslations } from 'next-intl';
import React from 'react';

import { useGeneralStore } from '../../state/generalStore';
import Button from '../common/Button';
import { CollapsibleSection } from '../common/CollapsibleSection';

import { ContestSettings } from './ContestSettings';
import { UIPreferencesSettings } from './UIPreferencesSettings';
import { VotingSettings } from './VotingSettings';

export const GeneralSettings: React.FC = () => {
  const t = useTranslations('settings');
  const resetAllSettings = useGeneralStore((state) => state.resetAllSettings);
  const expansion = useGeneralStore((state) => state.generalSettingsExpansion);
  const setExpansion = useGeneralStore(
    (state) => state.setGeneralSettingsExpansion,
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Deprecated: will be removed in future version */}
      {/* <CollapsibleSection
        title={t('general.presets')}
        isExpanded={expansion.presets}
        onToggle={() => setExpansion({ presets: !expansion.presets })}
      >
        <PresetsSettings />
      </CollapsibleSection> */}

      <CollapsibleSection
        title={t('general.contest')}
        isExpanded={expansion.contest}
        onToggle={() => setExpansion({ contest: !expansion.contest })}
        contentClassName="grid sm:grid-cols-2 grid-cols-1 gap-2 items-center"
      >
        <ContestSettings />
      </CollapsibleSection>

      <CollapsibleSection
        title={t('general.voting')}
        isExpanded={expansion.voting}
        onToggle={() => setExpansion({ voting: !expansion.voting })}
      >
        <VotingSettings />
      </CollapsibleSection>
      <CollapsibleSection
        title={t('general.uiPreferences')}
        isExpanded={expansion.uiPreferences}
        onToggle={() =>
          setExpansion({ uiPreferences: !expansion.uiPreferences })
        }
        contentClassName="grid sm:grid-cols-2 grid-cols-1 gap-1"
      >
        <UIPreferencesSettings />
      </CollapsibleSection>

      <Button
        variant="tertiary"
        className="w-full"
        onClick={() => {
          if (confirm(t('general.resetAllSettingsConfirmation'))) {
            resetAllSettings();
          }
        }}
      >
        {t('general.resetAllSettings')}
      </Button>
    </div>
  );
};
