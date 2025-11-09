'use client';
import { useState } from 'react';

import dynamic from 'next/dynamic';

import { ThemeIcon } from '@/assets/icons/ThemeIcon';
import WidgetContainer from '@/components/common/WidgetContainer';

const ThemesModalModal = dynamic(() => import('./ThemesModal'), {
  ssr: false,
});

const ThemesWidget = () => {
  const [isThemesModalModalOpen, setIsThemesModalModalOpen] = useState(false);
  const [isThemesModalModalLoaded, setIsThemesModalModalLoaded] =
    useState(false);

  return (
    <>
      <WidgetContainer
        onClick={() => {
          setIsThemesModalModalOpen(true);
        }}
        title="Themes"
        description="Create custom themes or select public themes"
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
