import { EventStage, StageVotingMode } from '../../../models';
import { getQualifiersBreakdown } from './getQualifiersBreakdown';

interface ValidationParams {
  stages: EventStage[];
}

export const validateEventSetup = (
  pointsSystemLength: number,
  params: ValidationParams,
  t: any,
) => {
  const { stages } = params;

  const minStageParticipants = pointsSystemLength + 1;

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
      return t('setup.validation.noCountriesInStage', {
        stageName: stage.name,
      });
    }

    if (
      totalParticipants < minStageParticipants &&
      stage.votingMode !== StageVotingMode.TELEVOTE_ONLY
    ) {
      return t('setup.validation.participantsMustBeAtLeast', {
        stageName: stage.name,
        count: minStageParticipants,
      });
    }

    // Validate qualifier relationships
    if (stage.qualifiesTo && stage.qualifiesTo.length > 0) {
      const totalQualifiersFromThisStage =
        stage.qualifiesTo.reduce((sum, target) => sum + target.amount, 0);

   
      if (totalQualifiersFromThisStage > totalParticipants) {
        return t('setup.validation.qualifiersExceedParticipants', {
          stageName: stage.name,
        });
      }
      // Validate that qualifiers don't move to precedent stages
      for (const target of stage.qualifiesTo) {
        const targetStage = sortedStages.find(
          (s) => s.id === target.targetStageId,
        );
        if (!targetStage) {
          return t('setup.validation.targetStageNotFound', {
            targetStageId: target.targetStageId,
          });
        }

        if (targetStage.order <= stage.order) {
          return t('setup.validation.qualifiersCannotMoveToPrecedentStage', {
            stageName: stage.name,
            targetStageName: targetStage.name,
          });
        }
      }
    }
  }

  // Validate stage order uniqueness
  const orders = sortedStages.map((s) => s.order);
  const uniqueOrders = new Set(orders);
  if (orders.length !== uniqueOrders.size) {
    return t('setup.validation.stageOrderMustBeUnique');
  }

  return null;
};
