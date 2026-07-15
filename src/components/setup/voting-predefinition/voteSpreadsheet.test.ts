import { describe, expect, it } from 'vitest';

import { buildExportSectionsForStageVotes } from './voteSpreadsheet';

import { StageVotingMode } from '@/models';
import type { StageVotes } from '@/state/scoreboard/types';

describe('buildExportSectionsForStageVotes', () => {
  it('uses jury + televote totals for the combined section in split voting', () => {
    const votes: Partial<StageVotes> = {
      jury: {
        V1: [
          {
            countryCode: 'P1',
            points: 12,
            pointsId: 0,
            showDouzePointsAnimation: true,
          },
        ],
      },
      televote: {
        V1: [
          {
            countryCode: 'P1',
            points: 10,
            pointsId: 1,
            showDouzePointsAnimation: false,
          },
        ],
      },
    };

    const sections = buildExportSectionsForStageVotes({
      stageName: 'Final',
      votingMode: StageVotingMode.JURY_AND_TELEVOTE,
      participants: [{ code: 'P1', name: 'One', rank: 1 }],
      voters: [{ code: 'V1', name: 'Voter' }],
      votes,
      getParticipantTotal: (_code, source) => {
        if (source === 'combined') return 0;
        if (source === 'jury') return 12;
        return 10;
      },
    });

    const combined = sections.find((section) => section.source === 'combined');
    expect(combined?.participants[0]?.total).toBe(22);
    expect(combined?.getCellPoints('P1', 'V1')).toBe(22);
  });
});
