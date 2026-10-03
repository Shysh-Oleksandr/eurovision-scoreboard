import { useMemo, useRef } from 'react';

import {
  ListId,
  NOT_QUALIFIED_LIST,
  poolList,
  stageList,
  UNGROUPED_ID,
} from './listIds';

import { CATEGORY_ORDER } from '@/components/setup/constants';
import { getQualifiersBreakdown } from '@/components/setup/utils/getQualifiersBreakdown';
import { BaseCountry, CountryAssignmentGroup, EventStage } from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import type { CustomEntryGroup } from '@/types/customEntry';

export type MoveTarget =
  | { kind: 'stage'; id: string; name: string; group: string }
  | { kind: 'pool'; group: CountryAssignmentGroup.NOT_PARTICIPATING }
  | { kind: 'notQualified'; group: CountryAssignmentGroup.NOT_QUALIFIED };

export interface LineupStage {
  stage: EventStage;
  listId: ListId;
  codes: string[];
  isFinal: boolean;
  qualifiers: Array<{ sourceStageName: string; amount: number }> | null;
}

export interface LineupPoolGroup {
  id: string;
  name: string;
  listId: ListId;
  codes: string[];
}

export interface LineupPoolCategory {
  category: string;
  listId: ListId;
  codes: string[];
  /** Custom category only (signed in): entries split by the user's groups. */
  groups?: LineupPoolGroup[];
}

export interface LineupModel {
  byCode: Map<string, BaseCountry>;
  stages: LineupStage[];
  notQualified: string[];
  pool: LineupPoolCategory[];
  moveTargets: MoveTarget[];
  counts: { participating: number; pool: number; stages: number };
  /** Every list's codes keyed by ListId (stages, not-qualified, categories, groups). */
  lists: Map<ListId, string[]>;
}

interface UseLineupModelInput {
  eventStagesWithCountries: EventStage[];
  notParticipatingCountries: BaseCountry[];
  notQualifiedCountries: BaseCountry[];
  customEntryGroups: CustomEntryGroup[];
  isGfOnly: boolean;
  isSignedIn: boolean;
}

export const CUSTOM_CATEGORY = 'Custom';
export const IMPORTED_CATEGORY = 'Imported';

/** The pool category a country is listed under when it is not participating. */
export const poolCategoryOf = (country: BaseCountry): string =>
  country.isImported ? IMPORTED_CATEGORY : country.category || 'Other';

const categoryOrder = (category: string) => {
  const index = CATEGORY_ORDER.indexOf(category);

  return index === -1 ? CATEGORY_ORDER.length : index;
};

/**
 * Keeps the identity of unchanged code arrays across recomputations so
 * memoized lists only re-render when their membership actually changes.
 */
const useStableLists = () => {
  const cache = useRef(new Map<ListId, { key: string; codes: string[] }>());

  return (listId: ListId, codes: string[]): string[] => {
    const key = codes.join(' ');
    const cached = cache.current.get(listId);

    if (cached && cached.key === key) return cached.codes;

    cache.current.set(listId, { key, codes });

    return codes;
  };
};

/** Derives the lineup view model (stable code arrays + a shared country map) from the assignment groups. */
export const useLineupModel = ({
  eventStagesWithCountries,
  notParticipatingCountries,
  notQualifiedCountries,
  customEntryGroups,
  isGfOnly,
  isSignedIn,
}: UseLineupModelInput): LineupModel => {
  const customCountries = useCountriesStore((state) => state.customCountries);
  const getAllCountries = useCountriesStore((state) => state.getAllCountries);
  const stable = useStableLists();

  const byCode = useMemo(
    () => new Map(getAllCountries().map((c) => [c.code, c])),
    // customCountries is the only input of getAllCountries that changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customCountries, getAllCountries],
  );

  const stages = useMemo<LineupStage[]>(() => {
    const sorted = [...eventStagesWithCountries].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );

    return sorted.map((stage, index) => {
      const listId = stageList(stage.id);

      return {
        stage,
        listId,
        codes: stable(
          listId,
          stage.countries.map((c) => c.code),
        ),
        isFinal: index === sorted.length - 1,
        qualifiers: getQualifiersBreakdown(stage, eventStagesWithCountries),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventStagesWithCountries]);

  const notQualified = useMemo(
    () =>
      stable(
        NOT_QUALIFIED_LIST,
        notQualifiedCountries.map((c) => c.code),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notQualifiedCountries],
  );

  const pool = useMemo<LineupPoolCategory[]>(() => {
    const buckets = new Map<string, string[]>();

    buckets.set(CUSTOM_CATEGORY, []);

    for (const country of notParticipatingCountries) {
      const category = poolCategoryOf(country);
      const bucket = buckets.get(category);

      if (bucket) {
        bucket.push(country.code);
      } else {
        buckets.set(category, [country.code]);
      }
    }

    const categories = [...buckets.keys()]
      .filter(
        (category) =>
          category !== IMPORTED_CATEGORY ||
          buckets.get(IMPORTED_CATEGORY)!.length > 0,
      )
      .sort((a, b) => {
        const diff = categoryOrder(a) - categoryOrder(b);

        return diff !== 0 ? diff : a.localeCompare(b);
      });

    return categories.map((category) => {
      const listId = poolList(category);
      const codes = buckets.get(category)!;
      const entry: LineupPoolCategory = {
        category,
        listId,
        codes: stable(listId, codes),
      };

      if (category === CUSTOM_CATEGORY && isSignedIn) {
        const validGroupIds = new Set(customEntryGroups.map((g) => g._id));
        const byGroup = new Map<string, string[]>([[UNGROUPED_ID, []]]);

        customEntryGroups.forEach((g) => byGroup.set(g._id, []));

        for (const code of codes) {
          const groupId = byCode.get(code)?.groupId;
          const key =
            groupId && validGroupIds.has(groupId) ? groupId : UNGROUPED_ID;

          byGroup.get(key)!.push(code);
        }

        const ungroupedListId = poolList(CUSTOM_CATEGORY, UNGROUPED_ID);

        entry.groups = [
          {
            id: UNGROUPED_ID,
            name: '',
            listId: ungroupedListId,
            codes: stable(ungroupedListId, byGroup.get(UNGROUPED_ID)!),
          },
          ...customEntryGroups.map((g) => {
            const groupListId = poolList(CUSTOM_CATEGORY, g._id);

            return {
              id: g._id,
              name: g.name,
              listId: groupListId,
              codes: stable(groupListId, byGroup.get(g._id)!),
            };
          }),
        ];
      }

      return entry;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notParticipatingCountries, customEntryGroups, isSignedIn, byCode]);

  const moveTargets = useMemo<MoveTarget[]>(
    () => [
      ...stages.map<MoveTarget>(({ stage }) => ({
        kind: 'stage',
        id: stage.id,
        name: stage.name,
        group: stage.id,
      })),
      { kind: 'pool', group: CountryAssignmentGroup.NOT_PARTICIPATING },
      ...(isGfOnly
        ? [
            {
              kind: 'notQualified',
              group: CountryAssignmentGroup.NOT_QUALIFIED,
            } as MoveTarget,
          ]
        : []),
    ],
    [stages, isGfOnly],
  );

  const lists = useMemo(() => {
    const map = new Map<ListId, string[]>();

    stages.forEach((s) => map.set(s.listId, s.codes));
    map.set(NOT_QUALIFIED_LIST, notQualified);
    pool.forEach((cat) => {
      map.set(cat.listId, cat.codes);
      cat.groups?.forEach((g) => map.set(g.listId, g.codes));
    });

    return map;
  }, [stages, notQualified, pool]);

  const counts = useMemo(
    () => ({
      participating: new Set(stages.flatMap((s) => s.codes)).size,
      pool: notParticipatingCountries.length,
      stages: stages.length,
    }),
    [stages, notParticipatingCountries.length],
  );

  return { byCode, stages, notQualified, pool, moveTargets, counts, lists };
};
