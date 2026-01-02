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
      let amount = qualifierTarget.amount;

      // If using rank ranges, calculate the amount from the range
      if (qualifierTarget.minRank && qualifierTarget.maxRank) {
        amount = qualifierTarget.maxRank - qualifierTarget.minRank + 1;
      } else if (qualifierTarget.minRank && !qualifierTarget.maxRank) {
        // This is tricky without knowing total participants, so keep the original amount
        amount = qualifierTarget.amount;
      }

      qualifiersFromOtherStages.push({
        sourceStageName: otherStage.name,
        amount,
      });
    }
  });

  return qualifiersFromOtherStages.length > 0
    ? qualifiersFromOtherStages
    : null;
};
