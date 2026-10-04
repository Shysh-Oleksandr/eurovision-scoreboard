'use client';
import { ArrowLeftRight, Dices, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';
import { toast } from 'react-toastify';

import { useAllocationDrawContext } from './AllocationDrawContext';
import { errorCopy, useDrawCopy } from './drawCopy';
import { moveSemiFinalistsIntoDraw } from './drawMode';
import { codesInDrawSemis } from './useAllocationDraw';

import Button from '@/components/common/Button';
import { useLineupModelContext } from '@/components/setup/hub/lineup/LineupProvider';
import { TO_BE_DRAWN_LIST } from '@/components/setup/hub/lineup/listIds';
import StageCard from '@/components/setup/hub/lineup/StageCard';
import TileGrid from '@/components/setup/hub/lineup/TileGrid';
import { useCountriesStore } from '@/state/countriesStore';

interface ToBeDrawnCardProps {
  codes: string[];
  matches: Set<string> | null;
}

/**
 * The draw-mode bucket above the semis: participants without a stage yet,
 * grouped by pot. Pot rows are display only; dropping anywhere on the card
 * adds a country to the draw.
 */
const ToBeDrawnCard: React.FC<ToBeDrawnCardProps> = ({ codes, matches }) => {
  const t = useTranslations('setup.allocationDraw');
  const model = useAllocationDrawContext();
  const { byCode } = useLineupModelContext();
  const semiFinalistsInSemis = useCountriesStore(
    (s) =>
      codesInDrawSemis(s.configuredEventStages, s.eventAssignments, model.rules)
        .length,
  );
  const stageName = (id: string) =>
    model.input.semis.find((s) => s.id === id)?.name ?? id;
  const copy = useDrawCopy((code) => byCode.get(code)?.name ?? code, stageName);

  const rows = useMemo(() => {
    const waiting = new Set(codes);
    const byName = (a: string, b: string) =>
      (byCode.get(a)?.name ?? a).localeCompare(byCode.get(b)?.name ?? b);

    if (model.rules.pots === 'none') {
      return [{ label: null, codes: [...codes].sort(byName) }];
    }

    return model.input.pots
      .map((pot, i) => ({
        label: t('pot', { number: i + 1 }),
        codes: pot.members.filter((c) => waiting.has(c)).sort(byName),
      }))
      .filter((row) => row.codes.length > 0);
  }, [byCode, codes, model.input.pots, model.rules.pots, t]);

  const error =
    model.error &&
    model.error.kind !== 'empty' &&
    model.error.kind !== 'fewSemis'
      ? errorCopy(copy, model.error, model.rules)
      : null;

  return (
    <StageCard
      title={t('toBeDrawn')}
      listId={TO_BE_DRAWN_LIST}
      codes={codes}
      kind="draw"
      badge={
        <span className="dp-dice-badge hidden 2cols:grid w-[26px] h-[26px] rounded-lg place-items-center flex-none">
          <Dices className="size-4" />
        </span>
      }
      description={t('toBeDrawnDescription')}
      matches={matches}
      eager
      notice={
        error && (
          <div
            role="status"
            className="dp-draw-warn flex items-start gap-2.5 px-3 py-2.5 mb-3 rounded-[10px] text-[12.5px] font-semibold leading-[1.4] text-white"
          >
            <TriangleAlert className="size-[17px] flex-none mt-px text-[var(--badge-red-ink)]" />
            <span className="text-pretty">
              <b className="font-extrabold">{error.title}.</b> {error.text}
            </span>
          </div>
        )
      }
    >
      {codes.length === 0 ? (
        <div className="dp-empty flex flex-col items-center gap-2.5 px-4 py-[22px] rounded-xl text-center">
          <Dices className="size-[22px] dp-accent-ink" />
          <p className="m-0 text-[13.5px] font-bold text-white/70 text-pretty">
            {t('toBeDrawnEmpty')}
          </p>
          {semiFinalistsInSemis > 0 && (
            <Button
              variant="surface"
              size="sm"
              Icon={<ArrowLeftRight className="size-4" />}
              onClick={() => {
                const moved = moveSemiFinalistsIntoDraw();

                if (moved > 0) {
                  toast.success(t('toastMovedToDraw', { count: moved }));
                }
              }}
            >
              {t('moveSemiFinalistsHere', { count: semiFinalistsInSemis })}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-[9px]">
          {rows.map((row, i) => (
            <div
              key={row.label ?? i}
              className={`grid gap-1.5 2cols:gap-2.5 items-start ${
                row.label ? '2cols:grid-cols-[58px_minmax(0,1fr)]' : ''
              }`}
            >
              {row.label && (
                <div
                  className="text-[11px] font-extrabold tracking-[.08em] uppercase text-white/70 whitespace-nowrap pt-0.5 2cols:pt-3"
                  title={t('potTooltip')}
                >
                  {row.label}
                </div>
              )}
              <TileGrid
                codes={row.codes}
                listId={TO_BE_DRAWN_LIST}
                variant="stage"
                matches={matches}
                eager
              />
            </div>
          ))}
        </div>
      )}
    </StageCard>
  );
};

export default ToBeDrawnCard;
