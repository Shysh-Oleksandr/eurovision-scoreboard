'use client';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import dynamic from 'next/dynamic';

import { UserCheckIcon } from '@/assets/icons/UserCheckIcon';
import { UserIcon } from '@/assets/icons/UserIcon';
import WidgetContainer from '@/components/common/WidgetContainer';
import { useAuthStore } from '@/state/useAuthStore';

const ProfileModal = dynamic(() => import('./ProfileModal'), {
  ssr: false,
});

const ProfileWidget = () => {
  const t = useTranslations('widgets.profile');
  const user = useAuthStore((state) => state.user);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProfileModalLoaded, setIsProfileModalLoaded] = useState(false);

  return (
    <>
      <WidgetContainer
        onClick={() => {
          setIsProfileModalOpen(true);
        }}
        title={t('title')}
        description={t('description')}
        icon={
          user ? (
            <UserCheckIcon className="w-6 h-6 flex-none" />
          ) : (
            <UserIcon className="w-6 h-6 flex-none" />
          )
        }
      />

      {(isProfileModalOpen || isProfileModalLoaded) && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onLoaded={() => setIsProfileModalLoaded(true)}
        />
      )}
    </>
  );
};

export default ProfileWidget;
