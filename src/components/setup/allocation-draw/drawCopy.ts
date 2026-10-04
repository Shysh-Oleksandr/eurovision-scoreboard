/**
 * Turns the engine's structured steps, errors and state into copy. The engine
 * stays translation-free; everything user-facing is resolved here with the
 * `setup.allocationDraw` namespace.
 */
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { splitEvenly } from '@/state/allocationDraw/engine';
import type {
  DrawEntrantStep,
  DrawError,
  DrawGroupStep,
  DrawInput,
  DrawPreqStep,
  DrawRules,
} from '@/state/allocationDraw/types';

export type DrawT = ReturnType<typeof useTranslations<'setup.allocationDraw'>>;

export type DrawFixId =
  | 'show-lineup'
  | 'back-lineup'
  | 'open-customize'
  | 'fix-split'
  | 'fix-preq'
  | 'fix-sizes'
  | 'fix-semis';

export interface DrawErrorCopy {
  title: string;
  text: string;
  fixes: Array<{ id: DrawFixId; label: string; primary?: boolean }>;
}

export interface DrawCopyContext {
  t: DrawT;
  nameOf: (code: string) => string;
  stageName: (stageId: string) => string;
  listNames: (names: string[]) => string;
  potName: (potIndex: number, rules: DrawRules) => string;
}

/** Shared helpers (names, list formatting, stage names) bound to the current locale. */
export const useDrawCopy = (
  nameOf: (code: string) => string,
  stageName: (stageId: string) => string,
): DrawCopyContext => {
  const t = useTranslations('setup.allocationDraw');
  const locale = useLocale();

  const listNames = useCallback(
    (names: string[]) => {
      // Intl.ListFormat is not in the TS lib target but is everywhere we run.
      const { ListFormat } = Intl as unknown as {
        ListFormat?: new (
          locales: string,
          options: { style: string; type: string },
        ) => { format: (items: string[]) => string };
      };

      try {
        if (ListFormat) {
          return new ListFormat(locale, {
            style: 'long',
            type: 'conjunction',
          }).format(names);
        }
      } catch {
        // fall through
      }

      return names.join(', ');
    },
    [locale],
  );

  const potName = useCallback(
    (potIndex: number, rules: DrawRules) =>
      rules.pots === 'none'
        ? t('semiFinalists')
        : t('pot', { number: potIndex + 1 }),
    [t],
  );

  return useMemo(
    () => ({ t, nameOf, stageName, listNames, potName }),
    [t, nameOf, stageName, listNames, potName],
  );
};

const fixedNotesText = (
  ctx: DrawCopyContext,
  notes: DrawGroupStep['fixedNotes'],
) =>
  notes
    .map((note) =>
      ctx.t('fixedNote', {
        names: ctx.listNames(note.codes.map(ctx.nameOf)),
        count: note.codes.length,
        stage: ctx.stageName(note.stageId),
      }),
    )
    .join(' ');

/** The one-line explanation shown when a group (pre-qualified / pot) starts. */
export const groupText = (
  ctx: DrawCopyContext,
  step: DrawGroupStep,
  input: DrawInput,
): string => {
  const k = input.semis.length;
  const { base, extra } = splitEvenly(step.size, k);
  const { t } = ctx;

  if (step.kind === 'preq') {
    if (extra === 0) return t('preqEach', { count: base });
    if (k === 2) return t('preqTwo', { more: base + 1, less: base });

    return t('preqMany', { less: base, more: base + 1 });
  }

  const notes = fixedNotesText(ctx, step.fixedNotes);
  const even = input.rules.split === 'even' && input.rules.pots !== 'none';
  let text: string;

  if (!even) text = t('potRandom');
  else if (extra === 0) text = t('potEvenEach', { count: base });
  else if (k === 2) text = t('potEvenTwo', { more: base + 1, less: base });
  else text = t('potEvenMany', { less: base, more: base + 1 });

  return notes ? `${text} ${notes}` : text;
};

export const groupLabel = (
  ctx: DrawCopyContext,
  step: DrawGroupStep,
  rules: DrawRules,
): string =>
  step.kind === 'preq'
    ? ctx.t('preQualified')
    : ctx.potName(step.potIndex ?? 0, rules);

/** Spotlight caption: [semi chip, half chip]. */
export const captionFor = (
  ctx: DrawCopyContext,
  step: DrawPreqStep | DrawEntrantStep,
): [string, string] => {
  const stage = ctx.stageName(step.stageId);

  if (step.t === 'preq') return [ctx.t('capVotesIn', { stage }), ''];

  const semi = step.fixed ? ctx.t('capFixed', { stage }) : stage;
  const half =
    step.half === 1
      ? ctx.t('firstHalf')
      : step.half === 2
      ? ctx.t('secondHalf')
      : step.pos > 0
      ? ctx.t('capPosition', { position: step.pos })
      : '';

  return [semi, half];
};

/** Live-region announcement for a step. */
export const liveText = (
  ctx: DrawCopyContext,
  step: DrawPreqStep | DrawEntrantStep,
): string => {
  const name = ctx.nameOf(step.code);
  const stage = ctx.stageName(step.stageId);

  if (step.t === 'preq') return ctx.t('livePreq', { name, stage });

  const [, half] = captionFor(ctx, step);

  return half
    ? ctx.t('liveEntrant', { name, stage, half: half.toLowerCase() })
    : ctx.t('liveEntrantNoHalf', { name, stage });
};

/** Plain-language lines for the Ready state. */
export const introLines = (
  ctx: DrawCopyContext,
  input: DrawInput,
): Array<{ icon: 'pots' | 'order' | 'vote' | 'pin'; text: string }> => {
  const { rules } = input;
  const { t } = ctx;
  const lines: Array<{
    icon: 'pots' | 'order' | 'vote' | 'pin';
    text: string;
  }> = [];

  lines.push({
    icon: 'pots',
    text:
      rules.pots === 'none'
        ? t('introNoPots')
        : rules.split === 'even'
        ? t('introEven')
        : t('introRandomPots'),
  });
  lines.push({
    icon: 'order',
    text:
      rules.order === 'halves'
        ? t('introHalves')
        : rules.order === 'positions'
        ? t('introPositions')
        : t('introNoOrder'),
  });

  const m = input.preq.length;

  if (m > 0) {
    lines.push({
      icon: 'vote',
      text:
        rules.preq === 'drawn'
          ? t('introPreqDrawn', { count: m })
          : rules.preq === 'all'
          ? t('introPreqAll', { count: m })
          : t('introPreqNone'),
    });
  }

  const fixed = input.entrants.filter((e) => e.fixed);

  if (fixed.length === 1) {
    lines.push({
      icon: 'pin',
      text: t(
        rules.order === 'none' ? 'introFixedOneNoOrder' : 'introFixedOne',
        {
          name: ctx.nameOf(fixed[0].code),
          stage: ctx.stageName(fixed[0].fixed!),
        },
      ),
    });
  } else if (fixed.length > 1) {
    lines.push({
      icon: 'pin',
      text: t(
        rules.order === 'none' ? 'introFixedManyNoOrder' : 'introFixedMany',
        { count: fixed.length },
      ),
    });
  }

  return lines;
};

export const errorCopy = (
  ctx: DrawCopyContext,
  error: DrawError,
  rules: DrawRules,
): DrawErrorCopy => {
  const { t } = ctx;

  switch (error.kind) {
    case 'fewSemis':
      return {
        title: t('errFewSemisTitle'),
        text: t('errFewSemisText'),
        fixes: [{ id: 'fix-semis', label: t('fixUseAllSemis'), primary: true }],
      };
    case 'empty':
      return {
        title: t('errEmptyTitle'),
        text: t('errEmptyText'),
        fixes: [
          { id: 'back-lineup', label: t('fixBackToLineup'), primary: true },
        ],
      };
    case 'sizesSum':
      return {
        title: t('errSizesSumTitle'),
        text: t('errSizesSumText', { sum: error.sum, total: error.total }),
        fixes: [
          { id: 'fix-sizes', label: t('fixUseBalanced'), primary: true },
          { id: 'open-customize', label: t('fixEditSizes') },
        ],
      };
    case 'semiFull':
      return {
        title: t('errSemiFullTitle', { stage: ctx.stageName(error.stageId) }),
        text: t('errSemiFullText', {
          count: error.fixedCount,
          stage: ctx.stageName(error.stageId),
          size: error.size,
          custom: rules.sizes === 'custom' ? 'true' : 'false',
          excess: error.fixedCount - error.size,
        }),
        fixes: [
          { id: 'show-lineup', label: t('fixShowInLineup'), primary: true },
          { id: 'open-customize', label: t('fixSetSizes') },
        ],
      };
    case 'potFixed': {
      const pot = ctx.potName(error.potIndex, rules);

      return {
        title: t('errPotFixedTitle', { pot }),
        text: t('errPotFixedText', {
          count: error.fixedCount,
          size: error.potSize,
          pot,
          stage: ctx.stageName(error.stageId),
          max: error.max,
        }),
        fixes: [
          { id: 'show-lineup', label: t('fixShowInLineup'), primary: true },
          { id: 'fix-split', label: t('fixSplitRandom') },
        ],
      };
    }
    case 'preqFixed':
      return {
        title: t('errPreqFixedTitle', { stage: ctx.stageName(error.stageId) }),
        text: t('errPreqFixedText', {
          count: error.count,
          total: error.total,
          stage: ctx.stageName(error.stageId),
          max: error.max,
        }),
        fixes: [
          { id: 'show-lineup', label: t('fixShowInLineup'), primary: true },
          { id: 'fix-preq', label: t('fixLetVoteAll') },
        ],
      };
    case 'noFit':
    default:
      return {
        title: t('errNoFitTitle'),
        text: t('errNoFitText'),
        fixes: [
          { id: 'fix-split', label: t('fixSplitRandom'), primary: true },
          { id: 'fix-sizes', label: t('fixUseBalanced') },
        ],
      };
  }
};

/** Grand Final card description while draw mode is on. */
export const grandFinalDrawDescription = (
  ctx: DrawCopyContext,
  input: DrawInput,
): string => {
  const { t } = ctx;
  const count = input.preq.length;

  if (count === 0) return '';
  if (input.rules.preq === 'all') return t('gfDescAll', { count });
  if (input.rules.preq === 'none') return t('gfDescNone', { count });

  const pinned = input.preq.filter((p) => p.votesIn !== 'drawn');

  if (pinned.length === 0) return t('gfDescDrawn', { count });

  const sentences = pinned.map((p) =>
    t('votesInSentence', {
      name: ctx.nameOf(p.code),
      stage: ctx.stageName(p.votesIn),
    }),
  );
  const others = count - pinned.length;

  if (others > 0) sentences.push(t('othersDrawn', { count: others }));

  return sentences.join(' ');
};

/** Grand Final card description after a draw: who votes where. */
export const grandFinalVotersDescription = (
  ctx: DrawCopyContext,
  votersByStage: Array<{ stageId: string; codes: string[] }>,
): string =>
  votersByStage
    .filter((entry) => entry.codes.length > 0)
    .map((entry) =>
      ctx.t('votersSentence', {
        names: ctx.listNames(
          [...entry.codes].map(ctx.nameOf).sort((a, b) => a.localeCompare(b)),
        ),
        count: entry.codes.length,
        stage: ctx.stageName(entry.stageId),
      }),
    )
    .join(' ');
