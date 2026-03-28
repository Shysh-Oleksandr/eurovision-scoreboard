'use client';

import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';

import { useCountryStatsPickerSearch } from './useCountryStatsPickerSearch';

import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import { Input } from '@/components/Input';
import { useGetCategoryLabel } from '@/components/setup/hooks/useGetCategoryLabel';
import SearchInputIcon from '@/components/setup/SearchInputIcon';
import { getFlagPath } from '@/helpers/getFlagPath';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';

interface CountryStatsPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEntry: (entryCode: string) => void;
}

const CountryStatsPickerModal: React.FC<CountryStatsPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectEntry,
}) => {
  const t = useTranslations('widgets.contests.entryStats');
  const getCategoryLabel = useGetCategoryLabel();
  const shouldShowHeartFlagIcon = useGeneralStore(
    (state) => state.settings.shouldShowHeartFlagIcon,
  );

  const getAllCountries = useCountriesStore((state) => state.getAllCountries);
  const allCountriesForYear = useCountriesStore(
    (state) => state.allCountriesForYear,
  );

  const [availableCountries, setAvailableCountries] = useState(() =>
    getAllCountries(true),
  );

  useEffect(() => {
    const countries = getAllCountries(true).map((country) => ({
      ...country,
      aqSemiFinalGroup: allCountriesForYear.find((c) => c.code === country.code)
        ?.aqSemiFinalGroup,
    }));

    setAvailableCountries(countries);
  }, [allCountriesForYear, getAllCountries, isOpen]);

  const {
    countriesSearch,
    handleCountriesSearch,
    clearSearch,
    expandedCategories,
    handleToggleCategory,
    groupedCountries,
    sortedCategories,
  } = useCountryStatsPickerSearch(availableCountries);

  const nonEmptyCategories = useMemo(
    () =>
      sortedCategories.filter((c) => (groupedCountries[c]?.length ?? 0) > 0),
    [sortedCategories, groupedCountries],
  );

  const handlePick = (code: string) => {
    onSelectEntry(code);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,800px)]"
      contentClassName="text-white sm:h-[75vh] h-[70vh] max-h-[70vh] narrow-scrollbar !py-4"
      overlayClassName="!z-[1002]"
      withBlur
      bottomContent={<ModalBottomCloseButton onClose={onClose} />}
    >
      <div className="flex flex-col gap-3 px-1">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white mb-1">
            {t('pickerTitle')}
          </h2>
          <p className="text-sm text-white/60">{t('pickerSubtitle')}</p>
        </div>

        <div className="relative">
          <Input
            className="text-sm pr-10"
            name="entryStatsSearch"
            id="entryStatsSearch"
            placeholder={t('searchEntries')}
            value={countriesSearch}
            onChange={handleCountriesSearch}
          />
          <SearchInputIcon
            showClearIcon={countriesSearch.length > 0}
            onClick={() => countriesSearch.length > 0 && clearSearch()}
          />
        </div>

        <div className="flex flex-col gap-2">
          {nonEmptyCategories.length === 0 && (
            <p className="text-white/60 text-sm text-center py-6">
              {t('noEntriesMatch')}
            </p>
          )}
          {nonEmptyCategories.map((category) => (
            <CollapsibleSection
              key={category}
              title={getCategoryLabel(category)}
              isExpanded={!!expandedCategories[category]}
              onToggle={() => handleToggleCategory(category)}
            >
              <div className="grid lg:grid-cols-5 sm:grid-cols-4 2cols:grid-cols-3 grid-cols-2 gap-2">
                {groupedCountries[category].map((country) => {
                  const { logo, isExisting } = getHostingCountryLogo(
                    country,
                    shouldShowHeartFlagIcon,
                  );

                  return (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handlePick(country.code)}
                      className="flex items-center bg-primary-800 bg-gradient-to-bl from-[10%] from-primary-800 to-primary-700/60 hover:!bg-primary-700 p-2 rounded-md transition-colors duration-300 text-left"
                    >
                      <img
                        loading="lazy"
                        src={logo}
                        onError={(e) => {
                          e.currentTarget.src = getFlagPath('ww');
                        }}
                        alt=""
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
                    </button>
                  );
                })}
              </div>
            </CollapsibleSection>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default CountryStatsPickerModal;
