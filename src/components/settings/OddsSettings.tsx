import { Copy, LayoutGrid, List } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import Badge from '../common/Badge';
import Button from '../common/Button';
import { RangeSlider } from '../common/RangeSlider';
import Tabs from '../common/tabs/Tabs';
import { Tooltip } from '../common/Tooltip';

import { CountryOddsItem } from './CountryOddsItem';
import { CountryRankList } from './CountryRankList';

import { BaseCountry } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { rankOrderToOdds } from '@/state/scoreboard/rankToOdds';

type OddsViewMode = 'numbers' | 'rank';
type RankDimension = 'jury' | 'televote';
type RankLayout = 'list' | 'grid';

const layoutTabs = [
  {
    value: 'grid',
    label: <LayoutGrid className="w-6 h-6" />,
  },
  {
    value: 'list',
    label: <List className="w-6 h-6" />,
  },
];

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
  const pointsSpread = useGeneralStore((state) => state.settings.pointsSpread);
  const setSettings = useGeneralStore((state) => state.setSettings);

  const viewMode = useGeneralStore((state) => state.settings.oddsViewMode);
  const rankLayout = useGeneralStore((state) => state.settings.oddsRankLayout);
  const [rankDimension, setRankDimension] = useState<RankDimension>('jury');

  const handleCopyRanks = () => {
    const fromKey = rankDimension === 'jury' ? 'juryOdds' : 'televoteOdds';
    const toKey = rankDimension === 'jury' ? 'televoteOdds' : 'juryOdds';
    const payload: Record<
      string,
      { juryOdds?: number; televoteOdds?: number }
    > = {};

    countries.forEach((country) => {
      const existing = countryOdds[country.code] || {};

      payload[country.code] = {
        ...existing,
        [toKey]: existing[fromKey] ?? 50,
      };
    });

    setBulkCountryOdds(payload);
  };

  const handleRankReorder = (orderedCodes: string[]) => {
    const generated = rankOrderToOdds(orderedCodes, pointsSpread);
    const payload: Record<
      string,
      { juryOdds?: number; televoteOdds?: number }
    > = {};

    orderedCodes.forEach((code) => {
      const existing = countryOdds[code] || {};

      payload[code] =
        rankDimension === 'jury'
          ? {
              juryOdds: generated[code],
              televoteOdds: existing.televoteOdds ?? 50,
            }
          : {
              juryOdds: existing.juryOdds ?? 50,
              televoteOdds: generated[code],
            };
    });

    setBulkCountryOdds(payload);
  };

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
      <div className="flex gap-6 border-b relative border-white/10 mb-3.5">
        {(['numbers', 'rank'] as OddsViewMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setSettings({ oddsViewMode: mode })}
            className="relative pb-3 pt-1.5 text-[14px] font-bold bg-transparent border-none cursor-pointer transition-colors duration-150"
            style={{
              color: viewMode === mode ? '#fff' : 'rgba(255,255,255,.46)',
            }}
          >
            {t(`settings.odds.${mode}View`)}
            {viewMode === mode && (
              <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-t-[2px] bg-primary-700/80" />
            )}
          </button>
        ))}
        <div className="absolute top-0 right-0 z-10">
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
                <p>
                  {t.rich('settings.odds.pointsSpreadTooltip', {
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
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-6 mb-4">
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

        <RangeSlider
          containerClassName="mt-3 sm:mt-0"
          id="points-spread"
          label={t('settings.odds.pointsSpread')}
          min={0}
          max={100}
          value={pointsSpread}
          onChange={(value) => setSettings({ pointsSpread: value })}
          minLabel={t('settings.odds.tight')}
          maxLabel={t('settings.odds.wide')}
        />
      </div>
      {viewMode === 'numbers' ? (
        <>
          <div className="flex sm:items-end items-start gap-4 mb-4 justify-between flex-wrap sm:flex-row flex-col-reverse">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                className="md:text-base text-sm"
                onClick={handleRandomize}
              >
                {t('common.randomize')}
              </Button>
              <Button
                variant="tertiary"
                className="md:text-base text-sm"
                onClick={handleLoadYearData}
              >
                {t('common.loadYearData')}
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
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-2">
              {(['jury', 'televote'] as RankDimension[]).map((dim) => (
                <Badge
                  key={dim}
                  label={t(`simulation.finalStats.${dim}`)}
                  isActive={rankDimension === dim}
                  onClick={() => setRankDimension(dim)}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="tertiary"
                className="!p-2.5"
                onClick={handleCopyRanks}
                title={t(
                  rankDimension === 'jury'
                    ? 'settings.odds.copyRanksToTelevote'
                    : 'settings.odds.copyRanksToJury',
                )}
              >
                <Copy className="w-5 h-5" />
              </Button>
              <Tabs
                tabs={layoutTabs}
                activeTab={rankLayout}
                setActiveTab={(tab) =>
                  setSettings({ oddsRankLayout: tab as RankLayout })
                }
                containerClassName="!p-[3px] !overflow-hidden !h-11 !w-[112px]"
                overlayClassName="!inset-y-[2px]"
                buttonClassName="!py-0 !px-0 h-full"
              />
            </div>
          </div>
          <p className="text-[12.5px] text-white/40 mt-1 mb-2">
            {t('settings.odds.dragToRankHint')}
          </p>
          <CountryRankList
            countries={countries}
            dimension={rankDimension}
            pointsSpread={pointsSpread}
            layout={rankLayout}
            onReorder={handleRankReorder}
          />
        </>
      )}
    </>
  );
};

export default OddsSettings;
