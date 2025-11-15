import React from 'react';

import Image from 'next/image';

import { getFlagPath } from '@/helpers/getFlagPath';
import { getHostingCountryLogo } from '@/theme/hosting';

type Props = {
  rankedCountries: Array<{ code: string; name: string; rank: number }>;
  votingCountries: Array<{ code: string; name: string }>;
  shouldShowHeartFlagIcon: boolean;
  isTotalOrCombinedVoteType: boolean;
  getVoterValidity: (
    voterCode: string,
  ) => 'valid' | 'invalid' | 'incomplete' | null;
  getTotalPointsForCountry: (countryCode: string) => number;
  getCellClassName: (points: number) => string;
  getCellValue: (participantCode: string, voterCode: string) => number;
  isSameCountry: (participantCode: string, voterCode: string) => boolean;
  isTotalOrCombinedDisabled: (
    participantCode: string,
    voterCode: string,
  ) => boolean;
  valueForCell: (participantCode: string, voterCode: string) => string;
  onChangeCell: (
    participantCode: string,
    voterCode: string,
    value: string,
  ) => void;
  onBlurCell: (
    participantCode: string,
    voterCode: string,
    value: string,
  ) => void;
};

export const VotingPredefinitionTable: React.FC<Props> = ({
  rankedCountries,
  votingCountries,
  shouldShowHeartFlagIcon,
  isTotalOrCombinedVoteType,
  getVoterValidity,
  getTotalPointsForCountry,
  getCellClassName,
  getCellValue,
  isSameCountry,
  isTotalOrCombinedDisabled,
  valueForCell,
  onChangeCell,
  onBlurCell,
}) => {
  return (
    <div className="narrow-scrollbar overflow-auto flex-1 min-h-0">
      <table className="text-left border-collapse">
        <thead className="sticky top-0 z-10 bg-primary-950 from-primary-950 to-primary-900 bg-gradient-to-bl">
          <tr>
            <th className="p-2 min-w-[220px] w-[220px] h-auto sm:bg-primary-900 sm:sticky sm:left-0 sm:z-[10] sm:rounded-tl-lg"></th>
            {votingCountries.map((country) => {
              const { logo, isExisting } = getHostingCountryLogo(
                country as any,
                shouldShowHeartFlagIcon,
              );

              return (
                <th key={country.code} className="p-1 min-w-12 w-12">
                  <div className="flex flex-col items-center justify-end gap-1.5">
                    {isTotalOrCombinedVoteType ? (
                      <span className="w-2.5 h-2.5"></span>
                    ) : (
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          getVoterValidity(country.code) === 'valid'
                            ? 'bg-green-500'
                            : getVoterValidity(country.code) === 'invalid'
                            ? 'bg-red-600'
                            : 'bg-yellow-500'
                        }`}
                        title={`$${country.name} - ${getVoterValidity(
                          country.code,
                        )}`}
                      />
                    )}
                    <Image
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
          {rankedCountries.map((country) => {
            const { logo, isExisting } = getHostingCountryLogo(
              country as any,
              shouldShowHeartFlagIcon,
            );

            return (
              <tr key={country.code}>
                <td className="p-2 min-w-[220px] w-[220px] sm:sticky sm:left-0 sm:z-[10] sm:bg-primary-900">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold w-6 text-center">
                      {country.rank}
                    </span>
                    <Image
                      src={logo}
                      alt={country.name}
                      className={`${
                        isExisting
                          ? 'w-8 h-8'
                          : 'w-8 h-6 object-cover rounded-sm'
                      }`}
                      width={32}
                      height={32}
                      onError={(e) => {
                        e.currentTarget.src = getFlagPath('ww');
                      }}
                    />
                    <span className="font-medium truncate flex-1 leading-normal">
                      {country.name}
                    </span>
                    <span className="font-bold text-lg">
                      {getTotalPointsForCountry(country.code)}
                    </span>
                  </div>
                </td>
                {votingCountries.map((voter) => {
                  const displayValue = getCellValue(country.code, voter.code);
                  const value = valueForCell(country.code, voter.code);
                  const same = isSameCountry(country.code, voter.code);
                  const disabled = isTotalOrCombinedDisabled(
                    country.code,
                    voter.code,
                  );

                  return (
                    <td
                      key={voter.code}
                      className={`p-1 min-h-12 h-12 text-center ${getCellClassName(
                        displayValue || 0,
                      )}`}
                    >
                      <input
                        className={`w-full h-full rounded-sm text-center focus:outline-none focus:ring-0 border-none ${
                          value === '' && !same && !isTotalOrCombinedVoteType
                            ? 'bg-primary-800/30'
                            : 'bg-transparent'
                        } ${
                          disabled
                            ? ''
                            : 'hover:bg-primary-800/60 focus:bg-primary-800/60 transition-colors duration-300'
                        } ${
                          isTotalOrCombinedVoteType && !same && value === ''
                            ? 'bg-primary-900/40'
                            : ''
                        } [&:disabled]:opacity-100`}
                        value={value}
                        inputMode="numeric"
                        disabled={disabled}
                        onChange={(e) =>
                          onChangeCell(country.code, voter.code, e.target.value)
                        }
                        onBlur={(e) =>
                          onBlurCell(country.code, voter.code, e.target.value)
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default VotingPredefinitionTable;
