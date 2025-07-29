import React from 'react';

import { BaseCountry, Country } from '../../../models';

import CountryStatsRow from './CountryStatsRow';
import { getCountryFlag } from './useFinalStats';

interface StatsTableProps {
  rankedCountries: (Country & { rank: number })[];
  votingCountries: BaseCountry[];
  getCellPoints: (
    participantCode: string,
    voterCode: string,
  ) => string | number;
  getCellClassName: (points: number) => string;
  getPoints: (country: Country) => number;
}

const StatsTable: React.FC<StatsTableProps> = ({
  rankedCountries,
  votingCountries,
  getCellPoints,
  getCellClassName,
  getPoints,
}) => {
  return (
    <div className="overflow-auto narrow-scrollbar mt-4">
      <table className="text-left border-collapse">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="p-2 min-w-[220px] w-[220px] h-auto"></th>
            {votingCountries.map((country) => (
              <th key={country.code} className="p-1 min-w-12 w-12">
                <img
                  src={getCountryFlag(country)}
                  alt={country.name}
                  className="w-8 h-6 object-cover rounded-sm mx-auto"
                  loading="lazy"
                  width={32}
                  height={24}
                  title={country.name}
                />
              </th>
            ))}
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
