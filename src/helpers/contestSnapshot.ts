import { POINTS_ARRAY } from '@/data/data';
import isDeepEqual from 'fast-deep-equal';

import {
  BaseCountry,
  Country,
  CountryAssignmentGroup,
  EventStage,
  StageVotingMode,
  VotingCountry,
} from '@/models';
import { buildEventStagesFromAssignments } from '@/components/setup/utils/buildEventStagesFromAssignments';
import { Year } from '@/config';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';
import type {
  ContestSnapshot,
  CompactVote,
  CountriesStateItem,
} from '@/types/contestSnapshot';
import { Contest } from '@/types/contest';

const DEFAULT_VOTING_MODE = 'JURY_AND_TELEVOTE';
const DEFAULT_ODDS = { juryOdds: 50, televoteOdds: 50 };
const DEFAULT_RANDOMNESS_LEVEL = 50;

type PointsItem = { id: number; value: number; showDouzePoints: boolean };

const isDefaultPointsSystem = (pointsSystem: PointsItem[]) => {
  if (pointsSystem.length !== POINTS_ARRAY.length) return false;
  for (let i = 0; i < pointsSystem.length; i++) {
    const item = pointsSystem[i];
    if (item.id !== i) return false;
    if (item.value !== POINTS_ARRAY[i]) return false;
    if (item.showDouzePoints !== (item.value === 12)) return false;
  }
  return true;
};

const encodePredefinedVotes = (
  predefinedVotes: Record<string, any>,
): Record<string, any> => {
  const out: Record<string, any> = {};
  for (const [stageId, stageVotes] of Object.entries(predefinedVotes || {})) {
    const encodedStage: any = {};
    for (const source of ['jury', 'televote', 'combined'] as const) {
      const byVoter = (stageVotes as any)?.[source];
      if (!byVoter) continue;
      const encodedByVoter: Record<string, CompactVote[]> = {};
      for (const [voterCode, votes] of Object.entries(byVoter)) {
        encodedByVoter[voterCode] = (votes as any[]).map((v) => [
          (v as any).countryCode,
          (v as any).pointsId,
        ]);
      }
      encodedStage[source] = encodedByVoter;
    }
    out[stageId] = encodedStage;
  }
  return out;
};

const decodePredefinedVotes = (
  encoded: Record<string, any>,
  pointsSystem: PointsItem[],
) => {
  const byId = new Map(pointsSystem.map((p) => [p.id, p]));
  const out: Record<string, any> = {};
  for (const [stageId, stageVotes] of Object.entries(encoded || {})) {
    const decodedStage: any = {};
    for (const source of ['jury', 'televote', 'combined'] as const) {
      const byVoter = (stageVotes as any)?.[source];
      if (!byVoter) continue;
      const decodedByVoter: Record<string, any[]> = {};
      for (const [voterCode, votes] of Object.entries(byVoter)) {
        decodedByVoter[voterCode] = (votes as any[]).map((tuple) => {
          const [countryCode, pointsId] = tuple as [string, number];
          const p = byId.get(pointsId);
          return {
            countryCode,
            pointsId,
            points: p?.value ?? 0,
            showDouzePointsAnimation: !!p?.showDouzePoints,
          };
        });
      }
      decodedStage[source] = decodedByVoter;
    }
    out[stageId] = decodedStage;
  }
  return out;
};

const calculateCountryPointsByStage = (
  stages: EventStage[],
  predefinedVotes: any,
) => {
  const byStage: Record<
    string,
    Record<
      string,
      { juryPoints: number; televotePoints: number; combinedPoints: number }
    >
  > = {};
  for (const stage of stages) {
    const stageVotes = predefinedVotes?.[stage.id];
    const pointsByCountry: Record<
      string,
      { juryPoints: number; televotePoints: number; combinedPoints: number }
    > = {};
    stage.countries.forEach((c) => {
      pointsByCountry[c.code] = {
        juryPoints: 0,
        televotePoints: 0,
        combinedPoints: 0,
      };
    });
    if (stageVotes?.jury) {
      Object.values(stageVotes.jury).forEach((votes: any) => {
        votes?.forEach((v: any) => {
          if (pointsByCountry[v.countryCode])
            pointsByCountry[v.countryCode].juryPoints += v.points;
        });
      });
    }
    if (stageVotes?.televote) {
      Object.values(stageVotes.televote).forEach((votes: any) => {
        votes?.forEach((v: any) => {
          if (pointsByCountry[v.countryCode])
            pointsByCountry[v.countryCode].televotePoints += v.points;
        });
      });
    }
    if (stageVotes?.combined) {
      Object.values(stageVotes.combined).forEach((votes: any) => {
        votes?.forEach((v: any) => {
          if (pointsByCountry[v.countryCode])
            pointsByCountry[v.countryCode].combinedPoints += v.points;
        });
      });
    }
    byStage[stage.id] = pointsByCountry;
  }
  return byStage;
};

const defaultPointsSystem: PointsItem[] = POINTS_ARRAY.map((value, id) => ({
  id,
  value,
  showDouzePoints: value === 12,
}));

const getPointsSystem = (
  pointsSystem: Array<{ id: number; value: number }> | undefined,
) => {
  return pointsSystem
    ? pointsSystem.map((p) => ({
        id: p.id,
        value: p.value,
        showDouzePoints: p.value === 12,
      }))
    : defaultPointsSystem;
};

export function buildContestSnapshotFromStores() {
  const countriesStore = useCountriesStore.getState();
  const scoreboard = useScoreboardStore.getState();
  const general = useGeneralStore.getState();

  const allCountries = countriesStore.getAllCountries(true);
  const { configuredEventStages, eventAssignments, countryOdds } =
    countriesStore;

  const built = buildEventStagesFromAssignments(
    allCountries,
    configuredEventStages,
    eventAssignments,
  );

  // Always use the current setup configuration
  const setupStages: EventStage[] = built.eventStagesWithCountries.map(
    (stage) => ({
      ...stage,
      isOver: false,
      isJuryVoting: stage.votingMode !== StageVotingMode.TELEVOTE_ONLY,
    }),
  );

  // Custom entries referenced by setup participants or voters
  const customCodes = new Set<string>();
  for (const stage of setupStages) {
    stage.countries.forEach((c) => {
      if (c.code.startsWith('custom-')) customCodes.add(c.code);
    });
    stage.votingCountries?.forEach((v) => {
      if (v.code.startsWith('custom-')) customCodes.add(v.code);
    });
  }

  const customEntriesUsed = countriesStore.customCountries
    .filter((c) => customCodes.has(c.code))
    .map((c) => ({ code: c.code, name: c.name, flag: c.flag || '' }));

  // Compact odds for setup participants (includes custom entries)
  const participantCodes = Array.from(
    new Set(setupStages.flatMap((s) => s.countries.map((c) => c.code))),
  );

  // Get default odds for the current year to optimize storage
  const allCountriesForYear = countriesStore.allCountriesForYear;
  const yearOddsMap = new Map(
    allCountriesForYear.map((c) => [
      c.code,
      {
        juryOdds: c.juryOdds ?? DEFAULT_ODDS.juryOdds,
        televoteOdds: c.televoteOdds ?? DEFAULT_ODDS.televoteOdds,
      },
    ]),
  );

  // Only save odds that differ from year defaults and aren't the fallback 50/50
  const countryOddsTuples: Array<[string, number, number]> = participantCodes
    .map((code) => {
      const currentOdds = {
        juryOdds: countryOdds[code]?.juryOdds ?? DEFAULT_ODDS.juryOdds,
        televoteOdds:
          countryOdds[code]?.televoteOdds ?? DEFAULT_ODDS.televoteOdds,
      };
      const defaultOdds = yearOddsMap.get(code) || {
        juryOdds: DEFAULT_ODDS.juryOdds,
        televoteOdds: DEFAULT_ODDS.televoteOdds,
      };

      // Only save if odds differ from defaults
      if (
        currentOdds.juryOdds !== defaultOdds.juryOdds ||
        currentOdds.televoteOdds !== defaultOdds.televoteOdds
      ) {
        return [code, currentOdds.juryOdds, currentOdds.televoteOdds] as [
          string,
          number,
          number,
        ];
      }
      return null;
    })
    .filter((tuple): tuple is [string, number, number] => tuple !== null);

  const pointsSystem = general.pointsSystem as unknown as PointsItem[];
  const settingsPointsSystem =
    general.settingsPointsSystem as unknown as PointsItem[];

  // Determine what to save based on setup vs simulation points systems
  const isSetupDefault = isDefaultPointsSystem(settingsPointsSystem);
  const isSimulationDefault = isDefaultPointsSystem(pointsSystem);
  const isSamePointsSystems = isDeepEqual(pointsSystem, settingsPointsSystem);

  let setupPointsPayload: any = undefined;
  let simulationPointsPayload: any = undefined;

  // If both are default, save nothing
  if (isSetupDefault && isSimulationDefault) {
    // No points systems to save
  }
  // If they're the same (but not default), save only in setup
  else if (isSamePointsSystems) {
    setupPointsPayload = settingsPointsSystem.map((p) => ({
      id: p.id,
      value: p.value,
    }));
    // simulationPointsPayload remains undefined - will use setup when loading
  }
  // If they're different, save both
  else {
    setupPointsPayload = settingsPointsSystem.map((p) => ({
      id: p.id,
      value: p.value,
    }));
    simulationPointsPayload = pointsSystem.map((p) => ({
      id: p.id,
      value: p.value,
    }));
  }

  // setup.stages: stable config with participants/voters by code
  const setupStagesPayload = setupStages.map((stage) => {
    const stageData: any = {
      id: stage.id,
      name: stage.name,
      order: stage.order ?? 0,
      ...(stage.votingMode !== DEFAULT_VOTING_MODE
        ? { votingMode: stage.votingMode }
        : {}),
      ...(stage.qualifiesTo ? { qualifiesTo: stage.qualifiesTo } : {}),
      participants: stage.countries.map((c) => c.code),
      ...(stage.votingCountries && stage.votingCountries.length > 0
        ? { voters: stage.votingCountries.map((v) => v.code) }
        : {}),
    };
    return stageData;
  });

  const snapshot: any = {
    schemaVersion: 1,
    setup: {
      baseYear: general.year,
      ...(general.settings.isJuniorContest
        ? { isJuniorContest: general.settings.isJuniorContest }
        : {}),
      ...(general.settings.randomnessLevel !== DEFAULT_RANDOMNESS_LEVEL
        ? { randomnessLevel: general.settings.randomnessLevel }
        : {}),
      ...(setupPointsPayload ? { pointsSystem: setupPointsPayload } : {}),
      ...(countryOddsTuples.length > 0
        ? { countryOdds: countryOddsTuples }
        : {}),
      stages: setupStagesPayload,
    },
    ...(customEntriesUsed.length > 0 ? { customEntriesUsed } : {}),
  };

  // Include simulation state if simulation is active
  const hasActiveStages = (scoreboard.eventStages || []).length > 0;
  if (hasActiveStages) {
    const countriesStateByStage: Record<string, CountriesStateItem[]> = {};
    for (const stage of scoreboard.eventStages) {
      countriesStateByStage[stage.id] = stage.countries.map((c) => {
        const countryState: CountriesStateItem = {
          code: c.code,
          qualifiedFromStageIds: c.qualifiedFromStageIds,
        };
        // Only save points if they are non-zero (0 is default)
        const juryPoints = c.juryPoints ?? 0;
        const televotePoints = c.televotePoints ?? 0;
        if (juryPoints !== 0) {
          countryState.juryPoints = juryPoints;
        }
        if (televotePoints !== 0) {
          countryState.televotePoints = televotePoints;
        }
        // Only save isVotingFinished if it's true (false is default)
        if (c.isVotingFinished) {
          countryState.isVotingFinished = true;
        }
        return countryState;
      });
    }

    // Create lookup map for setup stages
    const setupStagesMap = new Map(setupStagesPayload.map((s) => [s.id, s]));

    // Save simulation stages with optimization for identical stages
    const simulationStages = scoreboard.eventStages.map((stage) => {
      const setupStage = setupStagesMap.get(stage.id);

      // Compare all fields except runtime state (isOver, isJuryVoting)
      const isSameAsSetupWithoutParticipants =
        setupStage &&
        setupStage.name === stage.name &&
        (setupStage.order ?? 0) === (stage.order ?? 0) &&
        (setupStage.votingMode || DEFAULT_VOTING_MODE) ===
          (stage.votingMode || DEFAULT_VOTING_MODE) &&
        isDeepEqual(setupStage.qualifiesTo, stage.qualifiesTo) &&
        isDeepEqual(
          setupStage.voters || [],
          (stage.votingCountries || []).map((v) => v.code),
        );

      if (isSameAsSetupWithoutParticipants) {
        const participants = stage.countries.map((c) => c.code);
        const isParticipantsSame = isDeepEqual(
          setupStage.participants,
          participants,
        );
        // Only store runtime state - setup data will be used during loading
        return {
          id: stage.id,
          ...(isParticipantsSame
            ? { isSameAsSetup: true }
            : { isSameAsSetupWithoutParticipants: true, participants }),
          isOver: !!stage.isOver,
          isJuryVoting: !!stage.isJuryVoting,
        };
      } else {
        // Store full stage data (including any differences from setup)
        return {
          id: stage.id,
          name: stage.name,
          order: stage.order ?? 0,
          votingMode: stage.votingMode,
          qualifiesTo: stage.qualifiesTo,
          participants: stage.countries.map((c) => c.code),
          voters: (stage.votingCountries || []).map((v) => v.code),
          isOver: !!stage.isOver,
          isJuryVoting: !!stage.isJuryVoting,
        };
      }
    });

    snapshot.simulation = {
      ...(simulationPointsPayload
        ? { pointsSystem: simulationPointsPayload }
        : {}), // Only save if different from setup
      stages: simulationStages,
      results: {
        predefinedVotes: encodePredefinedVotes(scoreboard.predefinedVotes),
        currentStageId: scoreboard.currentStageId,
        votingCountryIndex: scoreboard.votingCountryIndex,
        votingPointsIndex: scoreboard.votingPointsIndex,
        televotingProgress: scoreboard.televotingProgress,
        currentRevealTelevotePoints: scoreboard.currentRevealTelevotePoints,
        winnerCountryCode: scoreboard.winnerCountry?.code,
      },
      countriesStateByStage,
    };
  }

  return snapshot;
}

export async function applyContestSnapshotToStores(
  snapshot: ContestSnapshot,
  contest: Contest,
  updateMetadataOnly: boolean = false,
) {
  const countriesStore = useCountriesStore.getState();
  const general = useGeneralStore.getState();

  if (updateMetadataOnly) {
    useGeneralStore.setState({
      settings: {
        ...general.settings,
        contestName: contest.name,
        contestDescription: contest.description ?? '',
        contestYear: contest.year?.toString() ?? '',
        hostingCountryCode: contest.hostingCountryCode,
      },
    });
    return;
  }

  const existing = countriesStore.customCountries || [];

  // Merge custom entries into local custom countries (portable)
  const importedCustoms: BaseCountry[] = (snapshot.customEntriesUsed || []).map(
    (e) => ({
      code: e.code,
      name: e.name,
      category: 'Custom',
      flag: e.flag,
      isImported: true,
    }),
  );

  // Store imported entries separately for persistence
  useGeneralStore.setState({ importedCustomEntries: importedCustoms });

  const mergedCustomCountries = [...existing, ...importedCustoms].filter(
    (c, index, self) => index === self.findIndex((t) => t.code === c.code),
  );
  useCountriesStore.setState({ customCountries: mergedCustomCountries });

  const allCountries = countriesStore.getAllCountries(true);
  const byCode = new Map(allCountries.map((c) => [c.code, c]));

  // Apply points system and randomness, ensure predefined votes enabled for replay

  const settingsPointsSystem = getPointsSystem(snapshot.setup.pointsSystem);
  // If simulation doesn't have its own pointsSystem, use the setup one
  const simulationPointsSystem = getPointsSystem(
    snapshot.simulation?.pointsSystem || snapshot.setup.pointsSystem,
  );
  useGeneralStore.setState({
    pointsSystem: simulationPointsSystem,
    settingsPointsSystem: settingsPointsSystem,
    settings: {
      ...general.settings,
      randomnessLevel:
        snapshot.setup.randomnessLevel ?? DEFAULT_RANDOMNESS_LEVEL,
      hostingCountryCode: contest.hostingCountryCode,
      contestName: contest.name,
      contestDescription: contest.description ?? '',
      contestYear: contest.year?.toString() ?? '',
    },
  });

  // Apply odds - merge with base year defaults
  const oddsRecord: Record<
    string,
    { juryOdds?: number; televoteOdds?: number }
  > = {};

  // First, load base year defaults for all participants
  const baseYear = snapshot.setup.baseYear;
  const isJuniorContest = snapshot.setup.isJuniorContest ?? false;
  if (baseYear) {
    // Load the base year countries to get correct defaults (junior or senior)
    await useCountriesStore
      .getState()
      .setInitialCountriesForYear(baseYear.toString() as Year, {
        force: true,
        isJuniorContest,
      });

    const baseYearCountries = useCountriesStore.getState().allCountriesForYear;
    const yearDefaults = baseYearCountries.reduce((acc, country) => {
      acc[country.code] = {
        juryOdds: country.juryOdds ?? DEFAULT_ODDS.juryOdds,
        televoteOdds: country.televoteOdds ?? DEFAULT_ODDS.televoteOdds,
      };
      return acc;
    }, {} as Record<string, { juryOdds: number; televoteOdds: number }>);

    // Apply defaults first
    Object.entries(yearDefaults).forEach(([code, defaults]) => {
      oddsRecord[code] = defaults;
    });
  }

  // Then override with saved custom odds
  (snapshot.setup.countryOdds || []).forEach(
    ([code, juryOdds, televoteOdds]) => {
      oddsRecord[code] = { juryOdds, televoteOdds };
    },
  );
  useCountriesStore.getState().setBulkCountryOdds(oddsRecord);

  // Rebuild eventAssignments + configuredEventStages for setup UI
  const assignments: Record<string, string> = {};
  allCountries.forEach((c) => {
    assignments[c.code] = CountryAssignmentGroup.NOT_PARTICIPATING;
  });
  snapshot.setup.stages.forEach((stage) => {
    stage.participants.forEach((code) => {
      const currentAssignment = assignments[code];
      if (currentAssignment === CountryAssignmentGroup.NOT_PARTICIPATING) {
        assignments[code] = stage.id;
      }
    });
  });

  const toVotingCountry = (code: string): VotingCountry => {
    const found = byCode.get(code);
    return {
      code,
      name: found?.name ?? code,
      ...(found?.flag ? { flag: found.flag } : {}),
    };
  };

  const configuredStages: EventStage[] = snapshot.setup.stages.map((s) => ({
    id: s.id,
    name: s.name,
    order: s.order,
    votingMode: (s.votingMode || DEFAULT_VOTING_MODE) as any,
    qualifiesTo: s.qualifiesTo,
    countries: [],
    votingCountries: (s.voters || []).map(toVotingCountry),
    isOver: false, // Setup stages are never "over"
    isJuryVoting: (s.votingMode || DEFAULT_VOTING_MODE) !== 'TELEVOTE_ONLY',
  }));

  useCountriesStore.setState({
    configuredEventStages: configuredStages,
    eventAssignments: assignments,
  });

  // Apply simulation state if present
  if (snapshot.simulation) {
    // Use simulation's pointsSystem for vote decoding, fallback to setup, then default
    const simulationPointsSystemSource =
      snapshot.simulation!.pointsSystem || snapshot.setup.pointsSystem;
    const simulationPointsSystem: PointsItem[] = simulationPointsSystemSource
      ? simulationPointsSystemSource.map((p) => ({
          id: p.id,
          value: p.value,
          showDouzePoints: p.value === 12,
        }))
      : defaultPointsSystem;

    const decodedPredefinedVotes = decodePredefinedVotes(
      snapshot.simulation!.results.predefinedVotes as any,
      simulationPointsSystem,
    );

    // Create lookup map for setup stages
    const setupStagesMap = new Map(snapshot.setup.stages.map((s) => [s.id, s]));

    // Rebuild scoreboard eventStages from simulation stages and countriesStateByStage
    const scoreboardStages: EventStage[] = (
      snapshot.simulation!.stages as any[]
    )
      .slice()
      .sort((a, b) => {
        // Get order from simulation stage or setup stage if same
        const orderA =
          a.isSameAsSetup || a.isSameAsSetupWithoutParticipants
            ? setupStagesMap.get(a.id)?.order ?? 0
            : a.order ?? 0;

        const orderB =
          b.isSameAsSetup || b.isSameAsSetupWithoutParticipants
            ? setupStagesMap.get(b.id)?.order ?? 0
            : b.order ?? 0;

        return orderA - orderB;
      })
      .map((s, idx, arr) => {
        const stageCountriesState: CountriesStateItem[] =
          snapshot.simulation!.countriesStateByStage?.[s.id] || [];
        const countries: Country[] = stageCountriesState.map((cs) => {
          const base = byCode.get(cs.code);
          const juryPoints = cs.juryPoints ?? 0;
          const televotePoints = cs.televotePoints ?? 0;
          const points = juryPoints + televotePoints;

          return {
            ...(base || { code: cs.code, name: cs.code }),
            qualifiedFromStageIds: cs.qualifiedFromStageIds,
            juryPoints,
            televotePoints,
            points,
            lastReceivedPoints: null,
            isVotingFinished: cs.isVotingFinished ?? false, // Use saved value or default to false
          } as Country;
        });

        if (
          (s as any).isSameAsSetup ||
          (s as any).isSameAsSetupWithoutParticipants
        ) {
          // Merge setup stage data with runtime state
          const setupStage = setupStagesMap.get(s.id);
          if (!setupStage) {
            throw new Error(
              `Setup stage not found for simulation stage ${s.id}`,
            );
          }
          return {
            id: s.id,
            name: setupStage.name,
            order: setupStage.order ?? 0,
            votingMode: (setupStage.votingMode || DEFAULT_VOTING_MODE) as any,
            qualifiesTo: setupStage.qualifiesTo,
            votingCountries: (setupStage.voters || []).map(toVotingCountry),
            isOver: (s as any).isOver, // Runtime state
            isJuryVoting: (s as any).isJuryVoting, // Runtime state
            isLastStage: idx === arr.length - 1,
            countries,
          } as EventStage;
        } else {
          // Use full stage data from simulation
          return {
            id: s.id,
            name: s.name,
            order: s.order ?? 0,
            votingMode: (s.votingMode || DEFAULT_VOTING_MODE) as any,
            qualifiesTo: s.qualifiesTo,
            votingCountries: (s.voters || []).map(toVotingCountry),
            isOver: s.isOver, // Preserve runtime state
            isJuryVoting:
              s.isJuryVoting !== undefined
                ? s.isJuryVoting
                : (s.votingMode || DEFAULT_VOTING_MODE) !== 'TELEVOTE_ONLY', // Preserve runtime state or fallback to default
            isLastStage: idx === arr.length - 1,
            countries,
          } as EventStage;
        }
      });

    const countryPoints = calculateCountryPointsByStage(
      scoreboardStages,
      decodedPredefinedVotes,
    );

    useScoreboardStore.setState({
      eventStages: scoreboardStages,
      currentStageId: snapshot.simulation!.results.currentStageId,
      viewedStageId: null,
      votingCountryIndex: snapshot.simulation!.results.votingCountryIndex,
      votingPointsIndex: snapshot.simulation!.results.votingPointsIndex,
      televotingProgress: snapshot.simulation!.results.televotingProgress,
      currentRevealTelevotePoints:
        snapshot.simulation!.results.currentRevealTelevotePoints ?? 0,
      predefinedVotes: decodedPredefinedVotes,
      countryPoints,
      winnerCountry: snapshot.simulation!.results.winnerCountryCode
        ? (scoreboardStages
            .flatMap((s) => s.countries)
            .find(
              (c) => c.code === snapshot.simulation!.results.winnerCountryCode,
            ) as any) ?? null
        : null,
      showQualificationResults: false,
    } as any);
  } else {
    // No simulation state - just clear the scoreboard
    useScoreboardStore.setState({
      eventStages: [],
      currentStageId: null,
      votingCountryIndex: 0,
      votingPointsIndex: 0,
      televotingProgress: 0,
      predefinedVotes: {},
      countryPoints: {},
      winnerCountry: null,
      showQualificationResults: false,
    } as any);
  }
}
