import { useTranslations } from 'next-intl';
import React from 'react';

import Button from '../common/Button';

import { RestartIcon } from '@/assets/icons/RestartIcon';
import { useConfirmationStore } from '@/state/confirmationStore';

export const ConfirmationsSettings: React.FC = () => {
  const t = useTranslations('settings.confirmations');
  const { preferences, resetConfirmation, resetAllConfirmations } =
    useConfirmationStore();

  const confirmationKeys = Object.keys(preferences);

  const getConfirmationLabel = (key: string) => {
    // This could be expanded to provide human-readable labels for each confirmation type
    const labels: Record<string, string> = {
      'reset-contest': t('resetContest'),
      'manual-televote-warning': t('manualTelevoteWarning'),
      'reset-all-settings': t('resetAllSettings'),
      'delete-custom-country': t('deleteCustomCountry'),
      'save-imported-custom-entries': t('saveImportedCustomEntries'),
      'change-contest-year': t('changeContestYear'),
      'grand-final-only-change': t('grandFinalOnlyChange'),
      'delete-theme': t('deleteTheme'),
      'delete-stage': t('deleteStage'),
      'delete-contest': t('deleteContest'),
      'remove-saved-contest': t('removeSavedContest'),
      'remove-saved-theme': t('removeSavedTheme'),
      'cancel-simulation': t('cancelSimulation'),
      logout: t('logout'),
    };

    return (
      labels[key] ||
      key.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  if (confirmationKeys.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-white/80 text-sm">{t('description')}</div>
        <div className="text-white/80 text-center py-3">
          {t('noConfirmationsDisabled')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-white/80 text-sm">{t('description')}</div>

      <div className="space-y-2">
        {confirmationKeys.map((key) => (
          <div
            key={key}
            className="flex items-center justify-between px-3 py-2 bg-gradient-to-bl from-[10%] from-primary-800 to-primary-700/60 rounded-lg"
          >
            <span className="text-white font-medium">
              {getConfirmationLabel(key)}
            </span>
            <Button
              variant="destructive"
              onClick={() => resetConfirmation(key)}
              className="!px-3 !py-2 !text-sm"
              Icon={<RestartIcon className="size-4" />}
            >
              {t('reset')}
            </Button>
          </div>
        ))}
      </div>

      {confirmationKeys.length > 1 && (
        <div className="pt-3 border-solid border-t border-white/10">
          <Button
            variant="destructive"
            onClick={resetAllConfirmations}
            className="w-full justify-center"
            Icon={<RestartIcon className="size-5" />}
          >
            {t('resetAllConfirmations')}
          </Button>
        </div>
      )}
    </div>
  );
};
