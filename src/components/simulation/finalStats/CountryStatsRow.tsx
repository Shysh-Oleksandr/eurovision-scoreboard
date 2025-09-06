import React from 'react';

import { BaseCountry, Country } from '../../../models';

import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';

interface CountryStatsRowProps {
  country: Country & { rank: number };
  votingCountries: BaseCountry[];
  getCellPoints: (
    participantCode: string,
    voterCode: string,
  ) => string | number;
  getCellClassName: (points: number) => string;
  getPoints: (country: Country) => number;
  enableHover?: boolean;
}

const CountryStatsRow: React.FC<CountryStatsRowProps> = ({
  country,
  votingCountries,
  getCellPoints,
  getCellClassName,
  getPoints,
  enableHover = true,
}) => {
  const shouldShowHeartFlagIcon = useGeneralStore(
    (state) => state.settings.shouldShowHeartFlagIcon,
  );
  const { logo, isExisting } = getHostingCountryLogo(
    country,
    shouldShowHeartFlagIcon,
  );

  return (
    <tr
      className={`border-b border-solid border-primary-900 ${
        enableHover ? 'hover:bg-primary-800/50' : ''
      }`}
    >
      <td className="p-2">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold w-6 text-center">
            {country.rank}
          </span>
          <img
            src={logo}
            alt={country.name}
            className={`${
              isExisting ? 'w-8 h-8' : 'w-8 h-6 object-cover rounded-sm'
            }`}
            loading="lazy"
            width={32}
            height={32}
          />
          <span className="font-medium truncate flex-1 leading-normal">
            {country.name}
          </span>
          <span className="font-bold text-lg">{getPoints(country)}</span>
        </div>
      </td>
      {votingCountries.map((voter) => {
        const points = getCellPoints(country.code, voter.code);

        return (
          <td
            key={voter.code}
            className={`p-1 min-h-12 h-12 text-center text-white ${getCellClassName(
              (points as number) || 0,
            )}`}
          >
            {points}
          </td>
        );
      })}
    </tr>
  );
};

export default CountryStatsRow;
