import { useDeferredValue, useMemo } from 'react';

import { useSetupUiStore } from '../state/setupUiStore';
import { useStageAccordionStore } from '../state/stageAccordionStore';

import { useLineupModelContext } from './LineupProvider';
import { isStageCardList } from './listIds';

/**
 * Deferred search over every list. `matches` is null when the search is
 * empty (render everything), otherwise the set of matching country codes.
 */
export const useLineupSearch = () => {
  const search = useSetupUiStore((state) => state.search);
  const deferred = useDeferredValue(search);
  const { byCode } = useLineupModelContext();

  const matches = useMemo(() => {
    const q = deferred.trim().toLowerCase();

    if (!q) return null;

    const set = new Set<string>();

    byCode.forEach((country, code) => {
      if (country.name.toLowerCase().includes(q)) set.add(code);
    });

    return set;
  }, [deferred, byCode]);

  return { search, matches, isSearching: matches !== null };
};

/**
 * Whether a list renders expanded: search hits win, then the remembered
 * collapse (stage cards) or the explicit toggle (pool lists), then the default.
 */
export const useListExpanded = (
  listId: string,
  defaultExpanded: boolean,
  codes: string[],
  matches: Set<string> | null,
) => {
  const explicit = useSetupUiStore((state) => state.expanded[listId]);
  const collapsedStage = useStageAccordionStore(
    (state) => !!state.collapsed[listId],
  );

  if (matches) {
    return codes.some((code) => matches.has(code));
  }

  if (isStageCardList(listId)) return !collapsedStage;

  return explicit ?? defaultExpanded;
};
