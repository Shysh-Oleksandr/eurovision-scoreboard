import { Dices, LayoutGrid, List, Shuffle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect } from 'react';

import Button from '@/components/common/Button';
import { RankableCountryList } from '@/components/common/rank/RankableCountryList';
import Tabs from '@/components/common/tabs/Tabs';
import { BaseCountry } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { RankTarget } from '@/state/scoreboard/rankToStageVotes';

const layoutTabs = [
  {
    value: 'grid',
    label: <LayoutGrid className="w-6 h-6" />,
  },
  {
    value: 'list',
    label: <List className="w-6 h-6" />,
  },
];

type Props = {
  countries: BaseCountry[];
  orderedCodes: string[];
  onReorder: (orderedCodes: string[]) => void;
  showPoints: boolean;
  totals: Record<string, number>;
  onRandomizePoints: () => void;
  onRandomizeRanking: () => void;
  rankTarget: RankTarget;
  /** Seed the order (+ baseline votes) when entering rank view / switching badge. */
  onEnter: () => void;
};

/**
 * Drag-to-rank mode of the Detailed tab. The user arranges participants into the
 * intended final standings; points stay hidden until "Randomize points" runs the
 * engine (which keeps the order fixed) and reveals each row's total.
 */
export const VotingRankView: React.FC<Props> = ({
  countries,
  orderedCodes,
  onReorder,
  showPoints,
  totals,
  onRandomizePoints,
  onRandomizeRanking,
  rankTarget,
  onEnter,
}) => {
  const t = useTranslations();
  const layout = useGeneralStore((s) => s.settings.votingRankLayout);
  const setSettings = useGeneralStore((s) => s.setSettings);

  // Seed on mount (entering rank view) and whenever the active badge changes.
  useEffect(() => {
    onEnter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankTarget]);

  return (
    <div className="flex flex-col flex-1 min-h-0 px-2">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            className="md:text-base text-sm gap-2"
            onClick={onRandomizeRanking}
            Icon={<Shuffle className="w-5 h-5" />}
          >
            {t('setup.votingPredefinition.randomizeRanking')}
          </Button>
          <Button
            variant="tertiary"
            className="md:text-base text-sm gap-2"
            onClick={onRandomizePoints}
            Icon={<Dices className="w-5 h-5" />}
          >
            {t('setup.votingPredefinition.randomizePoints')}
          </Button>
        </div>
        <Tabs
          tabs={layoutTabs}
          activeTab={layout}
          setActiveTab={(tab) =>
            setSettings({ votingRankLayout: tab as 'list' | 'grid' })
          }
          containerClassName="!p-[3px] !overflow-hidden !h-11 !w-[112px]"
          overlayClassName="!inset-y-[2px]"
          buttonClassName="!py-0 !px-0 h-full"
        />
      </div>
      <p className="text-[12.5px] text-white/40 mt-1 mb-2">
        {t('setup.votingPredefinition.dragToRankHint')}
      </p>
      <div className="narrow-scrollbar overflow-auto flex-1 min-h-0 pb-2">
        <RankableCountryList
          countries={countries}
          orderedCodes={orderedCodes}
          onReorder={onReorder}
          layout={layout}
          valueFor={(code) => (showPoints ? totals[code] ?? 0 : null)}
        />
      </div>
    </div>
  );
};

export default VotingRankView;
