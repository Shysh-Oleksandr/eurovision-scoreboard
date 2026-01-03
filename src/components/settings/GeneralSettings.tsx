import { useTranslations } from 'next-intl';
import React from 'react';
import { toast } from 'react-toastify';

import { useGeneralStore } from '../../state/generalStore';
import Button from '../common/Button';
import { CollapsibleSection } from '../common/CollapsibleSection';

import { ConfirmationsSettings } from './ConfirmationsSettings';
import { ContestSettings } from './ContestSettings';
import { UIPreferencesSettings } from './UIPreferencesSettings';
import { VotingSettings } from './VotingSettings';

import { RestartIcon } from '@/assets/icons/RestartIcon';
import { useConfirmation } from '@/hooks/useConfirmation';

export const GeneralSettings: React.FC = () => {
  const t = useTranslations('settings');
  const resetAllSettings = useGeneralStore((state) => state.resetAllSettings);
  const expansion = useGeneralStore((state) => state.generalSettingsExpansion);
  const setExpansion = useGeneralStore(
    (state) => state.setGeneralSettingsExpansion,
  );
  const { confirm } = useConfirmation();

  return (
    <div className="flex flex-col gap-3">
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

      <CollapsibleSection
        title={t('general.confirmations')}
        isExpanded={expansion.confirmations}
        onToggle={() =>
          setExpansion({ confirmations: !expansion.confirmations })
        }
      >
        <ConfirmationsSettings />
      </CollapsibleSection>

      <Button
        variant="tertiary"
        className="w-full justify-center"
        onClick={() => {
          confirm({
            key: 'reset-all-settings',
            title: t('confirmations.resetAllSettings'),
            description: t('confirmations.resetAllSettingsDescription'),
            onConfirm: () => {
              resetAllSettings();
              toast.success(t('confirmations.resetAllSettingsSuccess'));
            },
          });
        }}
        Icon={<RestartIcon className="size-5" />}
      >
        {t('general.resetAllSettings')}
      </Button>
    </div>
  );
};
