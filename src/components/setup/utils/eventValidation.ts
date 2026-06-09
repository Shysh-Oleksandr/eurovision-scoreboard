import { EventStage, PointsItem, StageVotingMode } from '../../../models';

import { getQualifiersBreakdown } from './getQualifiersBreakdown';

import { GeneralState } from '@/state/generalStore';
import { resolveStagePointsSystem } from '@/state/scoreboard/stageOverrides';

interface ValidationParams {
  stages: EventStage[];
}

type ValidationGeneralState = Pick<
  GeneralState,
  'settings' | 'settingsPointsSystem' | 'settingsTelevotePointsSystem'
>;

export type EventSetupValidationResult =
  | { kind: 'error'; message: string }
  | { kind: 'warning'; title: string; description: string }
  | null;

const getUniquePointsCount = (pointsSystem: PointsItem[]) =>
  new Set(pointsSystem.map((p) => p.value)).size;

export const validateEventSetup = (
  general: ValidationGeneralState,
  params: ValidationParams,
  t: any,
): EventSetupValidationResult => {
  const { stages } = params;

  const resolvedGeneral = {
    pointsSystem: general.settingsPointsSystem,
    televotePointsSystem: general.settingsTelevotePointsSystem,
    settings: general.settings,
  };

  // Sort stages by order
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  // Validate each stage
  for (const stage of sortedStages) {
    const qualifiersBreakdown = getQualifiersBreakdown(stage, sortedStages);
    const totalQualifiersFromOtherStages =
      qualifiersBreakdown?.reduce((sum, q) => sum + q.amount, 0) || 0;
    const totalParticipants =
      stage.countries.length + totalQualifiersFromOtherStages;

    if (totalParticipants === 0) {
      return {
        kind: 'error',
        message: t('setup.validation.noCountriesInStage', {
          stageName: stage.name,
        }),
      };
    }

    if (stage.votingMode !== StageVotingMode.TELEVOTE_ONLY) {
      const resolved = resolveStagePointsSystem(stage, resolvedGeneral);
      const { pointsSystem, allowMultiplePointsToSameEntry } = resolved;

      if (allowMultiplePointsToSameEntry) {
        if (totalParticipants < 2) {
          return {
            kind: 'error',
            message: t('setup.validation.participantsMustBeAtLeastTwo', {
              stageName: stage.name,
            }),
          };
        }
      } else {
        const minStageParticipants = pointsSystem.length + 1;

        if (totalParticipants < minStageParticipants) {
          return {
            kind: 'warning',
            title: t('setup.eventSetupModal.confirmLowParticipantsTitle'),
            description: t(
              'setup.eventSetupModal.confirmLowParticipantsDescription',
              {
                stageName: stage.name,
                count: minStageParticipants,
                uniqueCount: getUniquePointsCount(pointsSystem),
              },
            ),
          };
        }
      }
    }

    // Validate qualifier relationships
    if (stage.qualifiesTo && stage.qualifiesTo.length > 0) {
      const totalQualifiersFromThisStage = stage.qualifiesTo.reduce(
        (sum, target) => {
          // If using rank ranges, calculate based on ranges
          if (target.minRank && target.maxRank) {
            return sum + (target.maxRank - target.minRank + 1);
          }

          // Amount-based (backward compatibility)
          return sum + target.amount;
        },
        0,
      );

      if (totalQualifiersFromThisStage > totalParticipants) {
        return {
          kind: 'error',
          message: t('setup.validation.qualifiersExceedParticipants', {
            stageName: stage.name,
          }),
        };
      }
      // Validate that qualifiers don't move to precedent stages
      for (const target of stage.qualifiesTo) {
        const targetStage = sortedStages.find(
          (s) => s.id === target.targetStageId,
        );

        if (!targetStage) {
          return {
            kind: 'error',
            message: t('setup.validation.targetStageNotFound', {
              targetStageId: target.targetStageId,
            }),
          };
        }

        if (targetStage.order <= stage.order) {
          return {
            kind: 'error',
            message: t(
              'setup.validation.qualifiersCannotMoveToPrecedentStage',
              {
                stageName: stage.name,
                targetStageName: targetStage.name,
              },
            ),
          };
        }
      }
    }
  }

  // Validate stage order uniqueness
  const orders = sortedStages.map((s) => s.order);
  const uniqueOrders = new Set(orders);

  if (orders.length !== uniqueOrders.size) {
    return {
      kind: 'error',
      message: t('setup.validation.stageOrderMustBeUnique'),
    };
  }

  return null;
};
