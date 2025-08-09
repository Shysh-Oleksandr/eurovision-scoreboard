import React, { useMemo } from 'react';

import { Checkbox } from '../common/Checkbox';
import CustomSelect from '../common/customSelect/CustomSelect';

import { getFlagPath } from '@/helpers/getFlagPath';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';

export const HostingCountrySelect: React.FC = () => {
  const getAllCountries = useCountriesStore((state) => state.getAllCountries);
  const settings = useGeneralStore((state) => state.settings);
  const setSettings = useGeneralStore((state) => state.setSettings);

  const options = useMemo(() => {
    return getAllCountries().map((country) => ({
      label: country.name,
      value: country.code,
      imageUrl: getFlagPath(country),
    }));
  }, [getAllCountries]);

  return (
    <>
      <Checkbox
        id="show-contest-logo"
        labelClassName="w-full"
        className="min-h-[44px] flex items-center"
        label="Show hosting country flag"
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
          imageClassName="w-8 h-6"
        />
      )}
    </>
  );
};
