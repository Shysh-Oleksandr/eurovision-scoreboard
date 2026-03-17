import {
  BaseCountry,
  Country,
  CountryAssignmentGroup,
  EventStage,
} from '../../../models';

export interface BuiltEventStagesResult {
  eventStagesWithCountries: EventStage[];
  notParticipatingCountries: Country[];
  notQualifiedCountries: Country[];
}

/**
 * Builds event stages populated with countries based on the configured stages
 * and flat eventAssignments map.
 */
export const buildEventStagesFromAssignments = (
  allCountries: BaseCountry[],
  configuredEventStages: EventStage[],
  eventAssignments: Record<string, string> | undefined,
): BuiltEventStagesResult => {
  const currentAssignments = eventAssignments || {};

  const initialGroups: Record<string, Country[]> = {
    [CountryAssignmentGroup.NOT_PARTICIPATING]: [],
    [CountryAssignmentGroup.NOT_QUALIFIED]: [],
  };

  configuredEventStages.forEach((stage) => {
    initialGroups[stage.id] = [];
  });

  allCountries.forEach((country) => {
    const group = currentAssignments[country.code];
    const countryWithPoints: Country = {
      ...country,
      juryPoints: 0,
      televotePoints: 0,
      points: 0,
      lastReceivedPoints: null,
    };

    if (group && initialGroups[group]) {
      initialGroups[group].push(countryWithPoints);
    } else {
      // Country assigned to a group that doesn't exist (e.g. deleted stage)
      initialGroups[CountryAssignmentGroup.NOT_PARTICIPATING].push(
        countryWithPoints,
      );
    }
  });

  // Sort countries within each group
  // For stage groups: use runningOrder if present, else alphabetical
  // For NOT_PARTICIPATING / NOT_QUALIFIED: alphabetical
  const sortedStages = configuredEventStages
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  for (const stage of sortedStages) {
    const group = initialGroups[stage.id];
    if (!group) continue;
    if (stage.runningOrder && stage.runningOrder.length > 0) {
      const orderMap = new Map(
        stage.runningOrder.map((code, idx) => [code, idx]),
      );
      const inOrder = group.filter((c) => orderMap.has(c.code));
      const notInOrder = group.filter((c) => !orderMap.has(c.code));
      inOrder.sort((a, b) => (orderMap.get(a.code) ?? 0) - (orderMap.get(b.code) ?? 0));
      notInOrder.sort((a, b) => a.name.localeCompare(b.name));
      initialGroups[stage.id] = [...inOrder, ...notInOrder];
    } else {
      group.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  [CountryAssignmentGroup.NOT_PARTICIPATING, CountryAssignmentGroup.NOT_QUALIFIED].forEach(
    (key) => {
      const group = initialGroups[key];
      if (group) group.sort((a, b) => a.name.localeCompare(b.name));
    },
  );

  const eventStagesWithCountries: EventStage[] = sortedStages.map((stage) => ({
    ...stage,
    countries: initialGroups[stage.id] || [],
  }));

  return {
    eventStagesWithCountries,
    notParticipatingCountries:
      initialGroups[CountryAssignmentGroup.NOT_PARTICIPATING],
    notQualifiedCountries: initialGroups[CountryAssignmentGroup.NOT_QUALIFIED],
  };
};
