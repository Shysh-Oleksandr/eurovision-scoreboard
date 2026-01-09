import React from 'react';

import { Country, StageVotingType } from '../../../models';

import CountryStatsRow from './CountryStatsRow';
import { useBorderOpacity } from './useBorderOpacity';

import { getFlagPath } from '@/helpers/getFlagPath';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { useStatsCustomizationStore } from '@/state/statsCustomizationStore';
import {
  getHostingCountryLogo,
  getHostingCountryLogoForImageGeneration,
} from '@/theme/hosting';

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
  enableHover?: boolean;
}

const StatsTable: React.FC<StatsTableProps> = ({
  rankedCountries,
  getCellPoints,
  getCellClassName,
  getPoints,
  selectedStageId,
  selectedVoteType,
  enableHover = true,
}) => {
  const shouldShowHeartFlagIcon = useGeneralStore(
    (state) => state.settings.shouldShowHeartFlagIcon,
  );
  const showVotingCountriesNames =
    useStatsCustomizationStore(
      (state) => state.settings.showVotingCountriesNames,
    ) && !enableHover;

  const getStageVotingCountries = useCountriesStore(
    (state) => state.getStageVotingCountries,
  );

  const cssVars = useBorderOpacity(!enableHover);

  const isRestOfWorldVoting =
    selectedVoteType === StageVotingType.TELEVOTE ||
    selectedVoteType === 'Total';

  const votingCountries = getStageVotingCountries(
    selectedStageId ?? undefined,
  ).filter((country) => country.code !== 'WW' || isRestOfWorldVoting);

  return (
    <div
      className={`narrow-scrollbar ${enableHover ? 'overflow-auto' : ''}`}
      style={cssVars}
    >
      <table className="text-left border-collapse">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="p-2 min-w-[220px] w-[220px] h-auto"></th>
            {votingCountries.map((country) => {
              const { logo, isExisting } = enableHover
                ? getHostingCountryLogo(country, shouldShowHeartFlagIcon)
                : getHostingCountryLogoForImageGeneration(
                    country,
                    shouldShowHeartFlagIcon,
                  );

              return (
                <th key={country.code} className="p-1 min-w-12 w-12">
                  <div
                    className={`flex flex-col items-center justify-end gap-1.5 ${
                      showVotingCountriesNames ? 'h-[100px]' : ''
                    }`}
                  >
                    {showVotingCountriesNames && (
                      <h5
                        className="text-white text-sm font-medium truncate"
                        style={{
                          writingMode: 'sideways-rl',
                          whiteSpace: 'nowrap',
                          lineHeight: 'normal',
                          letterSpacing: '0.05em',
                          overflow: 'hidden',
                          display: 'inline-block',
                          transform: 'rotate(180deg)',
                        }}
                      >
                        {country.code === 'WW' ? 'ROTW' : country.name}
                      </h5>
                    )}
                    <img
                      loading="lazy"
                      src={logo}
                      alt={country.name}
                      className={`${
                        isExisting
                          ? 'w-8 h-8'
                          : 'w-8 h-6 object-cover rounded-sm'
                      } mx-auto flex-shrink-0`}
                      width={32}
                      height={24}
                      title={country.name}
                      onError={(e) => {
                        e.currentTarget.src = getFlagPath('ww');
                      }}
                    />
                  </div>
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
              enableHover={enableHover}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StatsTable;
