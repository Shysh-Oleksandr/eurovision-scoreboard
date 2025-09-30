import React from 'react';

import ProfileWidget from './profile/ProfileWidget';

import { ScoreboardIcon } from '@/assets/icons/ScoreboardIcon';
import { ThemeIcon } from '@/assets/icons/ThemeIcon';
import WidgetContainer from '@/components/common/WidgetContainer';

const WidgetsSection = () => {
  return (
    <div className="grid grid-cols-3 gap-2">
      <ProfileWidget />
      <WidgetContainer
        onClick={() => {}}
        title="Themes"
        description="Create themes (Coming soon)"
        icon={<ThemeIcon className="w-6 h-6 flex-none" />}
        disabled
      />
      <WidgetContainer
        onClick={() => {}}
        title="Scoreboards"
        description="Create scoreboards (Coming soon)"
        icon={<ScoreboardIcon className="w-6 h-6 flex-none" />}
        disabled
      />
    </div>
  );
};

export default WidgetsSection;
