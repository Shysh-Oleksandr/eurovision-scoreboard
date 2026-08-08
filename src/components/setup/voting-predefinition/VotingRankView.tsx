import { useTranslations } from 'next-intl';
import React, { useEffect } from 'react';

import { RankableCountryList } from '@/components/common/rank/RankableCountryList';
import { BaseCountry } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { RankTarget } from '@/state/scoreboard/rankToStageVotes';

type Props = {
  countries: BaseCountry[];
  orderedCodes: string[];
  onReorder: (orderedCodes: string[]) => void;
  showPoints: boolean;
  totals: Record<string, number>;
  rankTarget: RankTarget;
  /** Seed the order (+ baseline votes) when entering rank view / switching badge. */
  onEnter: () => void;
};

/**
 * Drag-to-rank mode: the user arranges participants into the intended final
 * standings; points stay hidden until "Random points" runs the engine (which
 * keeps the order fixed) and reveals each row's total. The randomize and layout
 * controls live in the modal's command bar.
 */
export const VotingRankView: React.FC<Props> = ({
  countries,
  orderedCodes,
  onReorder,
  showPoints,
  totals,
  rankTarget,
  onEnter,
}) => {
  const t = useTranslations();
  const layout = useGeneralStore((s) => s.settings.votingRankLayout);

  // Seed on mount (entering rank view) and whenever the active badge changes.
  useEffect(() => {
    onEnter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankTarget]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="text-[12.5px] font-medium leading-relaxed text-white/40">
        {t('setup.votingPredefinition.dragToRankHint')}
      </p>
      <RankableCountryList
        countries={countries}
        orderedCodes={orderedCodes}
        onReorder={onReorder}
        layout={layout}
        scrollable
        valueFor={(code) => (showPoints ? totals[code] ?? 0 : null)}
      />
    </div>
  );
};

export default VotingRankView;
