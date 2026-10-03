'use client';
import { useTranslations } from 'next-intl';
import React from 'react';

import { useLineupModelContext } from './LineupProvider';
import { NOT_QUALIFIED_LIST } from './listIds';
import StageCard from './StageCard';
import { useLineupSearch } from './useLineupSearch';

interface StageListProps {
  isGfOnly: boolean;
}

/** Stage cards in order, plus the "Not qualified" card in Grand-Final-only mode. */
const StageList: React.FC<StageListProps> = ({ isGfOnly }) => {
  const t = useTranslations('setup.eventSetupModal');
  const { stages, notQualified } = useLineupModelContext();
  const { matches } = useLineupSearch();

  return (
    <>
      {stages.map((entry, i) => (
        <StageCard
          key={entry.stage.id}
          title={entry.stage.name}
          listId={entry.listId}
          codes={entry.codes}
          kind={entry.isFinal ? 'final' : 'semi'}
          index={i + 1}
          stage={entry.stage}
          qualifiers={isGfOnly ? null : entry.qualifiers}
          matches={matches}
          eager={i === 0}
        />
      ))}
      {isGfOnly && (
        <StageCard
          title={t('notQualified')}
          listId={NOT_QUALIFIED_LIST}
          codes={notQualified}
          kind="notQualified"
          matches={matches}
        />
      )}
    </>
  );
};

export default StageList;
