import React, { useMemo } from 'react';

import CustomSelect from '@/components/common/customSelect/CustomSelect';
import { DEFAULT_HOSTING_COUNTRY_CODE } from '@/data/data';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';

/**
 * Country picker for the hosting flag — the conditional child of the
 * "Show hosting country flag" switch. The enabling boolean is driven by the
 * model's switch row; this renders only the select.
 */
export const HostingCountryDropdown: React.FC = () => {
  const getAllCountries = useCountriesStore((state) => state.getAllCountries);
  const hostingCountryCode = useGeneralStore(
    (state) => state.settings.hostingCountryCode,
  );
  const setSettings = useGeneralStore((state) => state.setSettings);

  const options = useMemo(
    () =>
      getAllCountries().map((country) => {
        const { logo, isExisting } = getHostingCountryLogo(country);

        return {
          label: country.name,
          value: country.code,
          imageUrl: logo,
          isExisting,
        };
      }),
    [getAllCountries],
  );

  return (
    <div className="px-3 py-2">
      <CustomSelect
        options={options}
        value={hostingCountryCode || DEFAULT_HOSTING_COUNTRY_CODE}
        onChange={(value) => setSettings({ hostingCountryCode: value })}
        id="hosting-country-select-box"
        className="w-full"
        getImageClassName={(option) =>
          option.isExisting ? 'w-8 h-8 !object-contain' : 'w-8 h-6'
        }
        selectClassName="!shadow-none"
      />
    </div>
  );
};
