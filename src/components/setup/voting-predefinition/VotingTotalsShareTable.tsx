import { useTranslations } from 'next-intl';
import React from 'react';

import { Input } from '@/components/Input';
import { getFlagPath } from '@/helpers/getFlagPath';
import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';
import { EventStage, StageVotingMode } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import {
  buildRankedCountriesForManualTotals,
  getDisplayTotal,
} from '@/state/scoreboard/manualShareTotalsHelpers';
import type { ManualShareTotalsRow } from '@/state/scoreboard/types';
import { getHostingCountryLogo } from '@/theme/hosting';

interface VotingTotalsShareTableProps {
  stage: EventStage;
  manualRowByCode: Record<string, ManualShareTotalsRow>;
  onCellChange: (
    countryCode: string,
    field: 'jury' | 'televote' | 'combined',
    value: number,
  ) => void;
  sortByName?: boolean;
}

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
  bodyRow: 'border-b border-solid border-primary-900 hover:bg-primary-800/50',
  rankCell: 'p-2 text-center border-r border-solid border-primary-900',
  countryCell: 'p-2 border-r border-solid border-primary-900',
  pointsCell: 'p-2 text-center border-r border-solid border-primary-900',
  lastCell: 'p-2 text-center',
  countryContent: 'flex items-center gap-3 pl-1 max-w-[180px]',
  countryName: 'font-medium truncate flex-1 leading-normal',
  pointsText: 'font-semibold text-lg',
  rankText: 'text-lg font-semibold',
  inputCell: 'p-1 max-w-[80px]',
};

type CellKey = `${string}:${string}`;

const VotingTotalsShareTable: React.FC<VotingTotalsShareTableProps> = ({
  stage,
  manualRowByCode,
  onCellChange,
  sortByName = false,
}) => {
  const t = useTranslations('simulation.finalStats');
  const shouldShowHeartFlagIcon = useGeneralStore(
    (state) => state.settings.shouldShowHeartFlagIcon,
  );
  const [drafts, setDrafts] = React.useState<Record<CellKey, string>>({});

  const rankedCountries = React.useMemo(() => {
    const byPoints = buildRankedCountriesForManualTotals(
      stage,
      manualRowByCode,
    );

    if (sortByName) {
      return [...byPoints].sort((a, b) => a.name.localeCompare(b.name));
    }

    return byPoints;
  }, [stage, manualRowByCode, sortByName]);

  const shouldShowJuryAndTelevote =
    stage.votingMode === StageVotingMode.JURY_AND_TELEVOTE;

  const renderPointsInput = (
    countryCode: string,
    field: 'jury' | 'televote' | 'combined',
  ) => {
    const key: CellKey = `${countryCode}:${field}`;
    const row = manualRowByCode[countryCode] || {};
    const val =
      field === 'jury'
        ? row.jury
        : field === 'televote'
        ? row.televote
        : row.combined;
    const savedVal = val === undefined || val === null ? '' : String(val);
    const displayVal = key in drafts ? drafts[key] : savedVal;

    return (
      <Input
        type="number"
        min={0}
        step={1}
        className="!py-1.5 !text-base text-center"
        value={displayVal}
        onChange={(e) => {
          setDrafts((prev) => ({ ...prev, [key]: e.target.value }));
        }}
        onBlur={(e) => {
          const raw = e.target.value;
          const parsed = parseFloat(raw);

          onCellChange(
            countryCode,
            field,
            Number.isFinite(parsed) ? parsed : 0,
          );
          setDrafts((prev) => {
            const next = { ...prev };

            delete next[key];

            return next;
          });
        }}
      />
    );
  };

  return (
    <div className="overflow-auto narrow-scrollbar">
      <table className="text-left border-collapse w-full">
        <thead className="sticky top-0 z-10">
          <tr className={tableStyles.headerRow}>
            <th className={tableStyles.rankHeader}>{t('rank')}</th>
            <th className={tableStyles.countryHeader}>{t('country')}</th>
            {shouldShowJuryAndTelevote ? (
              <>
                <th className={tableStyles.juryPointsHeader}>
                  {t('juryPoints')}
                </th>
                <th className={tableStyles.telePointsHeader}>
                  {t('televotePoints')}
                </th>
                <th className={tableStyles.totalPointsHeader}>
                  {t('totalPoints')}
                </th>
              </>
            ) : (
              <th className={tableStyles.totalPointsHeader}>
                {t('totalPoints')}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rankedCountries.map((country, index, array) => {
            const isLastRow = index === array.length - 1;
            const row = manualRowByCode[country.code] || {};
            const total = getDisplayTotal(stage.votingMode, row);

            return (
              <tr
                key={country.code}
                className={`${tableStyles.bodyRow} ${
                  isLastRow ? 'border-b-0' : ''
                }`}
              >
                <td className={tableStyles.rankCell}>
                  <span className={tableStyles.rankText}>{country.rank}</span>
                </td>

                <td className={tableStyles.countryCell}>
                  <div className={tableStyles.countryContent}>
                    {(() => {
                      const { logo, isExisting } = getHostingCountryLogo(
                        country as any,
                        shouldShowHeartFlagIcon,
                      );

                      return (
                        <img
                          loading="lazy"
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

                {shouldShowJuryAndTelevote ? (
                  <>
                    <td className={tableStyles.inputCell}>
                      {renderPointsInput(country.code, 'jury')}
                    </td>
                    <td className={tableStyles.inputCell}>
                      {renderPointsInput(country.code, 'televote')}
                    </td>
                    <td className={tableStyles.pointsCell}>
                      <span className={tableStyles.pointsText}>
                        {toFixedIfDecimalFloat(total)}
                      </span>
                    </td>
                  </>
                ) : (
                  <td className={tableStyles.inputCell}>
                    {stage.votingMode === StageVotingMode.JURY_ONLY &&
                      renderPointsInput(country.code, 'jury')}
                    {stage.votingMode === StageVotingMode.TELEVOTE_ONLY &&
                      renderPointsInput(country.code, 'televote')}
                    {stage.votingMode === StageVotingMode.COMBINED &&
                      renderPointsInput(country.code, 'combined')}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default VotingTotalsShareTable;
