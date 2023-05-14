export function getNextVotingPoints(currentVotingPoints: number): number {
  if (currentVotingPoints === 8) return 10;

  if (currentVotingPoints === 10) return 12;

  if (currentVotingPoints === 12) return 1;

  return currentVotingPoints + 1;
}
