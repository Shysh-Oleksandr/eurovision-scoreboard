import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { VotesStatus } from './votesData';

/** A country's standing in plain words: "Winner", "7th place, qualified". */
export const useStatusText = () => {
  const t = useTranslations('simulation.finalStats.votes');

  return useCallback(
    (status: VotesStatus): string => {
      switch (status.kind) {
        case 'winner':
          return t('statusWinner');
        case 'place':
          if (status.qualified === true) {
            return t('statusQualified', { place: status.place });
          }
          if (status.qualified === false) {
            return t('statusNotQualified', { place: status.place });
          }

          return t('statusPlace', { place: status.place });
        case 'out':
          return t('statusOut', { stage: status.stageName });
        case 'competes':
          return t('statusCompetes', { stage: status.stageName });
        default:
          return t('statusVotesOnly');
      }
    },
    [t],
  );
};
