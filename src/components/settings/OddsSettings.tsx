import { useTranslations } from 'next-intl';
import React, { useEffect } from 'react';

import Button from '../common/Button';
import { RangeSlider } from '../common/RangeSlider';
import { Tooltip } from '../common/Tooltip';

import { CountryOddsItem } from './CountryOddsItem';

import { BaseCountry } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';

const LABELS = [
  {
    label: 'jury',
    color: 'bg-primary-700/80',
  },

  {
    label: 'televote',
    color: 'bg-primary-800',
  },
];

interface OddsSettingsProps {
  countries: BaseCountry[];
  onLoaded?: () => void;
}

const OddsSettings: React.FC<OddsSettingsProps> = ({ countries, onLoaded }) => {
  const t = useTranslations();
  const countryOdds = useCountriesStore((state) => state.countryOdds);
  const updateCountryOdds = useCountriesStore(
    (state) => state.updateCountryOdds,
  );
  const setBulkCountryOdds = useCountriesStore(
    (state) => state.setBulkCountryOdds,
  );
  const loadYearOdds = useCountriesStore((state) => state.loadYearOdds);
  const randomnessLevel = useGeneralStore(
    (state) => state.settings.randomnessLevel,
  );
  const setSettings = useGeneralStore((state) => state.setSettings);

  const handleOddsChange = (
    countryCode: string,
    oddType: 'jury' | 'televote',
    value?: number,
  ) => {
    const countryToUpdate = countries.find((c) => c.code === countryCode);

    if (!countryToUpdate) return;

    const { juryOdds, televoteOdds } = countryOdds[countryCode] || {};

    if (oddType === 'jury') {
      updateCountryOdds(countryCode, {
        juryOdds: value,
        televoteOdds,
      });
    } else {
      updateCountryOdds(countryCode, {
        juryOdds,
        televoteOdds: value,
      });
    }
  };

  const handleRandomize = () => {
    const newOdds: Record<
      string,
      { juryOdds?: number; televoteOdds?: number }
    > = {};

    countries.forEach((country) => {
      const juryOdds = Math.floor(Math.random() * 101);
      const minTelevote = Math.max(1, juryOdds - 50);
      const maxTelevote = Math.min(99, juryOdds + 50);

      let televoteOdds =
        Math.floor(Math.random() * (maxTelevote - minTelevote + 1)) +
        minTelevote;

      while (televoteOdds === juryOdds) {
        televoteOdds =
          Math.floor(Math.random() * (maxTelevote - minTelevote + 1)) +
          minTelevote;
      }
      newOdds[country.code] = { juryOdds, televoteOdds };
    });
    setBulkCountryOdds(newOdds);
  };

  const handleLoadYearData = () => {
    loadYearOdds(countries);
  };

  const handleReset = () => {
    const newOdds: Record<
      string,
      { juryOdds?: number; televoteOdds?: number }
    > = {};

    countries.forEach((country) => {
      newOdds[country.code] = { juryOdds: 50, televoteOdds: 50 };
    });
    setBulkCountryOdds(newOdds);
  };

  useEffect(() => {
    onLoaded?.();
  }, [onLoaded]);

  if (countries.length === 0) {
    return (
      <div className="text-center space-y-1 mt-10">
        <p className="font-medium text-white text-xl">
          {t('settings.odds.noParticipatingCountriesSelectedYet')}
        </p>
        <p className="text-white/60 text-base">
          {t(
            'settings.odds.goBackToSetupAndSelectCountriesForEventToSetTheirOdds',
          )}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 relative">
        <div className="absolute top-0 right-0">
          <Tooltip
            position="right"
            content={
              <div className="space-y-2 font-medium">
                <p>
                  {t.rich('settings.odds.oddsTooltip', {
                    br: () => <br />,
                    span: (chunks) => (
                      <span className="font-bold">{chunks}</span>
                    ),
                  })}
                </p>
                <p>
                  {t.rich('settings.odds.randomnessLevelTooltip', {
                    br: () => <br />,
                    span: (chunks) => (
                      <span className="font-bold">{chunks}</span>
                    ),
                  })}
                </p>
              </div>
            }
          />
        </div>
        <RangeSlider
          id="randomness"
          label={t('settings.odds.randomnessLevel')}
          min={0}
          max={100}
          value={randomnessLevel}
          onChange={(value) => setSettings({ randomnessLevel: value })}
          minLabel={t('settings.odds.predictable')}
          maxLabel={t('settings.odds.chaotic')}
        />
      </div>
      <div className="flex sm:items-end items-start gap-4 mb-4 justify-between flex-wrap sm:flex-row flex-col-reverse">
        <div className="flex items-center gap-2 flex-wrap">
          <Button className="md:text-base text-sm" onClick={handleRandomize}>
            {t('common.randomize')}
          </Button>
          <Button
            variant="tertiary"
            className="md:text-base text-sm"
            onClick={handleLoadYearData}
          >
            {t('settings.odds.loadYearData')}
          </Button>
          <Button
            variant="secondary"
            className="md:text-base text-sm"
            onClick={handleReset}
          >
            {t('common.reset')}
          </Button>
        </div>
        <div className="flex items-center gap-2 justify-end">
          {LABELS.map((label) => (
            <div className="flex items-center gap-2" key={label.label}>
              <div className={`w-3 h-3 rounded-full ${label.color}`}></div>
              <span>{t(`simulation.finalStats.${label.label}`)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {countries.map((country) => {
          const odds = countryOdds[country.code] || {};
          const countryWithOdds = {
            ...country,
            juryOdds: odds.juryOdds,
            televoteOdds: odds.televoteOdds,
          };

          return (
            <CountryOddsItem
              key={country.code}
              country={countryWithOdds}
              onOddsChange={(oddType, value) =>
                handleOddsChange(country.code, oddType, value)
              }
            />
          );
        })}
      </div>
    </>
  );
};

export default OddsSettings;
