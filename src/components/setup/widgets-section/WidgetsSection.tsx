import React from 'react';

import ProfileWidget from './profile/ProfileWidget';

import { ScoreboardIcon } from '@/assets/icons/ScoreboardIcon';
import { ThemeIcon } from '@/assets/icons/ThemeIcon';
import WidgetContainer from '@/components/common/WidgetContainer';

const WidgetsSection = () => {
  return (
    <div className="flex gap-2 overflow-x-auto narrow-scrollbar w-full">
      <ProfileWidget />
      <WidgetContainer
        onClick={() => {}}
        title="Themes"
        description="Create custom themes (Coming soon)"
        icon={<ThemeIcon className="w-6 h-6 flex-none" />}
        disabled
      />
      <WidgetContainer
        onClick={() => {}}
        title="Contests"
        description="Create contests (Coming soon)"
        icon={<ScoreboardIcon className="w-6 h-6 flex-none" />}
        disabled
      />
    </div>
  );
};

export default WidgetsSection;
