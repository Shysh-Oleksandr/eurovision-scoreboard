import React from 'react';

import Image from 'next/image';

import { Country, EventStage, StageVotingMode } from '../../../models';

import { useBorderOpacity } from './useBorderOpacity';

import { getFlagPath } from '@/helpers/getFlagPath';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';

interface SummaryStatsProps {
  rankedCountries: (Country & { rank: number })[];
  selectedStage: EventStage | undefined;
  getPoints: (
    country: Country,
    type?: 'jury' | 'televote' | 'combined',
  ) => number;
  enableHover?: boolean;
}

const SummaryStats: React.FC<SummaryStatsProps> = ({
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
    countryHeader:
      'p-2 min-w-[200px] w-[200px] h-auto text-center border-r border-solid border-primary-900',
    totalPointsHeader:
      'p-2 min-w-[100px] w-[100px] h-auto text-center border-r border-solid border-primary-900',
    juryPointsHeader:
      'p-2 min-w-[100px] w-[100px] h-auto text-center border-r border-solid border-primary-900',
    telePointsHeader:
      'p-2 min-w-[100px] w-[100px] h-auto text-center border-r border-solid border-primary-900',
    juryPlacementHeader:
      'p-2 min-w-[100px] w-[100px] h-auto text-center border-r border-solid border-primary-900',
    telePlacementHeader: 'p-2 min-w-[100px] w-[100px] h-auto text-center',
    bodyRow: `border-b border-solid border-primary-900 ${
      enableHover ? 'hover:bg-primary-800/50' : ''
    }`,
    rankCell: 'p-2 text-center border-r border-solid border-primary-900',
    countryCell: 'p-2 border-r border-solid border-primary-900',
    pointsCell: 'p-2 text-center border-r border-solid border-primary-900',
    lastCell: 'p-2 text-center',
    countryContent: 'flex items-center gap-3 pl-1',
    countryName: 'font-medium truncate flex-1 leading-normal',
    pointsText: 'font-semibold text-lg',
    rankText: 'text-lg font-semibold',
  };

  // Calculate placements for jury and televote
  const juryPlacements = React.useMemo(() => {
    if (!shouldShowJuryAndTelevote) return new Map();

    const sortedByJury = [...rankedCountries].sort((a, b) => {
      const juryComparison = getPoints(b, 'jury') - getPoints(a, 'jury');

      if (juryComparison === 0) {
        return a.name.localeCompare(b.name);
      }

      return juryComparison;
    });

    const placements = new Map<string, number>();

    sortedByJury.forEach((country, index) => {
      placements.set(country.code, index + 1);
    });

    return placements;
  }, [rankedCountries, shouldShowJuryAndTelevote, getPoints]);

  const televotePlacements = React.useMemo(() => {
    if (!shouldShowJuryAndTelevote) return new Map();

    const sortedByTelevote = [...rankedCountries].sort((a, b) => {
      const televoteComparison =
        getPoints(b, 'televote') - getPoints(a, 'televote');

      if (televoteComparison === 0) {
        return a.name.localeCompare(b.name);
      }

      return televoteComparison;
    });

    const placements = new Map<string, number>();

    sortedByTelevote.forEach((country, index) => {
      placements.set(country.code, index + 1);
    });

    return placements;
  }, [rankedCountries, shouldShowJuryAndTelevote, getPoints]);

  return (
    <div
      className={`${enableHover ? 'overflow-auto' : ''} narrow-scrollbar`}
      style={cssVars}
    >
      <table className="text-left border-collapse w-full">
        <thead className="sticky top-0 z-10">
          <tr className={tableStyles.headerRow}>
            <th className={tableStyles.rankHeader}>Rank</th>
            <th className={tableStyles.countryHeader}>Country</th>
            <th className={tableStyles.totalPointsHeader}>Total Points</th>
            {shouldShowJuryAndTelevote && (
              <>
                <th className={tableStyles.juryPointsHeader}>Jury Points</th>
                <th className={tableStyles.telePointsHeader}>
                  Televote Points
                </th>
                <th className={tableStyles.juryPlacementHeader}>
                  Jury Placement
                </th>
                <th className={tableStyles.telePlacementHeader}>
                  Televote Placement
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rankedCountries.map((country, index, array) => {
            const isLastRow = index === array.length - 1;

            return (
              <tr
                key={country.code}
                className={`${tableStyles.bodyRow} ${
                  isLastRow ? 'border-b-0' : ''
                }`}
              >
                {/* Rank Column */}
                <td className={tableStyles.rankCell}>
                  <span className={tableStyles.rankText}>{country.rank}</span>
                </td>

                {/* Country Column */}
                <td className={tableStyles.countryCell}>
                  <div className={tableStyles.countryContent}>
                    {(() => {
                      const { logo, isExisting } = getHostingCountryLogo(
                        country,
                        shouldShowHeartFlagIcon,
                      );

                      return (
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
                      );
                    })()}
                    <span className={tableStyles.countryName}>
                      {country.name}
                    </span>
                  </div>
                </td>

                {/* Total Points Column */}
                <td className={tableStyles.pointsCell}>
                  <span className={tableStyles.pointsText}>
                    {getPoints(country, 'combined')}
                  </span>
                </td>

                {/* Jury and Televote Columns - only show if shouldShowJuryAndTelevote */}
                {shouldShowJuryAndTelevote && (
                  <>
                    {/* Jury Points */}
                    <td className={tableStyles.pointsCell}>
                      <span className={tableStyles.pointsText}>
                        {getPoints(country, 'jury')}
                      </span>
                    </td>

                    {/* Tele Points */}
                    <td className={tableStyles.pointsCell}>
                      <span className={tableStyles.pointsText}>
                        {getPoints(country, 'televote')}
                      </span>
                    </td>

                    {/* Jury Placement */}
                    <td className={tableStyles.pointsCell}>
                      <span className={tableStyles.pointsText}>
                        {juryPlacements.get(country.code)}
                      </span>
                    </td>

                    {/* Tele Placement */}
                    <td className={tableStyles.lastCell}>
                      <span className={tableStyles.pointsText}>
                        {televotePlacements.get(country.code)}
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

export default SummaryStats;
