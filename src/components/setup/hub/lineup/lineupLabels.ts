import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { MoveTarget } from './useLineupModel';

import { CountryAssignmentGroup } from '@/models';

/** Human label of an assignment group / move target (replaces the old hardcoded map). */
export const useGroupLabel = () => {
  const t = useTranslations('setup.eventSetupModal');
  const tDraw = useTranslations('setup.allocationDraw');

  return useCallback(
    (target: MoveTarget | string): string => {
      if (typeof target !== 'string') {
        return target.kind === 'stage'
          ? target.name
          : target.kind === 'pool'
          ? t('countryPool')
          : target.kind === 'toBeDrawn'
          ? tDraw('toBeDrawn')
          : t('notQualified');
      }

      if (target === CountryAssignmentGroup.NOT_PARTICIPATING) {
        return t('countryPool');
      }
      if (target === CountryAssignmentGroup.NOT_QUALIFIED) {
        return t('notQualified');
      }
      if (target === CountryAssignmentGroup.TO_BE_DRAWN) {
        return tDraw('toBeDrawn');
      }

      return target;
    },
    [t, tDraw],
  );
};
