'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import dynamic from 'next/dynamic';

import { TrophyIcon } from '@/assets/icons/TrophyIcon';
import WidgetContainer, {
  WidgetStatProps,
} from '@/components/common/WidgetContainer';
import { useGeneralStore } from '@/state/generalStore';

const ContestsModal = dynamic(() => import('./ContestsModal'), {
  ssr: false,
});

const ContestsWidget = ({ stat, statLoading }: WidgetStatProps) => {
  const t = useTranslations('widgets.contests');

  const isContestsModalOpen = useGeneralStore(
    (state) => state.isContestsModalOpen,
  );
  const setIsContestsModalOpen = useGeneralStore(
    (state) => state.setIsContestsModalOpen,
  );
  const [isContestsModalLoaded, setIsContestsModalLoaded] = useState(false);

  return (
    <>
      <WidgetContainer
        onClick={() => {
          setIsContestsModalOpen(true);
        }}
        title={t('title')}
        description={t('description')}
        tone="gold"
        stat={stat}
        statLoading={statLoading}
        icon={<TrophyIcon className="size-[21px] flex-none" />}
      />

      {(isContestsModalOpen || isContestsModalLoaded) && (
        <ContestsModal
          isOpen={isContestsModalOpen}
          onClose={() => setIsContestsModalOpen(false)}
          onLoaded={() => setIsContestsModalLoaded(true)}
        />
      )}
    </>
  );
};

export default ContestsWidget;
