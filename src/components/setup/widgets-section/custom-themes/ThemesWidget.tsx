'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import dynamic from 'next/dynamic';

import { ThemeIcon } from '@/assets/icons/ThemeIcon';
import WidgetContainer from '@/components/common/WidgetContainer';

const ThemesModal = dynamic(() => import('./ThemesModal'), {
  ssr: false,
});

const ThemesWidget = () => {
  const t = useTranslations('widgets.themes');

  const [isThemesModalOpen, setIsThemesModalOpen] = useState(false);
  const [isThemesModalLoaded, setIsThemesModalLoaded] = useState(false);

  return (
    <>
      <WidgetContainer
        onClick={() => {
          setIsThemesModalOpen(true);
        }}
        title={t('title')}
        description={t('widgetDescription')}
        icon={<ThemeIcon className="w-6 h-6 flex-none" />}
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
