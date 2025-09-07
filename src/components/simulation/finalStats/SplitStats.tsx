import React from 'react';

import { Country, EventStage, StageVotingMode } from '../../../models';

import { useBorderOpacity } from './useBorderOpacity';

import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';

interface SplitStatsProps {
  rankedCountries: (Country & { rank: number })[];
  selectedStage: EventStage | undefined;
  getPoints: (
    country: Country,
    type?: 'jury' | 'televote' | 'combined',
  ) => number;
  enableHover?: boolean;
}

const SplitStats: React.FC<SplitStatsProps> = ({
  rankedCountries,
  selectedStage,
  getPoints,
  enableHover = true,
}) => {
  const shouldShowHeartFlagIcon = useGeneralStore(
    (state) => state.settings.shouldShowHeartFlagIcon,
  );

  const cssVars = useBorderOpacity(!enableHover);

  // Check if we should show jury and televote columns
  const shouldShowJuryAndTelevote =
    selectedStage &&
    (selectedStage.votingMode === StageVotingMode.JURY_AND_TELEVOTE ||
      selectedStage.votingMode === StageVotingMode.COMBINED);

  // Extract common className styles
  const tableStyles = {
    headerRow: 'border-b border-solid border-primary-900',
    rankHeader:
      'p-2 min-w-[60px] w-[60px] h-auto text-center border-r border-solid border-primary-900',
    totalHeader:
      'p-2 min-w-[200px] w-[200px] h-auto text-center border-r border-solid border-primary-900',
    totalPointsHeader:
      'p-2 min-w-[100px] w-[100px] h-auto text-center border-r border-solid border-primary-900',
    juryHeader:
      'p-2 min-w-[200px] w-[200px] h-auto text-center border-r border-solid border-primary-900',
    televoteHeader: 'p-2 min-w-[200px] w-[200px] h-auto text-center',
    subHeader: 'p-2 min-w-[80px] w-[80px] h-auto',
    countrySubHeader:
      'p-2 min-w-[140px] w-[140px] h-auto text-center border-x border-solid border-primary-900',
    countryHeader:
      'p-2 min-w-[200px] w-[200px] h-auto text-center border-r border-solid border-primary-900',
    pointsSubHeader:
      'p-2 min-w-[60px] w-[60px] h-auto text-center border-r border-solid border-primary-900',
    jurySubHeader:
      'p-2 min-w-[140px] w-[140px] h-auto text-center border-r border-solid border-primary-900',
    televoteSubHeader:
      'p-2 min-w-[140px] w-[140px] h-auto text-center border-r border-solid border-primary-900',
    bodyRow: `border-b border-solid border-primary-900 ${
      enableHover ? 'hover:bg-primary-800/50' : ''
    }`,
    rankCell: 'p-2 text-center border-r border-solid border-primary-900',
    countryCell: 'p-2 border-r border-solid border-primary-900',
    pointsCell: 'p-2 text-center border-r border-solid border-primary-900',
    lastPointsCell: 'p-2 text-center',
    countryContent: 'flex items-center gap-3 pl-1',
    countryName: 'font-medium truncate flex-1 leading-normal',
    pointsText: 'font-semibold text-lg',
    rankText: 'text-lg font-semibold',
  };

  // Sort countries by different criteria for each column
  const countriesByTotal = [...rankedCountries].sort((a, b) => {
    const totalComparison = getPoints(b, 'combined') - getPoints(a, 'combined');

    if (totalComparison === 0) {
      return a.name.localeCompare(b.name);
    }

    return totalComparison;
  });

  const countriesByJury = [...rankedCountries].sort((a, b) => {
    const juryComparison = getPoints(b, 'jury') - getPoints(a, 'jury');

    if (juryComparison === 0) {
      return a.name.localeCompare(b.name);
    }

    return juryComparison;
  });

  const countriesByTelevote = [...rankedCountries].sort((a, b) => {
    const televoteComparison =
      getPoints(b, 'televote') - getPoints(a, 'televote');

    if (televoteComparison === 0) {
      return a.name.localeCompare(b.name);
    }

    return televoteComparison;
  });

  return (
    <div
      className={`${enableHover ? 'overflow-auto' : ''} narrow-scrollbar`}
      style={cssVars}
    >
      <table className="text-left border-collapse w-full">
        <thead className="sticky top-0 z-10">
          {shouldShowJuryAndTelevote ? (
            <>
              <tr className={tableStyles.headerRow}>
                <th className={tableStyles.rankHeader}>Rank</th>
                <th className={tableStyles.totalHeader} colSpan={2}>
                  Total
                </th>
                <th className={tableStyles.juryHeader} colSpan={2}>
                  Jury
                </th>
                <th className={tableStyles.televoteHeader} colSpan={2}>
                  Televote
                </th>
              </tr>
              <tr className={tableStyles.headerRow}>
                <th className={tableStyles.subHeader}></th>
                <th className={tableStyles.countrySubHeader}>Country</th>
                <th className={tableStyles.pointsSubHeader}>Points</th>
                <th className={tableStyles.jurySubHeader}>Country</th>
                <th className={tableStyles.pointsSubHeader}>Points</th>
                <th className={tableStyles.televoteSubHeader}>Country</th>
                <th className={tableStyles.pointsSubHeader + ' border-r-0'}>
                  Points
                </th>
              </tr>
            </>
          ) : (
            <tr className={tableStyles.headerRow}>
              <th className={tableStyles.rankHeader}>Rank</th>
              <th className={tableStyles.countryHeader}>Country</th>
              <th className={tableStyles.totalPointsHeader}>Points</th>
            </tr>
          )}
        </thead>
        <tbody>
          {rankedCountries.map((_, index, array) => {
            const isLastRow = index === array.length - 1;
            const totalCountry = countriesByTotal[index];
            const juryCountry = countriesByJury[index];
            const televoteCountry = countriesByTelevote[index];

            return (
              <tr
                key={totalCountry.code}
                className={`${tableStyles.bodyRow} ${
                  isLastRow ? 'border-b-0' : ''
                }`}
              >
                <td className={tableStyles.rankCell}>
                  <span className={tableStyles.rankText}>{index + 1}</span>
                </td>

                {/* Total Column */}
                <td className={tableStyles.countryCell}>
                  <div className={tableStyles.countryContent}>
                    {(() => {
                      const { logo, isExisting } = getHostingCountryLogo(
                        totalCountry,
                        shouldShowHeartFlagIcon,
                      );

                      return (
                        <img
                          src={logo}
                          alt={totalCountry.name}
                          className={`${
                            isExisting
                              ? 'w-8 h-8'
                              : 'w-8 h-6 object-cover rounded-sm'
                          }`}
                          loading="lazy"
                          width={32}
                          height={32}
                        />
                      );
                    })()}
                    <span className={tableStyles.countryName}>
                      {totalCountry.name}
                    </span>
                  </div>
                </td>
                <td className={tableStyles.pointsCell}>
                  <span className={tableStyles.pointsText}>
                    {getPoints(totalCountry, 'combined')}
                  </span>
                </td>

                {/* Jury Column - only show if shouldShowJuryAndTelevote */}
                {shouldShowJuryAndTelevote && (
                  <>
                    <td className={tableStyles.countryCell}>
                      <div className={tableStyles.countryContent}>
                        {(() => {
                          const { logo, isExisting } = getHostingCountryLogo(
                            juryCountry,
                            shouldShowHeartFlagIcon,
                          );

                          return (
                            <img
                              src={logo}
                              alt={juryCountry.name}
                              className={`${
                                isExisting
                                  ? 'w-8 h-8'
                                  : 'w-8 h-6 object-cover rounded-sm'
                              }`}
                              loading="lazy"
                              width={32}
                              height={32}
                            />
                          );
                        })()}
                        <span className={tableStyles.countryName}>
                          {juryCountry.name}
                        </span>
                      </div>
                    </td>
                    <td className={tableStyles.pointsCell}>
                      <span className={tableStyles.pointsText}>
                        {getPoints(juryCountry, 'jury')}
                      </span>
                    </td>
                  </>
                )}

                {/* Televoting Column - only show if shouldShowJuryAndTelevote */}
                {shouldShowJuryAndTelevote && (
                  <>
                    <td className={tableStyles.countryCell}>
                      <div className={tableStyles.countryContent}>
                        {(() => {
                          const { logo, isExisting } = getHostingCountryLogo(
                            televoteCountry,
                            shouldShowHeartFlagIcon,
                          );

                          return (
                            <img
                              src={logo}
                              alt={televoteCountry.name}
                              className={`${
                                isExisting
                                  ? 'w-8 h-8'
                                  : 'w-8 h-6 object-cover rounded-sm'
                              }`}
                              loading="lazy"
                              width={32}
                              height={32}
                            />
                          );
                        })()}
                        <span className={tableStyles.countryName}>
                          {televoteCountry.name}
                        </span>
                      </div>
                    </td>
                    <td className={tableStyles.lastPointsCell}>
                      <span className={tableStyles.pointsText}>
                        {getPoints(televoteCountry, 'televote')}
                      </span>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SplitStats;
