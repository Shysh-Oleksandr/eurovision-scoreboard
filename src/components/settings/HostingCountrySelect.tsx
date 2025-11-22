import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import { Checkbox } from '../common/Checkbox';
import CustomSelect from '../common/customSelect/CustomSelect';

import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';

export const HostingCountrySelect: React.FC = () => {
  const t = useTranslations('settings.contest');
  const getAllCountries = useCountriesStore((state) => state.getAllCountries);
  const settings = useGeneralStore((state) => state.settings);
  const setSettings = useGeneralStore((state) => state.setSettings);

  const options = useMemo(() => {
    return getAllCountries().map((country) => {
      const { logo, isExisting } = getHostingCountryLogo(country);

      return {
        label: country.name,
        value: country.code,
        imageUrl: logo,
        isExisting,
      };
    });
  }, [getAllCountries]);

  return (
    <>
      <Checkbox
        id="show-contest-logo"
        labelClassName="w-full"
        className="min-h-[44px] flex items-center"
        label={t('showHostingCountryFlag')}
        checked={settings.showHostingCountryLogo}
        onChange={(e) =>
          setSettings({ showHostingCountryLogo: e.target.checked })
        }
      />
      {settings.showHostingCountryLogo && (
        <CustomSelect
          options={options}
          value={settings.hostingCountryCode || 'CH'}
          onChange={(value) => setSettings({ hostingCountryCode: value })}
          id="hosting-country-select-box"
          className="ml-1"
          getImageClassName={(option) =>
            option.isExisting ? 'w-8 h-8 !object-contain' : 'w-8 h-6'
          }
          selectClassName="!shadow-none"
        />
      )}
    </>
  );
};
