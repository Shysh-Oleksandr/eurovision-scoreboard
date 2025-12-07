import { EventStage } from '@/models';

// Calculate qualifiers breakdown for each stage
// Shows which stages qualify TO this stage
export const getQualifiersBreakdown = (
  stage: EventStage,
  eventStages: EventStage[],
) => {
  const qualifiersFromOtherStages: Array<{
    sourceStageName: string;
    amount: number;
  }> = [];

  // Find all stages that qualify to this stage
  eventStages.forEach((otherStage) => {
    if (otherStage.id === stage.id) return; // Skip self

    const qualifiesTo = otherStage.qualifiesTo || [];
    const qualifierTarget = qualifiesTo.find(
      (target) => target.targetStageId === stage.id,
    );

    if (qualifierTarget) {
      qualifiersFromOtherStages.push({
        sourceStageName: otherStage.name,
        amount: qualifierTarget.amount,
      });
    }
  });

  return qualifiersFromOtherStages.length > 0
    ? qualifiersFromOtherStages
    : null;
};
