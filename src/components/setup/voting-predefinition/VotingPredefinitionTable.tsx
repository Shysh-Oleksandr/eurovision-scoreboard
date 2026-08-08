import { useTranslations } from 'next-intl';
import React from 'react';

import { getFlagPath } from '@/helpers/getFlagPath';
import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';
import { cn } from '@/helpers/utils';
import { getHostingCountryLogo } from '@/theme/hosting';

export type VoterValidity = 'valid' | 'invalid' | 'incomplete' | null;

/**
 * Validity dot colours are deliberately fixed rather than hue-derived: a ballot
 * being complete/incomplete/invalid must read the same in every contest theme.
 */
const VALIDITY_DOT: Record<'valid' | 'invalid' | 'incomplete', string> = {
  valid: 'bg-[#3ad29a]',
  incomplete: 'bg-[#e6b23c]',
  invalid: 'bg-[#ff5d70]',
};

type Props = {
  rankedCountries: Array<{ code: string; name: string; rank: number }>;
  votingCountries: Array<{ code: string; name: string }>;
  shouldShowHeartFlagIcon: boolean;
  isTotalOrCombinedVoteType: boolean;
  getVoterValidity: (voterCode: string) => VoterValidity;
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

/**
 * The Detailed tab's points matrix: participants down, voters across. Both the
 * header row and the rank + participant columns stay pinned while scrolling in
 * either direction, so a cell never loses its labels.
 */
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
  const tSetup = useTranslations('setup.votingPredefinition');

  const validityLabel = (validity: VoterValidity) => {
    if (validity === 'valid') return tSetup('validityComplete');
    if (validity === 'invalid') return tSetup('validityInvalid');

    return tSetup('validityIncomplete');
  };

  return (
    <div className="narrow-scrollbar min-h-0 flex-1 overflow-auto rounded-xl border border-white/10 bg-black/[0.16]">
      {/* `w-full` + the trailing filler column: with few voters the columns keep
          their fixed widths and the filler absorbs the slack, rather than every
          cell stretching. */}
      <table className="w-full border-separate border-spacing-0 text-left text-[11.5px]">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-[3] h-9 w-7 min-w-7 border-b border-r border-white/[0.06] bg-primary-900" />
            <th className="sticky left-7 top-0 z-[3] h-9 min-w-[132px] border-b border-r border-white/[0.06] bg-primary-900 px-2 text-left font-bold text-white/55 sm:min-w-[150px]">
              {tSetup('participantColumn')}
            </th>
            {votingCountries.map((country) => {
              const { logo, isExisting } = getHostingCountryLogo(
                country as any,
                shouldShowHeartFlagIcon,
              );
              const validity = getVoterValidity(country.code);

              return (
                <th
                  key={country.code}
                  className="sticky top-0 z-[2] h-9 w-10 min-w-10 border-b border-r border-white/[0.06] bg-primary-900 p-0"
                  title={
                    isTotalOrCombinedVoteType
                      ? country.name
                      : `${country.name} — ${validityLabel(validity)}`
                  }
                >
                  <div className="flex flex-col items-center justify-end gap-[3px] px-1.5 pb-1 pt-[5px]">
                    <img
                      loading="lazy"
                      src={logo}
                      alt={country.name}
                      className={cn(
                        'shrink-0',
                        isExisting
                          ? 'h-6 w-6'
                          : 'h-[18px] w-6 rounded-sm object-cover',
                      )}
                      width={24}
                      height={24}
                      onError={(e) => {
                        e.currentTarget.src = getFlagPath('ww');
                      }}
                    />
                    <span
                      className={cn(
                        'h-[7px] w-[7px] rounded-full',
                        isTotalOrCombinedVoteType || !validity
                          ? 'bg-white/20'
                          : VALIDITY_DOT[validity],
                      )}
                    />
                  </div>
                </th>
              );
            })}
            <th className="sticky top-0 z-[2] h-9 w-full border-b border-white/[0.06] bg-primary-900" />
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
                <td className="sticky left-0 z-[1] w-7 min-w-7 border-b border-r border-white/[0.06] bg-primary-900 text-center font-extrabold text-white/40">
                  {country.rank}
                </td>
                <td className="sticky left-7 z-[1] min-w-[132px] whitespace-nowrap border-b border-r border-white/[0.06] bg-primary-900 px-2 sm:min-w-[150px]">
                  <div className="flex items-center gap-2">
                    <img
                      loading="lazy"
                      src={logo}
                      alt={country.name}
                      className={cn(
                        'shrink-0',
                        isExisting
                          ? 'h-6 w-6'
                          : 'h-[18px] w-6 rounded-sm object-cover',
                      )}
                      width={24}
                      height={24}
                      onError={(e) => {
                        e.currentTarget.src = getFlagPath('ww');
                      }}
                    />
                    <span className="truncate text-[12.5px] font-bold text-white">
                      {country.name}
                    </span>
                    <span className="ml-auto pl-2.5 font-extrabold tabular-nums text-primary-700">
                      {toFixedIfDecimalFloat(
                        getTotalPointsForCountry(country.code),
                      )}
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

                  // A country never votes for itself — render the diagonal as a
                  // hatched, non-interactive cell instead of an empty input.
                  if (same) {
                    return (
                      <td
                        key={voter.code}
                        className="h-8 w-10 min-w-10 border-b border-r border-white/[0.06] bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.04),rgba(255,255,255,0.04)_4px,transparent_4px,transparent_8px)]"
                      />
                    );
                  }

                  return (
                    <td
                      key={voter.code}
                      className={cn(
                        'h-8 w-10 min-w-10 border-b border-r border-white/[0.06] p-0 text-center',
                        getCellClassName(displayValue || 0),
                      )}
                    >
                      <input
                        className={cn(
                          'h-8 w-full border-none bg-transparent text-center text-[12px] font-bold tabular-nums',
                          'text-white/75 outline-none transition-colors duration-200',
                          'focus:bg-white/[0.14] focus:text-white focus:shadow-[inset_0_0_0_2px_hsl(var(--twc-primary-700))]',
                          disabled
                            ? 'cursor-default text-primary-700 opacity-100'
                            : 'hover:bg-white/[0.07]',
                        )}
                        value={value}
                        inputMode="numeric"
                        disabled={disabled}
                        aria-label={`${country.name} — ${voter.name}`}
                        onFocus={(e) => e.currentTarget.select()}
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
                <td className="w-full border-b border-white/[0.06]" />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default VotingPredefinitionTable;
