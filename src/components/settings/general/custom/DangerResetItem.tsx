'use client';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import { toast } from 'react-toastify';

import { RestartIcon } from '@/assets/icons/RestartIcon';
import { TriangleAlertIcon } from '@/assets/icons/TriangleAlertIcon';
import Button from '@/components/common/Button';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useGeneralStore } from '@/state/generalStore';

/**
 * The "Reset all settings" danger zone — a two-step (arm → confirm) affordance
 * that then runs the existing reset-all flow (which itself shows the app's
 * confirmation dialog when not suppressed, and a success toast).
 */
export const DangerResetItem: React.FC = () => {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const resetAllSettings = useGeneralStore((s) => s.resetAllSettings);
  const { confirm } = useConfirmation();
  const [armed, setArmed] = useState(false);

  const doReset = () => {
    setArmed(false);
    confirm({
      key: 'reset-all-settings',
      title: t('confirmations.resetAllSettings'),
      description: t('confirmations.resetAllSettingsDescription'),
      onConfirm: () => {
        resetAllSettings();
        toast.success(t('confirmations.resetAllSettingsSuccess'));
      },
    });
  };

  return (
    <div className="mx-3 my-2 rounded-[12px] border border-[var(--badge-red-bd)] bg-[var(--badge-red-bg)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[14.5px] font-bold text-[var(--badge-red-ink)]">
            <TriangleAlertIcon className="size-5 shrink-0" />
            {t('general.resetAllSettings')}
          </div>
          <p className="mt-1 text-[12.5px] text-white/50">
            {t('confirmations.resetAllSettingsDescription')}
          </p>
        </div>
        {armed ? (
          <div className="flex gap-2 max-sm:w-full">
            <Button
              variant="destructive"
              className="justify-center max-sm:flex-1"
              onClick={doReset}
              Icon={<RestartIcon className="size-4" />}
            >
              {t('general2.danger.confirm')}
            </Button>
            <Button
              variant="secondary"
              className="justify-center max-sm:flex-1"
              onClick={() => setArmed(false)}
            >
              {tCommon('cancel')}
            </Button>
          </div>
        ) : (
          <Button
            variant="destructive"
            className="justify-center max-sm:w-full"
            onClick={() => setArmed(true)}
            Icon={<RestartIcon className="size-4" />}
          >
            {t('general.resetAllSettings')}
          </Button>
        )}
      </div>
    </div>
  );
};
