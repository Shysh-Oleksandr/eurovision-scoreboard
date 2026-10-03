import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { MoveTarget } from './useLineupModel';

import { CountryAssignmentGroup } from '@/models';

/** Human label of an assignment group / move target (replaces the old hardcoded map). */
export const useGroupLabel = () => {
  const t = useTranslations('setup.eventSetupModal');

  return useCallback(
    (target: MoveTarget | string): string => {
      if (typeof target !== 'string') {
        return target.kind === 'stage'
          ? target.name
          : target.kind === 'pool'
          ? t('countryPool')
          : t('notQualified');
      }

      if (target === CountryAssignmentGroup.NOT_PARTICIPATING) {
        return t('countryPool');
      }
      if (target === CountryAssignmentGroup.NOT_QUALIFIED) {
        return t('notQualified');
      }

      return target;
    },
    [t],
  );
};
