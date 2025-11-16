import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import { PlusIcon } from '../../../assets/icons/PlusIcon';
import { getFlagPath } from '../../../helpers/getFlagPath';
import { BaseCountry } from '../../../models';
import { useCountriesStore } from '../../../state/countriesStore';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import { Input } from '../../Input';
import SearchInputIcon from '../SearchInputIcon';

import { useVotersCountriesSearch } from './hooks/useVotersCountriesSearch';

import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';

const getAmountLabel = (itemsCount: number) => {
  if (itemsCount === 1) {
    return 'country';
  }

  return 'countries';
};

interface VotersCountriesSearchProps {
  localVotingCountries: BaseCountry[];
  onAddVoter: (country: BaseCountry) => void;
}

const VotersCountriesSearch: React.FC<VotersCountriesSearchProps> = ({
  localVotingCountries,
  onAddVoter,
}) => {
  const t = useTranslations('setup.eventStageModal');
  const shouldShowHeartFlagIcon = useGeneralStore(
    (state) => state.settings.shouldShowHeartFlagIcon,
  );

  const [availableCountries, setAvailableCountries] = useState<BaseCountry[]>(
    [],
  );

  const getAllCountries = useCountriesStore((state) => state.getAllCountries);

  // Load available countries on mount
  useEffect(() => {
    const countries = getAllCountries();

    setAvailableCountries(countries);
  }, [getAllCountries]);

  // Filter out countries that are already in the voting list
  const availableCountriesToAdd = availableCountries.filter(
    (country) =>
      !localVotingCountries.find((voter) => voter.code === country.code),
  );

  const {
    countriesSearch,
    handleCountriesSearch,
    clearSearch,
    expandedCategories,
    handleToggleCategory,
    groupedAvailableCountries,
    sortedCategories,
  } = useVotersCountriesSearch(availableCountriesToAdd);

  const handleAddAll = (countries: BaseCountry[]) => {
    countries.forEach((country) => onAddVoter(country));
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-white">
            {t('nonVotingCountries')}
          </h3>
          <p className="text-sm text-white/50">{t('searchAndClickToAdd')}</p>
        </div>
        <div className="relative">
          <Input
            className="sm:w-[200px] lg:text-[0.95rem] text-sm"
            name="countriesSearch"
            id="countriesSearch"
            placeholder={t('searchCountries')}
            value={countriesSearch}
            onChange={handleCountriesSearch}
          />
          <SearchInputIcon
            showClearIcon={countriesSearch.length > 0}
            onClick={() => countriesSearch.length > 0 && clearSearch()}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {sortedCategories.map((category) => (
          <CollapsibleSection
            key={category}
            title={category}
            isExpanded={!!expandedCategories[category]}
            onToggle={() => handleToggleCategory(category)}
            extraContent={
              groupedAvailableCountries[category].length > 0 && (
                <button
                  onClick={() =>
                    handleAddAll(groupedAvailableCountries[category])
                  }
                  className="text-sm font-medium bg-primary-800 bg-gradient-to-bl from-[10%] from-primary-800 to-primary-700/60 hover:!bg-primary-700 text-white pl-2 pr-1.5 py-1 rounded transition-colors flex items-center justify-between min-w-[118px] xs:gap-2 gap-1"
                >
                  {groupedAvailableCountries[category].length}{' '}
                  {getAmountLabel(groupedAvailableCountries[category].length)}
                  <PlusIcon className="w-6 h-6 text-white" />
                </button>
              )
            }
          >
            <div className="grid lg:grid-cols-5 sm:grid-cols-4 2cols:grid-cols-3 grid-cols-2 gap-2">
              {groupedAvailableCountries[category].map((country) => {
                const { logo, isExisting } = getHostingCountryLogo(
                  country,
                  shouldShowHeartFlagIcon,
                );

                return (
                  <button
                    key={country.code}
                    onClick={() => onAddVoter(country)}
                    className="flex items-center bg-primary-800 bg-gradient-to-bl from-[10%] from-primary-800 to-primary-700/60 hover:!bg-primary-700 p-2 rounded-md transition-colors duration-300 relative"
                  >
                    <img
                      loading="lazy"
                      src={logo}
                      onError={(e) => {
                        e.currentTarget.src = getFlagPath('ww');
                      }}
                      alt={`${country.name} flag`}
                      className={`flex-none rounded-sm ${
                        isExisting ? 'w-7 h-7' : 'w-7 h-5 object-cover'
                      }`}
                      width={32}
                      height={28}
                    />
                    <span
                      className="text-sm text-white flex-1 truncate ml-2"
                      title={country.name}
                    >
                      {country.name}
                    </span>
                    <PlusIcon className="w-6 h-6 text-white xs:ml-2" />
                  </button>
                );
              })}
            </div>
          </CollapsibleSection>
        ))}
      </div>
    </>
  );
};

export default VotersCountriesSearch;
