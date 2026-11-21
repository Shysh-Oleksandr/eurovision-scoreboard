'use client';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import { useVotersCountriesSearch } from '../hooks/useVotersCountriesSearch';

import CaptionSelect from '@/components/common/CaptionSelect';
import { useGetCategoryLabel } from '@/components/setup/hooks/useGetCategoryLabel';
import LibrarySearchField from '@/components/setup/widgets-section/library/LibrarySearchField';
import { getFlagPath } from '@/helpers/getFlagPath';
import { BaseCountry } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { getHostingCountryLogo } from '@/theme/hosting';

/** Groups built from the stages rather than the map. */
const STAGE_GROUPS = new Set(['In stage', 'Other stage']);

interface VoterPoolProps {
  stageId: string;
  /** The current voters: they're left out of the pool. */
  voterCodes: ReadonlySet<string>;
  onAdd: (country: BaseCountry) => void;
  onAddAll: (countries: BaseCountry[]) => void;
}

/**
 * Where voters come from: a search over every country that doesn't vote
 * yet, one Group select (this stage, other stages, then the map's groups)
 * and the group's countries, each added with a tap. While searching, the
 * matches of every group show in one list with their group beside them.
 * Desktop: a column beside the voters; phones: the Add sheet.
 */
const VoterPool: React.FC<VoterPoolProps> = ({
  stageId,
  voterCodes,
  onAdd,
  onAddAll,
}) => {
  const t = useTranslations('setup.stageSetup');
  const getCategoryLabel = useGetCategoryLabel();
  const getAllCountries = useCountriesStore((state) => state.getAllCountries);
  const allCountriesForYear = useCountriesStore(
    (state) => state.allCountriesForYear,
  );
  const eventAssignments = useCountriesStore((state) => state.eventAssignments);
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const configuredEventStages = useCountriesStore(
    (state) => state.configuredEventStages,
  );
  const shouldShowHeartFlagIcon = useGeneralStore(
    (state) => state.settings.shouldShowHeartFlagIcon,
  );
  const shouldUse2026WhiteHeartFlags = useGeneralStore(
    (state) => state.settings.shouldUse2026WhiteHeartFlags,
  );

  const allCountries = useMemo(
    () =>
      getAllCountries().map((country) => ({
        ...country,
        aqSemiFinalGroup: allCountriesForYear.find(
          (c) => c.code === country.code,
        )?.aqSemiFinalGroup,
      })),
    [getAllCountries, allCountriesForYear],
  );
  const available = useMemo(
    () => allCountries.filter((country) => !voterCodes.has(country.code)),
    [allCountries, voterCodes],
  );

  const {
    search,
    setSearch,
    query,
    groupedAvailableCountries,
    sortedCategories,
  } = useVotersCountriesSearch(available, stageId);

  const [group, setGroup] = useState<string | null>(null);
  const searching = query.length > 0;
  const currentGroup =
    group && sortedCategories.includes(group) ? group : sortedCategories[0];

  const stageNames = useMemo(
    () =>
      new Map(
        [...eventStages, ...configuredEventStages].map((stage) => [
          stage.id.toLowerCase(),
          stage.name,
        ]),
      ),
    [eventStages, configuredEventStages],
  );

  // The stage a country performs in, for the "Other stage" group's rows.
  const stageNameOf = (code: string) => {
    const assigned = eventAssignments[code];

    return assigned && assigned !== stageId
      ? stageNames.get(assigned.toLowerCase())
      : undefined;
  };

  // Search: each match once, under the first group it's in.
  const rows = useMemo(() => {
    if (!searching) {
      return (groupedAvailableCountries[currentGroup] ?? []).map((country) => ({
        country,
        group: currentGroup,
      }));
    }
    const seen = new Set<string>();
    const list: { country: BaseCountry; group: string }[] = [];

    sortedCategories.forEach((category) => {
      groupedAvailableCountries[category].forEach((country) => {
        if (seen.has(country.code)) return;
        seen.add(country.code);
        list.push({ country, group: category });
      });
    });

    return list;
  }, [searching, groupedAvailableCountries, sortedCategories, currentGroup]);

  const captionFor = (country: BaseCountry, rowGroup: string) => {
    if (rowGroup === 'Other stage') {
      return stageNameOf(country.code) ?? getCategoryLabel(rowGroup);
    }
    if (searching || STAGE_GROUPS.has(rowGroup)) {
      return getCategoryLabel(rowGroup);
    }

    return undefined;
  };

  return (
    <div className="flex flex-col gap-2.5 [&>*]:flex-none">
      <LibrarySearchField
        value={search}
        onChange={setSearch}
        placeholder={t('searchCountries', { count: available.length })}
      />

      {!searching && sortedCategories.length > 0 && (
        <CaptionSelect
          caption={t('group')}
          value={currentGroup}
          onChange={setGroup}
          className="w-full"
          options={sortedCategories.map((category) => ({
            value: category,
            label: t('groupOption', {
              group: getCategoryLabel(category),
              count: groupedAvailableCountries[category].length,
            }),
          }))}
        />
      )}

      {rows.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-1 text-[13px] font-bold text-white/70">
          <span>
            {searching
              ? t('matches', { count: rows.length })
              : t('groupCount', { count: rows.length })}
          </span>
          <button
            type="button"
            onClick={() => onAddAll(rows.map((row) => row.country))}
            className="dp-lib-link rounded-lg px-1.5 py-1 text-[13.5px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            {t('addAll')}
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="px-1 py-3 text-[13px] font-semibold leading-[1.5] text-white/60">
          {searching ? t('noMatches', { query }) : t('poolEmpty')}
        </p>
      ) : (
        <ul className="m-0 list-none p-0">
          {rows.map(({ country, group: rowGroup }) => {
            const { logo, isExisting } = getHostingCountryLogo(
              country,
              shouldShowHeartFlagIcon,
              shouldUse2026WhiteHeartFlags,
            );
            const caption = captionFor(country, rowGroup);

            return (
              <li key={country.code}>
                <button
                  type="button"
                  onClick={() => onAdd(country)}
                  aria-label={t('addCountry', { name: country.name })}
                  className="dp-ss-pool-row flex w-full items-center gap-2.5 rounded-[10px] pl-1.5 pr-1 text-left"
                >
                  <img
                    loading="lazy"
                    src={logo}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.src = getFlagPath('ww');
                    }}
                    className={`flex-none rounded-[3px] ${
                      isExisting ? 'size-7' : 'h-[18px] w-[27px] object-cover'
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate text-[14px] font-bold">
                    {country.name}
                  </span>
                  {caption && (
                    <span className="max-w-[45%] flex-none truncate text-[12px] font-semibold text-white/55">
                      {caption}
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className="dp-ss-pool-plus grid size-8 flex-none place-items-center rounded-lg"
                  >
                    <Plus className="size-4" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default VoterPool;
