'use client';
import { useTranslations } from 'next-intl';
import React, { useCallback, useMemo } from 'react';

import { useLineupModelContext } from './LineupProvider';
import { NOT_QUALIFIED_LIST } from './listIds';
import StageCard from './StageCard';
import { useLineupSearch } from './useLineupSearch';

import { useAllocationDrawContext } from '@/components/setup/allocation-draw/AllocationDrawContext';
import {
  grandFinalDrawDescription,
  grandFinalVotersDescription,
  useDrawCopy,
} from '@/components/setup/allocation-draw/drawCopy';
import DrawnChip from '@/components/setup/allocation-draw/DrawnChip';
import DrawPlaceholderTile from '@/components/setup/allocation-draw/DrawPlaceholderTile';
import ToBeDrawnCard from '@/components/setup/allocation-draw/ToBeDrawnCard';
import {
  isDrawnInfoCurrent,
  useAllocationDrawStore,
} from '@/state/allocationDrawStore';

interface StageListProps {
  isGfOnly: boolean;
}

/**
 * Stage cards in order, plus the "Not qualified" card in Grand-Final-only mode
 * and the "To be drawn" card while the allocation draw is on.
 */
const StageList: React.FC<StageListProps> = ({ isGfOnly }) => {
  const t = useTranslations('setup.eventSetupModal');
  const tDraw = useTranslations('setup.allocationDraw');
  const { stages, notQualified, toBeDrawn, byCode } = useLineupModelContext();
  const { matches } = useLineupSearch();
  const draw = useAllocationDrawContext();
  const drawn = useAllocationDrawStore((s) => s.drawn);

  const stageName = useCallback(
    (id: string) => stages.find((s) => s.stage.id === id)?.stage.name ?? id,
    [stages],
  );
  const nameOf = useCallback(
    (code: string) => byCode.get(code)?.name ?? code,
    [byCode],
  );
  const copy = useDrawCopy(nameOf, stageName);

  const drawMode = draw.enabled || toBeDrawn.length > 0;
  const drawSemiIds = useMemo(
    () => new Set(draw.semis.map((s) => s.id)),
    [draw.semis],
  );
  const finalId = draw.finalStage?.id;
  const firstDrawSemiIndex = stages.findIndex((s) =>
    drawSemiIds.has(s.stage.id),
  );

  // "Drawn" chips: only while a semi still holds exactly the drawn line-up.
  const currentDrawn = useMemo(
    () =>
      stages
        .map((entry) => ({
          stageId: entry.stage.id,
          info: isDrawnInfoCurrent(drawn[entry.stage.id], entry.codes)
            ? drawn[entry.stage.id]
            : undefined,
        }))
        .filter((e) => e.info),
    [stages, drawn],
  );

  const finalDescription = useMemo(() => {
    if (!finalId) return undefined;
    if (drawMode) return grandFinalDrawDescription(copy, draw.input);
    if (currentDrawn.length === 0) return undefined;

    return (
      grandFinalVotersDescription(
        copy,
        currentDrawn.map((e) => ({
          stageId: e.stageId,
          codes: e.info!.voters,
        })),
      ) || undefined
    );
  }, [finalId, drawMode, copy, draw.input, currentDrawn]);

  const pinnedInFinal = useCallback(
    (code: string) => {
      const stageId = draw.votesIn[code];

      return stageId && drawSemiIds.has(stageId)
        ? tDraw('votesInStage', { stage: stageName(stageId) })
        : null;
    },
    [draw.votesIn, drawSemiIds, stageName, tDraw],
  );

  return (
    <>
      {stages.map((entry, i) => {
        const { id } = entry.stage;
        const inDraw = drawMode && drawSemiIds.has(id);
        const isFinal = id === finalId;
        const target = draw.sizes[id];
        const drawnInfo = currentDrawn.find((e) => e.stageId === id)?.info;
        const pinLabel = tDraw('fixedIn', { stage: entry.stage.name });

        return (
          <React.Fragment key={id}>
            {drawMode && i === firstDrawSemiIndex && (
              <ToBeDrawnCard codes={toBeDrawn} matches={matches} />
            )}
            <StageCard
              title={entry.stage.name}
              listId={entry.listId}
              codes={entry.codes}
              kind={entry.isFinal ? 'final' : 'semi'}
              index={i + 1}
              stage={entry.stage}
              qualifiers={isGfOnly ? null : entry.qualifiers}
              matches={matches}
              eager={i === 0}
              description={
                inDraw
                  ? tDraw('semiDescription')
                  : isFinal
                  ? finalDescription
                  : undefined
              }
              chip={!drawMode && drawnInfo ? <DrawnChip /> : undefined}
              pinnedFor={
                inDraw
                  ? () => pinLabel
                  : isFinal && drawMode && draw.rules.preq === 'drawn'
                  ? pinnedInFinal
                  : undefined
              }
              extraTile={
                inDraw && target !== undefined ? (
                  <DrawPlaceholderTile
                    remaining={target - entry.codes.length}
                  />
                ) : undefined
              }
            />
          </React.Fragment>
        );
      })}
      {isGfOnly && (
        <StageCard
          title={t('notQualified')}
          listId={NOT_QUALIFIED_LIST}
          codes={notQualified}
          kind="notQualified"
          matches={matches}
        />
      )}
    </>
  );
};

export default StageList;
