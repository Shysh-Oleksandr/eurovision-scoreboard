import React, { Suspense, useState } from 'react';

import { ThemeIcon } from '@/assets/icons/ThemeIcon';
import WidgetContainer from '@/components/common/WidgetContainer';

const ThemesModalModal = React.lazy(() => import('./ThemesModal'));

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
        <Suspense fallback={null}>
          <ThemesModalModal
            isOpen={isThemesModalModalOpen}
            onClose={() => setIsThemesModalModalOpen(false)}
            onLoaded={() => setIsThemesModalModalLoaded(true)}
          />
        </Suspense>
      )}
    </>
  );
};

export default ThemesWidget;
