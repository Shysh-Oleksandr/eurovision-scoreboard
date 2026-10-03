'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import dynamic from 'next/dynamic';

import { ThemeIcon } from '@/assets/icons/ThemeIcon';
import WidgetContainer from '@/components/common/WidgetContainer';
import { WidgetStatProps } from '@/components/setup/widgets-section/profile/ProfileWidget';
import { useGeneralStore } from '@/state/generalStore';

const ThemesModal = dynamic(() => import('./ThemesModal'), {
  ssr: false,
});

const ThemesWidget = ({ stat, statLoading }: WidgetStatProps) => {
  const t = useTranslations('widgets.themes');

  const isThemesModalOpen = useGeneralStore((state) => state.isThemesModalOpen);
  const setIsThemesModalOpen = useGeneralStore(
    (state) => state.setIsThemesModalOpen,
  );
  const [isThemesModalLoaded, setIsThemesModalLoaded] = useState(false);

  return (
    <>
      <WidgetContainer
        onClick={() => {
          setIsThemesModalOpen(true);
        }}
        title={t('title')}
        description={t('widgetDescription')}
        tone="pink"
        stat={stat}
        statLoading={statLoading}
        icon={<ThemeIcon className="size-[21px] flex-none" />}
      />

      {(isThemesModalOpen || isThemesModalLoaded) && (
        <ThemesModal
          isOpen={isThemesModalOpen}
          onClose={() => setIsThemesModalOpen(false)}
          onLoaded={() => setIsThemesModalLoaded(true)}
        />
      )}
    </>
  );
};

export default ThemesWidget;
