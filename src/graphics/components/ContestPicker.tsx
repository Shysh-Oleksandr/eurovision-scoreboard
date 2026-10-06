'use client';
import { Lock, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { useMyContestsListQuery, usePublicContestsQuery } from '@/api/contests';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuthStore } from '@/state/useAuthStore';
import type { Contest } from '@/types/contest';

export interface PickedContest {
  contestId: string;
  contestName: string;
}

interface Props {
  value: string | null;
  onPick: (contest: PickedContest) => void;
}

const Row: React.FC<{
  contest: Contest;
  selected: boolean;
  mine: boolean;
  onClick: () => void;
}> = ({ contest, selected, mine, onClick }) => {
  const t = useTranslations('graphics.data');
  const owner = contest.creator?.name || contest.creator?.username;

  return (
    <button
      type="button"
      className={`gfx-crow${selected ? ' is-on' : ''}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="gfx-crow-name">{contest.name}</span>
      <span className="gfx-crow-sub">
        {contest.year ? `${contest.year} · ` : ''}
        {mine ? t('yours') : owner ?? t('public')}
        {mine && !contest.isPublic && (
          <Lock className="size-3 inline-block ml-1 -mt-px" />
        )}
      </span>
    </button>
  );
};

/**
 * Search + list of saved contests (yours, then public) for the Data panel
 * and the template sheet (handoff §6). Picks an id + name; the provider
 * loads the snapshot.
 */
const ContestPicker: React.FC<Props> = ({ value, onPick }) => {
  const t = useTranslations('graphics.data');
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const q = useDebounce(search, 300);
  const mine = useMyContestsListQuery({ search: q, limit: 6, enabled: !!user });
  const pub = usePublicContestsQuery({ search: q });
  const myList = mine.data?.contests ?? [];
  const myIds = new Set(myList.map((c) => c._id));
  const pubList = (pub.data?.contests ?? []).filter((c) => !myIds.has(c._id));
  const loading = mine.isLoading || pub.isLoading;
  const pick = (c: Contest) =>
    onPick({ contestId: c._id, contestName: c.name });

  return (
    <div className="gfx-cpick">
      <label className="gfx-csearch">
        <Search className="size-4" />
        <input
          className="gfx-input"
          value={search}
          placeholder={t('searchContests')}
          aria-label={t('searchContests')}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {!user && <p className="gfx-hint">{t('signInForContests')}</p>}
      <div className="gfx-clist">
        {myList.length > 0 && (
          <>
            <span className="gfx-clist-h">{t('yours')}</span>
            {myList.map((c) => (
              <Row
                key={c._id}
                contest={c}
                mine
                selected={value === c._id}
                onClick={() => pick(c)}
              />
            ))}
          </>
        )}
        {pubList.length > 0 && (
          <>
            <span className="gfx-clist-h">{t('public')}</span>
            {pubList.map((c) => (
              <Row
                key={c._id}
                contest={c}
                mine={false}
                selected={value === c._id}
                onClick={() => pick(c)}
              />
            ))}
          </>
        )}
        {!loading && !myList.length && !pubList.length && (
          <span className="gfx-muted">{t('noContestsFound')}</span>
        )}
        {loading && <span className="gfx-muted">…</span>}
      </div>
    </div>
  );
};

export default ContestPicker;
