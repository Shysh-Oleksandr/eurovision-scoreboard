import React from 'react';

import Button from '../common/Button';
import { RangeSlider } from '../common/RangeSlider';
import { Tooltip } from '../common/Tooltip';

import { CountryOddsItem } from './CountryOddsItem';

import { InfoIcon } from '@/assets/icons/InfoIcon';
import { BaseCountry } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

const LABELS = [
  {
    label: 'Jury',
    color: 'bg-primary-700/80',
  },

  {
    label: 'Televote',
    color: 'bg-primary-800',
  },
];

interface OddsSettingsProps {
  countries: BaseCountry[];
}

export const OddsSettings: React.FC<OddsSettingsProps> = ({ countries }) => {
  const countryOdds = useCountriesStore((state) => state.countryOdds);
  const updateCountryOdds = useCountriesStore(
    (state) => state.updateCountryOdds,
  );
  const setBulkCountryOdds = useCountriesStore(
    (state) => state.setBulkCountryOdds,
  );
  const loadYearOdds = useCountriesStore((state) => state.loadYearOdds);
  const randomnessLevel = useScoreboardStore((state) => state.randomnessLevel);
  const setRandomnessLevel = useScoreboardStore(
    (state) => state.setRandomnessLevel,
  );

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

  if (countries.length === 0) {
    return (
      <div className="text-center space-y-1 mt-10">
        <p className="font-medium text-white text-xl">
          No participating countries selected yet
        </p>
        <p className="text-white/60 text-base">
          Go back to the setup and select countries for the event to set their
          odds
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <label htmlFor="randomness" className="block text-white text-sm">
            Randomness Level
          </label>
          <Tooltip
            content={
              <div className="space-y-2 font-medium">
                <p>
                  Each country has separate jury and televote odds (0–100).
                  <br />
                  <span className="font-bold">Higher number =</span> better
                  chance of getting more points.
                  <br />
                  Initial values are based on countries' real Eurovision results
                  for the selected year.
                </p>
                <p>
                  The Randomness Level slider controls predictability:
                  <br />
                  <span className="font-bold">Low =</span> more realistic,
                  following odds closely.
                  <br />
                  <span className="font-bold">High =</span> more chaotic,
                  unpredictable.
                </p>
              </div>
            }
          >
            <InfoIcon className="w-5 h-5 text-white/60 cursor-pointer" />
          </Tooltip>
        </div>
        <RangeSlider
          id="randomness"
          min={0}
          max={100}
          value={randomnessLevel}
          onChange={setRandomnessLevel}
          minLabel="Predictable"
          maxLabel="Chaotic"
        />
      </div>
      <div className="flex sm:items-end items-start gap-4 mb-4 justify-between flex-wrap sm:flex-row flex-col-reverse">
        <div className="flex items-center gap-2 flex-wrap">
          <Button className="md:text-base text-sm" onClick={handleRandomize}>
            Randomize
          </Button>
          <Button
            variant="tertiary"
            className="md:text-base text-sm"
            onClick={handleLoadYearData}
          >
            Load Year Data
          </Button>
          <Button
            variant="secondary"
            className="md:text-base text-sm"
            onClick={handleReset}
          >
            Reset
          </Button>
        </div>
        <div className="flex items-center gap-2 justify-end">
          {LABELS.map((label) => (
            <div className="flex items-center gap-2" key={label.label}>
              <div className={`w-3 h-3 rounded-full ${label.color}`}></div>
              <span>{label.label}</span>
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
