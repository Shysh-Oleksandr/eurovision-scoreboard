import { useEffect, useMemo, useState } from 'react';

import { BaseCountry, EventStage, StageVotingMode, StageVotingType } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { StageVotes } from '@/state/scoreboard/types';
import { predefineStageVotes } from '@/state/scoreboard/votesPredefinition';

type UseVotingPredefinitionArgs = {
  stage: Pick<EventStage, 'id' | 'name' | 'votingMode'> & { countries: (BaseCountry | any)[] };
};

export const useVotingPredefinition = ({ stage }: UseVotingPredefinitionArgs) => {
  const pointsSystem = useGeneralStore((s) => s.pointsSystem);
  const randomnessLevel = useGeneralStore((s) => s.settings.randomnessLevel);
  const getStageVotingCountries = useCountriesStore((s) => s.getStageVotingCountries);
  const { countryOdds } = useCountriesStore();

  const [selectedType, setSelectedType] = useState<'Total' | StageVotingType>('Total');
  const [votes, setVotes] = useState<Partial<StageVotes> | null>(null);
  const [isSorting, setIsSorting] = useState(false);

  const [lastStageId, setLastStageId] = useState<string | null>(stage.id);
  const [lastStageVotingMode, setLastStageVotingMode] = useState<StageVotingMode | null>(stage.votingMode);

  const votingCountries = getStageVotingCountries(stage.id, selectedType !== StageVotingType.JURY);

  const isCombinedVoting = stage.votingMode === StageVotingMode.COMBINED;

  const totalBadgeLabel = useMemo(() => {
    const { votingMode } = stage;

    if (votingMode === StageVotingMode.JURY_ONLY) return 'Jury';
    if (votingMode === StageVotingMode.TELEVOTE_ONLY) return 'Televote';
    if (votingMode === StageVotingMode.COMBINED) return 'Combined';
    return 'Total';
  }, [stage]);

  const isTotalVoteType = selectedType === 'Total' && totalBadgeLabel === 'Total';
  const isTotalOrCombinedVoteType = selectedType === 'Total' && (totalBadgeLabel === 'Combined' || totalBadgeLabel === 'Total');

  const voteTypeOptions = useMemo(() => {
    if (!stage) return [] as StageVotingType[];
    const { votingMode } = stage;
    if ([StageVotingMode.JURY_AND_TELEVOTE, StageVotingMode.COMBINED].includes(votingMode)) {
      return [StageVotingType.JURY, StageVotingType.TELEVOTE];
    }
    return [] as StageVotingType[];
  }, [stage]);

  const getActiveSource = (): 'jury' | 'televote' | null => {
    if (selectedType === StageVotingType.JURY || stage.votingMode === StageVotingMode.JURY_ONLY) return 'jury';
    if (selectedType === StageVotingType.TELEVOTE || stage.votingMode === StageVotingMode.TELEVOTE_ONLY) return 'televote';
    return null;
  };

  const randomizeAll = () => {
    const generated = predefineStageVotes(
      stage.countries,
      votingCountries,
      stage.votingMode,
      countryOdds,
      randomnessLevel,
      pointsSystem,
    );

    setVotes(generated);
    setIsSorting(true);
  };

  const resetVotes = () => {
    setVotes(null);
    setSelectedType('Total');
    setIsSorting(false);
  };

  const applyInputValue = (participantCode: string, voterCode: string, rawValue: string) => {
    const source = getActiveSource();
    if (!source) return; // Total tab is non-editable

    setVotes((prev) => {
      const nextVotes: Partial<StageVotes> = prev ? { ...prev } : {};
      const sourceMap: Record<string, any[]> = (nextVotes as any)[source] || {};
      const arr: any[] = [...(sourceMap[voterCode] || [])];
      const idx = arr.findIndex((v) => v.countryCode === participantCode);

      const parsed = Number(rawValue);

      if (!rawValue || !Number.isFinite(parsed)) {
        if (idx !== -1) {
          arr.splice(idx, 1);
        }
      } else {
        const match = pointsSystem.find((p) => p.value === parsed);
        if (!match) {
          if (idx !== -1) {
            arr.splice(idx, 1);
          }
        } else {
          const entry = {
            countryCode: participantCode,
            points: match.value,
            pointsId: match.id,
            showDouzePointsAnimation: match.value === 12,
          };

          if (idx !== -1) {
            arr[idx] = entry;
          } else {
            arr.push(entry);
          }
        }
      }

      (nextVotes as any)[source] = { ...sourceMap, [voterCode]: arr };
      return nextVotes;
    });
  };

  const getVoterValidity = (voterCode: string) => {
    const source = getActiveSource();
    if (!source || !votes) return null;
    const used = (votes as any)[source]?.[voterCode] || [];
    if (!used || used.length === 0) return 'incomplete';
    const expectedIds = pointsSystem.map((p) => p.id);
    const usedIds = used.map((v: any) => v.pointsId);
    const hasAll = expectedIds.every((id) => usedIds.includes(id));
    const noDuplicates = new Set(usedIds).size === usedIds.length;
    if (!noDuplicates) return 'invalid';
    if (hasAll && usedIds.length === expectedIds.length) return 'valid';
    return hasAll ? 'invalid' : 'incomplete';
  };

  const getTotalPointsForCountry = (countryCode: string): number => {
    if (!votes) return 0;

    const addFrom = (arr: any[] | undefined, acc: number) => {
      if (!arr) return acc;
      for (const v of arr) {
        if (v.countryCode === countryCode) acc += v.points || 0;
      }
      return acc;
    };

    if (isTotalOrCombinedVoteType) {
      if (isCombinedVoting) {
        let sum = 0;
        Object.values(votes.combined || {}).forEach((a: any) => {
          sum = addFrom(a as any[], sum);
        });
        return sum;
      }

      let sum = 0;
      Object.values(votes.jury || {}).forEach((a: any) => {
        sum = addFrom(a as any[], sum);
      });
      Object.values(votes.televote || {}).forEach((a: any) => {
        sum = addFrom(a as any[], sum);
      });
      return sum;
    }

    const source = getActiveSource() || 'televote';
    let sum = 0;
    Object.values(votes[source] || {}).forEach((a: any) => {
      sum = addFrom(a as any[], sum);
    });
    return sum;
  };

  const getCellValue = (participantCode: string, voterCode: string): number => {
    if (!votes) return 0;
    if (isTotalOrCombinedVoteType) {
      const juryArr = votes.jury?.[voterCode] || [];
      const televoteArr = votes.televote?.[voterCode] || [];
      const combinedArr = votes.combined?.[voterCode] || [];
      const arr = isCombinedVoting ? combinedArr : [...juryArr, ...televoteArr];
      const found = arr
        .filter((v: any) => v.countryCode === participantCode)
        .reduce((acc, v) => acc + v.points, 0);
      return found || 0;
    }
    const source = getActiveSource() || 'televote';
    const arr = votes?.[source]?.[voterCode] || [];
    const found = arr.find((v: any) => v.countryCode === participantCode);
    return found?.points || 0;
  };

  const rankedCountries = (() => {
    const totals: Record<string, number> = {};
    stage.countries.forEach((c) => {
      totals[c.code] = 0;
    });
    if (votes) {
      const add = (arr: any[]) => {
        arr.forEach((v) => {
          totals[v.countryCode] = (totals[v.countryCode] || 0) + v.points;
        });
      };

      if (selectedType === 'Total') {
        if (isCombinedVoting) {
          Object.values(votes.combined || {}).forEach((arr: any) => add(arr as any[]));
        } else {
          Object.values(votes.jury || {}).forEach((arr: any) => add(arr as any[]));
          Object.values(votes.televote || {}).forEach((arr: any) => add(arr as any[]));
        }
      } else if (selectedType === StageVotingType.JURY) {
        Object.values(votes.jury || {}).forEach((arr: any) => add(arr as any[]));
      } else {
        Object.values(votes.televote || {}).forEach((arr: any) => add(arr as any[]));
      }
    }
    const withRank = [...stage.countries]
      .sort((a, b) => (totals[b.code] || 0) - (totals[a.code] || 0))
      .map((c, i) => ({ ...c, rank: i + 1 }));
    const finalCountries = isSorting ? withRank : withRank.sort((a, b) => a.name.localeCompare(b.name));
    return finalCountries as Array<(BaseCountry & { rank: number })>;
  })();

  const validateAllBeforeSave = () => {
    const modesToValidate: Array<'jury' | 'televote'> = [];
    if (stage.votingMode === StageVotingMode.JURY_AND_TELEVOTE || stage.votingMode === StageVotingMode.COMBINED) {
      modesToValidate.push('jury', 'televote');
    } else if (stage.votingMode === StageVotingMode.JURY_ONLY) {
      modesToValidate.push('jury');
    } else if (stage.votingMode === StageVotingMode.TELEVOTE_ONLY) {
      modesToValidate.push('televote');
    }

    const errors: Array<{ label: string; reasons: string[] }> = [];
    const expected = pointsSystem.map((p) => ({ id: p.id, value: p.value }));

    for (const mode of modesToValidate) {
      for (const voter of votingCountries) {
        if (mode === 'jury' && voter.code === 'WW') continue;
        const arr: any[] = (votes as any)?.[mode]?.[voter.code] || [];
        const usedIds: number[] = arr.map((v) => v.pointsId as number);
        const reasons: string[] = [];

        const missingValues = expected.filter((p) => !usedIds.includes(p.id)).map((p) => p.value);
        if (missingValues.length > 0) {
          reasons.push(`not all points are used (missing: ${missingValues.join(', ')})`);
        }

        const countsById = new Map<number, number>();
        for (const id of usedIds) countsById.set(id, (countsById.get(id) || 0) + 1);
        const duplicateIds: number[] = Array.from(countsById.entries())
          .filter(([, count]) => count > 1)
          .map(([id]) => id);
        if (duplicateIds.length > 0) {
          const duplicateValues = expected.filter((p) => duplicateIds.includes(p.id)).map((p) => p.value);
          reasons.push(`duplicate points (${duplicateValues.join(', ')})`);
        }

        if (usedIds.length > expected.length) {
          reasons.push('too many assignments');
        }
        if (usedIds.length === 0) {
          reasons.push('no points assigned');
        }
        if (reasons.length > 0) {
          const label = `${voter.name} (${mode})`;
          errors.push({ label, reasons });
        }
      }
    }
    return { ok: errors.length === 0, errors } as const;
  };

  useEffect(() => {
    if (stage.id !== lastStageId) {
      resetVotes();
    }
    setLastStageId(stage.id);
  }, [stage.id, lastStageId]);

  useEffect(() => {
    if (stage.votingMode !== lastStageVotingMode) {
      resetVotes();
    }
    setLastStageVotingMode(stage.votingMode);
  }, [stage.votingMode, lastStageVotingMode]);

  return {
    // stores & config
    pointsSystem,
    // state
    selectedType,
    setSelectedType,
    votes,
    setVotes,
    isSorting,
    setIsSorting,
    // derived
    isCombinedVoting,
    totalBadgeLabel,
    isTotalVoteType,
    isTotalOrCombinedVoteType,
    votingCountries,
    voteTypeOptions,
    rankedCountries,
    // actions
    randomizeAll,
    resetVotes,
    applyInputValue,
    // getters
    getVoterValidity,
    getTotalPointsForCountry,
    getCellValue,
    // validation
    validateAllBeforeSave,
  };
};

export type UseVotingPredefinitionReturn = ReturnType<typeof useVotingPredefinition>;
