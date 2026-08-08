import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { getFlagPath } from '@/helpers/getFlagPath';
import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';
import { cn } from '@/helpers/utils';
import { EventStage, StageVotingMode } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import {
  buildRankedCountriesForManualTotals,
  getDisplayTotal,
} from '@/state/scoreboard/manualShareTotalsHelpers';
import type { TargetAdjustment } from '@/state/scoreboard/totalsToStageVotes';
import type { ManualShareTotalsRow } from '@/state/scoreboard/types';
import { getHostingCountryLogo } from '@/theme/hosting';

type TotalsField = 'jury' | 'televote' | 'combined';

interface VotingTotalsShareTableProps {
  stage: EventStage;
  manualRowByCode: Record<string, ManualShareTotalsRow>;
  /**
   * `undefined` clears the field back to blank ("let the engine decide"), which
   * is meaningfully different from a pinned target of 0.
   */
  onCellChange: (
    countryCode: string,
    field: TotalsField,
    value: number | undefined,
  ) => void;
  sortByName?: boolean;
  /**
   * Per-field single-country maximum (voters × 12). When a typed value exceeds
   * it, the cell is flagged red — a free, generation-less feasibility check.
   */
  singleMaxByField?: Partial<Record<TotalsField, number>>;
  /** Adjustments from the last generation, keyed by country code. */
  adjustmentByCode?: Record<string, TargetAdjustment>;
}

const headerCell =
  'px-2.5 pb-2.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white/40';

type CellKey = `${string}:${string}`;

const VotingTotalsShareTable: React.FC<VotingTotalsShareTableProps> = ({
  stage,
  manualRowByCode,
  onCellChange,
  sortByName = false,
  singleMaxByField,
  adjustmentByCode,
}) => {
  const t = useTranslations('simulation.finalStats');
  const tSetup = useTranslations('setup.votingPredefinition');
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

  const singleField: TotalsField =
    stage.votingMode === StageVotingMode.COMBINED
      ? 'combined'
      : stage.votingMode === StageVotingMode.TELEVOTE_ONLY
      ? 'televote'
      : 'jury';

  const renderPointsInput = (countryCode: string, field: TotalsField) => {
    const key: CellKey = `${countryCode}:${field}`;
    const row = manualRowByCode[countryCode] || {};
    const val = row[field];
    const savedVal = val === undefined || val === null ? '' : String(val);
    const displayVal = key in drafts ? drafts[key] : savedVal;
    const max = singleMaxByField?.[field];
    const numericVal = parseFloat(displayVal);
    const overMax =
      max !== undefined && Number.isFinite(numericVal) && numericVal > max;

    const clearDraft = () =>
      setDrafts((prev) => {
        const next = { ...prev };

        delete next[key];

        return next;
      });

    return (
      <span
        className={cn(
          'inline-flex h-8 items-center justify-end gap-1 rounded-lg border pl-2.5 pr-1.5',
          'bg-black/[0.22] transition-colors focus-within:border-primary-700',
          overMax ? 'border-[#ff5d70]/50' : 'border-white/10',
        )}
      >
        <input
          inputMode="numeric"
          placeholder="—"
          aria-label={`${countryCode} ${field}`}
          className={cn(
            'w-[38px] border-0 bg-transparent text-right text-[13px] font-bold tabular-nums',
            'outline-none placeholder:text-white/25',
            overMax ? 'text-[#ff9aa5]' : 'text-white',
          )}
          value={displayVal}
          onChange={(e) => {
            setDrafts((prev) => ({ ...prev, [key]: e.target.value }));
          }}
          onBlur={(e) => {
            const raw = e.target.value.trim();
            const parsed = parseFloat(raw);

            // An emptied input clears the target back to blank rather than
            // pinning it to 0 — those mean very different things to the engine.
            onCellChange(
              countryCode,
              field,
              raw === '' || !Number.isFinite(parsed) ? undefined : parsed,
            );
            clearDraft();
          }}
        />
        <button
          type="button"
          title={tSetup('resetField')}
          aria-label={tSetup('resetField')}
          onClick={() => {
            clearDraft();
            onCellChange(countryCode, field, undefined);
          }}
          className={cn(
            'flex-none rounded p-0.5 text-white/25 transition-colors hover:text-white/70',
            displayVal === '' && 'invisible',
          )}
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    );
  };

  return (
    <div className="narrow-scrollbar min-h-0 flex-1 overflow-auto">
      <table className="w-full border-separate border-spacing-0 text-left text-[13px]">
        <thead>
          <tr>
            <th className={`${headerCell} w-[26px]`}>{t('rank')}</th>
            <th className={headerCell}>{t('country')}</th>
            {shouldShowJuryAndTelevote ? (
              <>
                <th className={`${headerCell} text-right`}>
                  {t('juryPoints')}
                </th>
                <th className={`${headerCell} text-right`}>
                  {t('televotePoints')}
                </th>
              </>
            ) : (
              <th className={`${headerCell} text-right`}>{t('totalPoints')}</th>
            )}
            {shouldShowJuryAndTelevote && (
              <th className={`${headerCell} text-right`}>{t('totalPoints')}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rankedCountries.map((country) => {
            const row = manualRowByCode[country.code] || {};
            const hasAnyValue = shouldShowJuryAndTelevote
              ? row.jury !== undefined || row.televote !== undefined
              : row[singleField] !== undefined;
            const total = getDisplayTotal(stage.votingMode, row);
            const { logo, isExisting } = getHostingCountryLogo(
              country as any,
              shouldShowHeartFlagIcon,
            );
            const adjustment = adjustmentByCode?.[country.code];

            return (
              <tr key={country.code}>
                <td className="border-t border-white/10 px-2.5 py-[5px] text-center font-extrabold tabular-nums text-white/40">
                  {country.rank}
                </td>

                <td className="border-t border-white/10 px-2.5 py-[5px]">
                  <div className="flex items-center gap-2.5 font-bold">
                    <img
                      loading="lazy"
                      src={logo}
                      alt={country.name}
                      className={cn(
                        'shrink-0',
                        isExisting
                          ? 'h-7 w-7'
                          : 'h-5 w-7 rounded-sm object-cover',
                      )}
                      width={28}
                      height={28}
                      onError={(e) => {
                        e.currentTarget.src = getFlagPath('ww');
                      }}
                    />
                    <span className="min-w-0 truncate">{country.name}</span>
                    {adjustment && (
                      <span
                        className="shrink-0 rounded-full border border-[#e6b23c]/30 bg-[#e6b23c]/[0.14] px-2 py-0.5 text-[11px] font-bold text-[#f0cd78]"
                        title={tSetup('adjustmentTooltip', {
                          requested: adjustment.requested,
                          achieved: adjustment.achieved,
                        })}
                      >
                        {tSetup('adjustmentBadge')}
                      </span>
                    )}
                  </div>
                </td>

                {shouldShowJuryAndTelevote ? (
                  <>
                    <td className="border-t border-white/10 px-2.5 py-[5px] text-right">
                      {renderPointsInput(country.code, 'jury')}
                    </td>
                    <td className="border-t border-white/10 px-2.5 py-[5px] text-right">
                      {renderPointsInput(country.code, 'televote')}
                    </td>
                  </>
                ) : (
                  <td className="border-t border-white/10 px-2.5 py-[5px] text-right">
                    {renderPointsInput(country.code, singleField)}
                  </td>
                )}

                {shouldShowJuryAndTelevote && (
                  <td className="border-t border-white/10 px-2.5 py-[5px] text-right font-extrabold tabular-nums text-primary-700">
                    {hasAnyValue ? toFixedIfDecimalFloat(total) : '—'}
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
