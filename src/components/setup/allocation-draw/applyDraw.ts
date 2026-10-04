/**
 * "Apply to line-up": writes a finished draw into the Event Setup stores —
 * stage assignments, running orders with halves, pre-qualified voters — and
 * turns draw mode off. Any votes already predefined for those semis reset.
 */
import { EventStage, VotingCountry } from '@/models';
import { createRng, shuffle } from '@/state/allocationDraw/rng';
import type { DrawInput, DrawPlan } from '@/state/allocationDraw/types';
import {
  DrawnStageInfo,
  useAllocationDrawStore,
} from '@/state/allocationDrawStore';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { normalizeVoterChannels } from '@/state/scoreboard/voterChannels';
import { useScoreboardStore } from '@/state/scoreboardStore';

const toVotingCountry = (
  code: string,
  byCode: Map<string, { name: string; flag?: string }>,
): VotingCountry => {
  const c = byCode.get(code);

  return {
    code,
    name: c?.name ?? code,
    ...(c?.flag ? { flag: c.flag } : {}),
  };
};

const byName =
  (byCode: Map<string, { name: string }>) => (a: string, b: string) =>
    (byCode.get(a)?.name ?? a).localeCompare(byCode.get(b)?.name ?? b);

/**
 * Stage ids of the draw's semis whose predefined votes Apply would discard.
 * Only stages with predefined votes enabled count: otherwise the stored votes
 * are random ones left over from the last run, regenerated on Start anyway.
 */
export const stagesWithVotes = (stageIds: readonly string[]): string[] => {
  const { predefinedVotes } = useScoreboardStore.getState();
  const { enablePredefinedVotes } = useGeneralStore.getState().settings;
  const { configuredEventStages } = useCountriesStore.getState();

  return stageIds.filter((id) => {
    const votes = predefinedVotes[id];
    const overrides = configuredEventStages.find((s) => s.id === id)?.overrides;

    return (
      (overrides?.enablePredefinedVotes ?? enablePredefinedVotes) &&
      !!votes &&
      (['jury', 'televote', 'combined'] as const).some(
        (source) => Object.keys(votes[source] ?? {}).length > 0,
      )
    );
  });
};

export const applyDrawPlan = (plan: DrawPlan, input: DrawInput): void => {
  const countriesStore = useCountriesStore.getState();
  const byCode = new Map(
    countriesStore.getAllCountries().map((c) => [c.code, c]),
  );
  const nameOrder = byName(byCode);
  const assignments = { ...countriesStore.eventAssignments };
  const semiIds = Object.keys(plan.semis);
  const allEntrants = new Set(input.entrants.map((e) => e.code));
  const allPreq = new Set(input.preq.map((p) => p.code));
  const random = createRng(`${plan.code}:ro`);
  const drawn: Record<string, DrawnStageInfo> = {
    ...useAllocationDrawStore.getState().drawn,
  };

  semiIds.forEach((id) => {
    plan.semis[id].members.forEach((m) => (assignments[m.code] = id));
  });

  const updatedStages: EventStage[] = countriesStore.configuredEventStages.map(
    (stage) => {
      const result = plan.semis[stage.id];

      if (!result) return stage;

      const members = result.members.map((m) => m.code);
      const memberSet = new Set(members);

      // Running order
      let runningOrder: string[];
      let firstHalfSize: number | undefined;

      if (plan.order === 'halves') {
        const first = shuffle(
          result.members.filter((m) => m.half === 1).map((m) => m.code),
          random,
        );
        const second = shuffle(
          result.members.filter((m) => m.half === 2).map((m) => m.code),
          random,
        );

        runningOrder = [...first, ...second];
        firstHalfSize = first.length;
      } else if (plan.order === 'positions') {
        runningOrder = [...result.members]
          .sort((a, b) => a.pos - b.pos)
          .map((m) => m.code);
      } else {
        const kept = (stage.runningOrder ?? []).filter((c) => memberSet.has(c));
        const keptSet = new Set(kept);

        runningOrder = [
          ...kept,
          ...members.filter((c) => !keptSet.has(c)).sort(nameOrder),
        ];
      }

      // Voters: the entrants, any extra voter that is neither a semi-finalist
      // nor pre-qualified (e.g. Rest of the World), then the drawn pre-qualified.
      const drawnVoters = result.voters.map((v) => v.code).sort(nameOrder);
      const drawnSet = new Set(drawnVoters);
      const extras = (stage.votingCountries ?? [])
        .map((v) => v.code)
        .filter(
          (code) =>
            !allEntrants.has(code) && !allPreq.has(code) && !drawnSet.has(code),
        );
      const voterCodes = [
        ...[...members].sort(nameOrder),
        ...extras,
        ...drawnVoters,
      ];
      const votingCountries = voterCodes.map((code) =>
        toVotingCountry(code, byCode),
      );

      drawn[stage.id] = {
        code: plan.code,
        order: plan.order,
        members: [...members].sort(),
        voters: drawnVoters,
      };

      return {
        ...stage,
        runningOrder,
        firstHalfSize,
        votingCountries,
        voterChannels: normalizeVoterChannels(
          votingCountries,
          stage.voterChannels,
        ),
      };
    },
  );

  // Append the drawn pre-qualified voters that the ceremony placed (plan.semis
  // only lists pinned / "all" voters; drawn ones come from the steps).
  plan.steps.forEach((step) => {
    if (step.t !== 'preq') return;

    const stage = updatedStages.find((s) => s.id === step.stageId);

    if (!stage || stage.votingCountries?.some((v) => v.code === step.code))
      return;

    stage.votingCountries = [
      ...(stage.votingCountries ?? []),
      toVotingCountry(step.code, byCode),
    ];
    stage.voterChannels = normalizeVoterChannels(
      stage.votingCountries,
      stage.voterChannels,
    );
    drawn[stage.id] = {
      ...drawn[stage.id],
      voters: [...drawn[stage.id].voters, step.code].sort(nameOrder),
    };
  });

  countriesStore.setEventAssignments(assignments);
  countriesStore.setConfiguredEventStages(updatedStages);

  // Votes predefined for a redrawn semi no longer match its line-up.
  useScoreboardStore.setState((state) => {
    const predefinedVotes = { ...state.predefinedVotes };

    semiIds.forEach((id) => delete predefinedVotes[id]);

    return { predefinedVotes };
  });

  const draw = useAllocationDrawStore.getState();

  draw.setDrawn(drawn);
  draw.setEnabled(false);
  draw.clearVotesIn();
  draw.clearWaitingFrom();
};
