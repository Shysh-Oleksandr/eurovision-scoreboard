import { useTranslations } from 'next-intl';
import React from 'react';

import ThemesWidget from './custom-themes/ThemesWidget';
import ProfileWidget from './profile/ProfileWidget';

import { ScoreboardIcon } from '@/assets/icons/ScoreboardIcon';
import WidgetContainer from '@/components/common/WidgetContainer';

const WidgetsSection = () => {
  const t = useTranslations('widgets');

  return (
    <div className="flex gap-2 overflow-x-auto narrow-scrollbar w-full mt-1">
      <ProfileWidget />
      <ThemesWidget />
      <WidgetContainer
        onClick={() => {}}
        title={t('contests.title')}
        description={t('contests.description')}
        icon={<ScoreboardIcon className="w-6 h-6 flex-none" />}
        disabled
      />
    </div>
  );
};

export default WidgetsSection;
