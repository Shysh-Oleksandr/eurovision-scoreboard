import React from 'react';

import { Country, StageVotingType } from '../../../models';

import CountryStatsRow from './CountryStatsRow';

import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';

interface StatsTableProps {
  rankedCountries: (Country & { rank: number })[];
  selectedStageId: string | null;
  getCellPoints: (
    participantCode: string,
    voterCode: string,
  ) => string | number;
  getCellClassName: (points: number) => string;
  getPoints: (country: Country) => number;
  selectedVoteType: StageVotingType | 'Total';
}

const StatsTable: React.FC<StatsTableProps> = ({
  rankedCountries,
  getCellPoints,
  getCellClassName,
  getPoints,
  selectedStageId,
  selectedVoteType,
}) => {
  const shouldShowHeartFlagIcon = useGeneralStore(
    (state) => state.settings.shouldShowHeartFlagIcon,
  );

  const getStageVotingCountries = useCountriesStore(
    (state) => state.getStageVotingCountries,
  );

  const isRestOfWorldVoting =
    selectedVoteType === StageVotingType.TELEVOTE ||
    selectedVoteType === 'Total';

  const votingCountries = getStageVotingCountries(
    selectedStageId ?? undefined,
  ).filter((country) => country.code !== 'WW' || isRestOfWorldVoting);

  return (
    <div className="overflow-auto narrow-scrollbar">
      <table className="text-left border-collapse">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="p-2 min-w-[220px] w-[220px] h-auto"></th>
            {votingCountries.map((country) => {
              const { logo, isExisting } = getHostingCountryLogo(
                country,
                shouldShowHeartFlagIcon,
              );

              return (
                <th key={country.code} className="p-1 min-w-12 w-12">
                  <img
                    src={logo}
                    alt={country.name}
                    className={`${
                      isExisting ? 'w-8 h-8' : 'w-8 h-6 object-cover rounded-sm'
                    } mx-auto`}
                    loading="lazy"
                    width={32}
                    height={24}
                    title={country.name}
                  />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rankedCountries.map((country) => (
            <CountryStatsRow
              key={country.code}
              country={country}
              votingCountries={votingCountries}
              getCellPoints={getCellPoints}
              getCellClassName={getCellClassName}
              getPoints={getPoints}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StatsTable;
