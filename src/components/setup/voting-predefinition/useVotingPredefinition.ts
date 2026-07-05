import { useEffect, useMemo, useState } from 'react';

import {
  BaseCountry,
  EventStage,
  StageVotingMode,
  StageVotingType,
} from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { resolveDiaspora } from '@/state/scoreboard/diaspora';
import { StageVotes } from '@/state/scoreboard/types';
import { predefineStageVotes } from '@/state/scoreboard/votesPredefinition';
import { useScoreboardStore } from '@/state/scoreboardStore';

type UseVotingPredefinitionArgs = {
  stage: Pick<EventStage, 'id' | 'name' | 'votingMode' | 'overrides'> & {
    countries: (BaseCountry | any)[];
  };
};

export const useVotingPredefinition = ({
  stage,
}: UseVotingPredefinitionArgs) => {
  const globalPointsSystem = useGeneralStore((s) => s.pointsSystem);
  const globalTelevotePointsSystem = useGeneralStore(
    (s) => s.televotePointsSystem,
  );
  const globalSplitPointsSystem = useGeneralStore(
    (s) => s.settings.splitPointsSystem,
  );
  const globalAllowMultiple = useGeneralStore(
    (s) => s.settings.allowMultiplePointsToSameEntry,
  );

  // configuredEventStages is updated before onSave(), so it's always fresher
  // than the `stage` prop (which may be stale, e.g. initialSetupStage).
  const configuredStage = useCountriesStore((state) =>
    state.configuredEventStages.find((s) => s.id === stage.id),
  );
  const effectiveVotingMode = configuredStage?.votingMode ?? stage.votingMode;
  const stageOverride =
    configuredStage?.overrides?.pointsSystem ?? stage.overrides?.pointsSystem;

  const pointsSystem = stageOverride?.pointsSystem ?? globalPointsSystem;
  const televotePointsSystem =
    stageOverride?.televotePointsSystem ?? globalTelevotePointsSystem;
  const splitPointsSystem =
    stageOverride?.splitPointsSystem ?? globalSplitPointsSystem;
  const allowMultiplePointsToSameEntry =
    stageOverride?.allowMultiplePointsToSameEntry ?? globalAllowMultiple;
  const randomnessLevel = useGeneralStore((s) => s.settings.randomnessLevel);
  const pointsSpread = useGeneralStore((s) => s.settings.pointsSpread);
  const diasporaSettings = useGeneralStore((s) => s.settings.diaspora);
  const getStageVotingCountries = useCountriesStore(
    (s) => s.getStageVotingCountries,
  );
  const { countryOdds } = useCountriesStore();

  const isReplayingSavedVotes = useScoreboardStore(
    (s) => s.isReplayingSavedVotes,
  );

  // When replaying a saved contest (presentation mode), the authoritative votes
  // for this stage already live in the scoreboard store. If the user has the
  // per-stage predefinition modal enabled, seed it from those saved votes
  // instead of showing an empty grid. Returns a deep clone so edits in the
  // modal don't mutate the store before the user saves.
  const getSeedVotes = (): Partial<StageVotes> | null => {
    if (!isReplayingSavedVotes) return null;

    const saved = useScoreboardStore.getState().predefinedVotes?.[stage.id];

    if (!saved || Object.keys(saved).length === 0) return null;

    return JSON.parse(JSON.stringify(saved)) as Partial<StageVotes>;
  };

  const [selectedType, setSelectedType] = useState<'Total' | StageVotingType>(
    'Total',
  );
  const [votes, setVotes] = useState<Partial<StageVotes> | null>(() =>
    getSeedVotes(),
  );
  const [isSorting, setIsSorting] = useState(false);

  const [lastStageId, setLastStageId] = useState<string | null>(stage.id);
  const [lastStageVotingMode, setLastStageVotingMode] =
    useState<StageVotingMode | null>(effectiveVotingMode);

  const votingCountries = getStageVotingCountries(
    stage.id,
    false,
    selectedType !== StageVotingType.JURY,
  );

  const isCombinedVoting = effectiveVotingMode === StageVotingMode.COMBINED;

  const totalBadgeLabel = useMemo(() => {
    if (effectiveVotingMode === StageVotingMode.JURY_ONLY) return 'Jury';
    if (effectiveVotingMode === StageVotingMode.TELEVOTE_ONLY)
      return 'Televote';
    if (effectiveVotingMode === StageVotingMode.COMBINED) return 'Combined';

    return 'Total';
  }, [effectiveVotingMode]);

  const isTotalVoteType =
    selectedType === 'Total' && totalBadgeLabel === 'Total';
  const isTotalOrCombinedVoteType =
    selectedType === 'Total' &&
    (totalBadgeLabel === 'Combined' || totalBadgeLabel === 'Total');

  const voteTypeOptions = useMemo(() => {
    if (
      [StageVotingMode.JURY_AND_TELEVOTE, StageVotingMode.COMBINED].includes(
        effectiveVotingMode,
      )
    ) {
      return [StageVotingType.JURY, StageVotingType.TELEVOTE];
    }

    return [] as StageVotingType[];
  }, [effectiveVotingMode]);

  const getActiveSource = (): 'jury' | 'televote' | null => {
    if (
      selectedType === StageVotingType.JURY ||
      effectiveVotingMode === StageVotingMode.JURY_ONLY
    )
      return 'jury';
    if (
      selectedType === StageVotingType.TELEVOTE ||
      effectiveVotingMode === StageVotingMode.TELEVOTE_ONLY
    )
      return 'televote';

    return null;
  };

  const randomizeAll = () => {
    const effectiveTelevoteSystem = splitPointsSystem
      ? televotePointsSystem
      : pointsSystem;

    const isJuryOnly =
      selectedType === StageVotingType.JURY && totalBadgeLabel === 'Total';
    const isTelevoteOnly =
      selectedType === StageVotingType.TELEVOTE && totalBadgeLabel === 'Total';

    const modeToGenerate = isJuryOnly
      ? StageVotingMode.JURY_ONLY
      : isTelevoteOnly
      ? StageVotingMode.TELEVOTE_ONLY
      : effectiveVotingMode;

    const generated = predefineStageVotes(
      stage.countries,
      votingCountries,
      modeToGenerate,
      countryOdds,
      randomnessLevel,
      pointsSpread,
      pointsSystem,
      effectiveTelevoteSystem,
      allowMultiplePointsToSameEntry,
      resolveDiaspora(diasporaSettings),
    );

    if (isJuryOnly) {
      setVotes((prev) => ({
        ...prev,
        ...(generated.jury ? { jury: generated.jury } : {}),
      }));
    } else if (isTelevoteOnly) {
      setVotes((prev) => ({
        ...prev,
        ...(generated.televote ? { televote: generated.televote } : {}),
      }));
    } else {
      setVotes(generated);
    }

    setIsSorting(true);
  };

  const resetVotes = () => {
    setVotes(null);
    setSelectedType('Total');
    setIsSorting(false);
  };

  // Called when the modal's stage/voting-mode changes (e.g. advancing to the
  // next stage while the modal stays mounted). During a saved-contest replay we
  // reseed from the stored votes for the new stage rather than clearing.
  const reseedVotesForStage = () => {
    const seed = getSeedVotes();

    setVotes(seed);
    setSelectedType('Total');
    setIsSorting(!!seed);
  };

  const applyInputValue = (
    participantCode: string,
    voterCode: string,
    rawValue: string,
  ) => {
    const source = getActiveSource();

    if (!source) return; // Total tab is non-editable

    setVotes((prev) => {
      const nextVotes: Partial<StageVotes> = prev ? { ...prev } : {};
      const sourceMap: Record<string, any[]> = (nextVotes as any)[source] || {};
      const arr: any[] = [...(sourceMap[voterCode] || [])];

      const parsed = Number(rawValue);

      // When multiple tokens per entry is enabled (jury only), the cell represents
      // the total points to award to this participant. We clear all existing tokens
      // for them and use a greedy subset-sum on the remaining pool to reach the total.
      if (allowMultiplePointsToSameEntry && source === 'jury') {
        const retained = arr.filter((v) => v.countryCode !== participantCode);

        if (!rawValue || !Number.isFinite(parsed) || parsed <= 0) {
          (nextVotes as any)[source] = {
            ...sourceMap,
            [voterCode]: retained,
          };

          return nextVotes;
        }

        const usedIds = new Set(retained.map((v) => v.pointsId as number));
        const available = [...pointsSystem]
          .filter((p) => !usedIds.has(p.id))
          .sort((a, b) => b.value - a.value);

        const chosen: typeof pointsSystem = [];
        let remaining = parsed;

        for (const p of available) {
          if (p.value <= remaining) {
            chosen.push(p);
            remaining -= p.value;
          }
          if (remaining === 0) break;
        }

        if (remaining !== 0) {
          // Exact total not achievable from the available pool — reject
          return prev;
        }

        const newEntries = chosen.map((p) => ({
          countryCode: participantCode,
          points: p.value,
          pointsId: p.id,
          showDouzePointsAnimation: !!p.showDouzePoints,
        }));

        (nextVotes as any)[source] = {
          ...sourceMap,
          [voterCode]: [...retained, ...newEntries],
        };

        return nextVotes;
      }

      const idx = arr.findIndex((v) => v.countryCode === participantCode);

      if (!rawValue || !Number.isFinite(parsed)) {
        if (idx !== -1) {
          arr.splice(idx, 1);
        }
      } else {
        const matchingPoints = pointsSystem.filter((p) => p.value === parsed);

        if (matchingPoints.length === 0) {
          if (idx !== -1) {
            arr.splice(idx, 1);
          }
        } else {
          // Allowed ids for this points value (may contain duplicates like two 6's with distinct ids)
          const allowedIds = matchingPoints.map((p) => p.id);

          // Collect used ids by other assignments for this voter (exclude current participant if present)
          const usedIds: number[] = arr
            .filter((_, i) => i !== idx)
            .map((item) => item.pointsId as number);
          const usedSet = new Set(usedIds);

          // Prefer keeping current id if value unchanged AND it's not used by someone else
          const currentEntry = idx !== -1 ? (arr[idx] as any) : null;
          const currentIdIfSameValue =
            currentEntry &&
            currentEntry.points === parsed &&
            allowedIds.includes(currentEntry.pointsId)
              ? (currentEntry.pointsId as number)
              : undefined;

          let chosenId: number | undefined;

          if (
            currentIdIfSameValue !== undefined &&
            !usedSet.has(currentIdIfSameValue)
          ) {
            chosenId = currentIdIfSameValue;
          } else {
            chosenId = allowedIds.find((id) => !usedSet.has(id));
          }

          // If no available id for this value, transfer an existing id from another participant
          if (chosenId === undefined) {
            const donorIndex = arr.findIndex(
              (other, i) =>
                i !== idx && allowedIds.includes(other.pointsId as number),
            );

            if (donorIndex !== -1) {
              chosenId = arr[donorIndex].pointsId as number;
              // Remove donor assignment to free the id
              arr.splice(donorIndex, 1);
            }
          }

          if (chosenId !== undefined) {
            const chosenPoint = pointsSystem.find((p) => p.id === chosenId);
            const entry = {
              countryCode: participantCode,
              points: parsed,
              pointsId: chosenId,
              showDouzePointsAnimation: !!chosenPoint?.showDouzePoints,
            };

            if (idx !== -1) {
              arr[idx] = entry;
            } else {
              arr.push(entry);
            }
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
    const total = arr
      .filter((v: any) => v.countryCode === participantCode)
      .reduce((acc: number, v: any) => acc + v.points, 0);

    return total || 0;
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
          Object.values(votes.combined || {}).forEach((arr: any) =>
            add(arr as any[]),
          );
        } else {
          Object.values(votes.jury || {}).forEach((arr: any) =>
            add(arr as any[]),
          );
          Object.values(votes.televote || {}).forEach((arr: any) =>
            add(arr as any[]),
          );
        }
      } else if (selectedType === StageVotingType.JURY) {
        Object.values(votes.jury || {}).forEach((arr: any) =>
          add(arr as any[]),
        );
      } else {
        Object.values(votes.televote || {}).forEach((arr: any) =>
          add(arr as any[]),
        );
      }
    }
    const withRank = [...stage.countries]
      .sort((a, b) => (totals[b.code] || 0) - (totals[a.code] || 0))
      .map((c, i) => ({ ...c, rank: i + 1 }));
    const finalCountries = isSorting
      ? withRank
      : withRank.sort((a, b) => a.name.localeCompare(b.name));

    return finalCountries as Array<BaseCountry & { rank: number }>;
  })();

  const validateAllBeforeSave = () => {
    const modesToValidate: Array<'jury' | 'televote'> = [];

    if (
      effectiveVotingMode === StageVotingMode.JURY_AND_TELEVOTE ||
      effectiveVotingMode === StageVotingMode.COMBINED
    ) {
      modesToValidate.push('jury', 'televote');
    } else if (effectiveVotingMode === StageVotingMode.JURY_ONLY) {
      modesToValidate.push('jury');
    } else if (effectiveVotingMode === StageVotingMode.TELEVOTE_ONLY) {
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

        const missingValues = expected
          .filter((p) => !usedIds.includes(p.id))
          .map((p) => p.value);

        if (missingValues.length > 0) {
          reasons.push(
            `not all points are used (missing: ${missingValues.join(', ')})`,
          );
        }

        const countsById = new Map<number, number>();

        for (const id of usedIds)
          countsById.set(id, (countsById.get(id) || 0) + 1);

        const duplicateIds: number[] = Array.from(countsById.entries())
          .filter(([, count]) => count > 1)
          .map(([id]) => id);

        if (duplicateIds.length > 0) {
          const duplicateValues = expected
            .filter((p) => duplicateIds.includes(p.id))
            .map((p) => p.value);

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
      reseedVotesForStage();
    }
    setLastStageId(stage.id);
  }, [stage.id, lastStageId]);

  useEffect(() => {
    if (effectiveVotingMode !== lastStageVotingMode) {
      reseedVotesForStage();
    }
    setLastStageVotingMode(effectiveVotingMode);
  }, [effectiveVotingMode, lastStageVotingMode]);

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

export type UseVotingPredefinitionReturn = ReturnType<
  typeof useVotingPredefinition
>;
