import { AlertTriangle, Info, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import { VotingBarButton } from './VotingBarControls';
import { VotingCallout } from './VotingCallout';
import VotingTotalsShareTable from './VotingTotalsShareTable';

import BudgetBar from '@/components/common/BudgetBar';
import { EventStage } from '@/models';
import { RankChannel } from '@/state/scoreboard/rankToStageVotes';
import {
  channelSingleMax,
  ChannelBudget,
  TargetAdjustment,
  TargetField,
} from '@/state/scoreboard/totalsToStageVotes';
import type { ManualShareTotalsRow } from '@/state/scoreboard/types';

type ChannelBudgetInfo = {
  channel: RankChannel;
  field: TargetField;
  budget: ChannelBudget;
};

type Props = {
  stage: EventStage;
  localTotals: Record<string, ManualShareTotalsRow>;
  /** `undefined` clears the field back to blank (unpinned). */
  onCellChange: (
    countryCode: string,
    field: 'jury' | 'televote' | 'combined',
    value: number | undefined,
  ) => void;
  sortByName: boolean;
  budgets: ChannelBudgetInfo[];
  status: 'ungenerated' | 'fresh' | 'stale';
  adjustments: TargetAdjustment[];
  onGenerate: () => void;
  /** The explainer is dismissible and re-openable from the header "?" button. */
  showHelp: boolean;
  onDismissHelp: () => void;
};

const budgetTitleKey: Record<TargetField, string> = {
  jury: 'budgetTitleJury',
  televote: 'budgetTitleTelevote',
  combined: 'budgetTitleCombined',
};

/**
 * Totals-entry mode: type a target total per participant (per channel), watch the
 * live budget/feasibility bars, then generate a real best-fit vote breakdown that
 * can be saved and simulated. Generation is explicit; editing a total after
 * generating marks the breakdown stale (Save disabled until regenerated).
 */
export const TotalsPredefinitionView: React.FC<Props> = ({
  stage,
  localTotals,
  onCellChange,
  sortByName,
  budgets,
  status,
  adjustments,
  onGenerate,
  showHelp,
  onDismissHelp,
}) => {
  const tSetup = useTranslations('setup.votingPredefinition');

  const countryName = useMemo(() => {
    const map: Record<string, string> = {};

    stage.countries.forEach((c) => {
      map[c.code] = c.name;
    });

    return map;
  }, [stage.countries]);

  const participantCount = stage.countries.length;

  // Per-field single-country cap for the table's live red-flag.
  const singleMaxByField = useMemo(() => {
    const out: Partial<Record<'jury' | 'televote' | 'combined', number>> = {};

    budgets.forEach(({ field, budget }) => {
      out[field] = channelSingleMax(budget);
    });

    return out;
  }, [budgets]);

  const adjustmentByCode = useMemo(() => {
    const out: Record<string, TargetAdjustment> = {};

    adjustments.forEach((a) => {
      out[a.code] = a;
    });

    return out;
  }, [adjustments]);

  const warnings: string[] = [];

  const bars = budgets.map(({ channel, field, budget }) => {
    let used = 0;
    const maxSingle = channelSingleMax(budget);
    let worstOver: { code: string; value: number } | null = null;

    stage.countries.forEach((c) => {
      const raw = localTotals[c.code]?.[field];

      if (raw !== undefined && raw !== null && Number.isFinite(raw)) {
        used += raw;
        if (raw > maxSingle && (!worstOver || raw > worstOver.value)) {
          worstOver = { code: c.code, value: raw };
        }
      }
    });

    if (worstOver) {
      warnings.push(
        tSetup('budgetOverSingle', {
          country: countryName[(worstOver as { code: string }).code],
          value: (worstOver as { value: number }).value,
          max: maxSingle,
          voters: budget.voters,
          top: budget.maxValue,
        }),
      );
    } else if (used > budget.budget) {
      warnings.push(tSetup('budgetOverBudget', { total: budget.budget }));
    }

    return {
      key: channel,
      title: tSetup(budgetTitleKey[field]),
      used,
      total: budget.budget,
      usedLabel: tSetup('budgetUsed', { used, total: budget.budget }),
      isInfeasible: !!worstOver,
    };
  });

  // "Filled" counts a country once, whichever channel(s) it was typed into.
  const filledCount = useMemo(
    () =>
      stage.countries.filter((c) =>
        budgets.some(({ field }) => {
          const raw = localTotals[c.code]?.[field];

          return raw !== undefined && raw !== null && Number.isFinite(raw);
        }),
      ).length,
    [stage.countries, budgets, localTotals],
  );

  const statusText =
    status === 'fresh'
      ? tSetup('totalsInSyncHint')
      : status === 'stale'
      ? tSetup('totalsStaleHint')
      : tSetup('totalsUngeneratedHint');

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3.5">
      {showHelp && (
        <VotingCallout
          variant="info"
          icon={<Info className="h-[18px] w-[18px]" />}
          onDismiss={onDismissHelp}
          dismissLabel={tSetup('dismissHelp')}
        >
          {tSetup.rich('totalsIntro', {
            b: (chunks) => <b>{chunks}</b>,
          })}
        </VotingCallout>
      )}

      <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3.5">
        <div className="flex flex-col gap-3">
          {bars.map((bar) => (
            <BudgetBar
              key={bar.key}
              title={bar.title}
              used={bar.used}
              total={bar.total}
              usedLabel={bar.usedLabel}
              isInfeasible={bar.isInfeasible}
            />
          ))}
          <p className="text-[12.5px] font-medium leading-relaxed text-white/40">
            {tSetup('budgetFillCount', {
              filled: filledCount,
              count: participantCount,
            })}
          </p>
        </div>
      </div>

      {warnings.map((warning) => (
        <VotingCallout
          key={warning}
          variant="warn"
          icon={<AlertTriangle className="h-[18px] w-[18px]" />}
        >
          {warning}
        </VotingCallout>
      ))}

      <div className="flex flex-wrap items-center gap-2.5">
        <VotingBarButton
          variant="primary"
          onClick={onGenerate}
          // Already in sync: regenerating would silently rebuild every ballot to
          // land on the same totals, discarding the current breakdown for no
          // visible change. Edit a total to unlock it.
          disabled={status === 'fresh'}
          icon={<Sparkles className="h-4 w-4" />}
        >
          {status === 'ungenerated'
            ? tSetup('generateBreakdown')
            : tSetup('regenerateBreakdown')}
        </VotingBarButton>
        <p className="text-[12.5px] font-medium leading-relaxed text-white/40">
          {statusText}
        </p>
      </div>

      {status !== 'ungenerated' && adjustments.length > 0 && (
        <VotingCallout
          variant="warn"
          icon={<AlertTriangle className="h-[18px] w-[18px]" />}
        >
          <b>{tSetup('totalsAdjustedTitle')}</b>{' '}
          {tSetup('totalsAdjustedExplainer')}
        </VotingCallout>
      )}

      <VotingTotalsShareTable
        stage={stage}
        manualRowByCode={localTotals}
        onCellChange={onCellChange}
        sortByName={sortByName}
        singleMaxByField={singleMaxByField}
        adjustmentByCode={adjustmentByCode}
      />
    </div>
  );
};

export default TotalsPredefinitionView;
