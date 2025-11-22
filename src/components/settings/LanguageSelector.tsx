import { useLocale, useTranslations } from 'next-intl';
import React from 'react';
import { toast } from 'react-toastify';

import { useRouter } from 'next/navigation';

import { useUpdateProfileMutation } from '../../api/profiles';
import { useAuthStore } from '../../state/useAuthStore';
import CustomSelect from '../common/customSelect/CustomSelect';

import { getFlagPath } from '@/helpers/getFlagPath';
import { PreferredLocale } from '@/types/profile';

type LocaleOption = {
  label: string;
  value: PreferredLocale;
  imageUrl?: string;
};

const options: LocaleOption[] = [
  { label: 'English', value: 'en', imageUrl: getFlagPath('gb') },
  { label: 'Français', value: 'fr', imageUrl: getFlagPath('fr') },
  { label: 'Español', value: 'es', imageUrl: getFlagPath('es') },
  { label: 'Italiano', value: 'it', imageUrl: getFlagPath('it') },
  { label: 'Deutsch', value: 'de', imageUrl: getFlagPath('de') },
  { label: 'Ελληνικά', value: 'gr', imageUrl: getFlagPath('gr') },
  { label: 'Українська', value: 'uk', imageUrl: getFlagPath('ua') },
  { label: 'Polski', value: 'pl', imageUrl: getFlagPath('pl') },
];

export const LanguageSelector: React.FC = () => {
  const t = useTranslations('settings.ui');
  const locale = useLocale();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const updateProfile = useUpdateProfileMutation();

  const handleLanguageChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const nextLocale = e.target.value as PreferredLocale;

    if (nextLocale === locale) return;

    try {
      await fetch('/api/locale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ locale: nextLocale }),
      });

      if (user) {
        updateProfile.mutate({ preferredLocale: nextLocale });
      }

      router.refresh();
    } catch (error) {
      toast.error('Failed to update language');
    }
  };

  return (
    <div className="sm:col-span-2 sm:w-1/2">
      <CustomSelect
        options={options}
        value={(locale as PreferredLocale) || user?.preferredLocale || 'en'}
        onChange={(value) =>
          handleLanguageChange({
            target: { value },
          } as React.ChangeEvent<HTMLSelectElement>)
        }
        id="language-select-box"
        getImageClassName={() => 'w-8 h-6'}
        label={t('language')}
        className="ml-1"
        selectClassName="!shadow-none"
      />
    </div>
  );
};
