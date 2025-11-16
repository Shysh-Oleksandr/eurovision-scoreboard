'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import dynamic from 'next/dynamic';

import { ThemeIcon } from '@/assets/icons/ThemeIcon';
import WidgetContainer from '@/components/common/WidgetContainer';

const ThemesModalModal = dynamic(() => import('./ThemesModal'), {
  ssr: false,
});

const ThemesWidget = () => {
  const t = useTranslations('widgets.themes');

  const [isThemesModalModalOpen, setIsThemesModalModalOpen] = useState(false);
  const [isThemesModalModalLoaded, setIsThemesModalModalLoaded] =
    useState(false);

  return (
    <>
      <WidgetContainer
        onClick={() => {
          setIsThemesModalModalOpen(true);
        }}
        title={t('title')}
        description={t('widgetDescription')}
        icon={<ThemeIcon className="w-6 h-6 flex-none" />}
      />

      {(isThemesModalModalOpen || isThemesModalModalLoaded) && (
        <ThemesModalModal
          isOpen={isThemesModalModalOpen}
          onClose={() => setIsThemesModalModalOpen(false)}
          onLoaded={() => setIsThemesModalModalLoaded(true)}
        />
      )}
    </>
  );
};

export default ThemesWidget;
