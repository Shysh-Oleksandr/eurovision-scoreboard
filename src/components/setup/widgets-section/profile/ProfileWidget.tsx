import React, { Suspense, useState } from 'react';

import { UserCheckIcon } from '@/assets/icons/UserCheckIcon';
import { UserIcon } from '@/assets/icons/UserIcon';
import WidgetContainer from '@/components/common/WidgetContainer';
import { API_BASE_URL } from '@/config';
import { useAuthStore } from '@/state/useAuthStore';

const ProfileModal = React.lazy(() => import('./ProfileModal'));

const ProfileWidget = () => {
  const user = useAuthStore((state) => state.user);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProfileModalLoaded, setIsProfileModalLoaded] = useState(false);

  return (
    <>
      <WidgetContainer
        disabled
        onClick={() => {
          setIsProfileModalOpen(true);
        }}
        title="Profile"
        description={API_BASE_URL}
        icon={
          user ? (
            <UserCheckIcon className="w-6 h-6 flex-none" />
          ) : (
            <UserIcon className="w-6 h-6 flex-none" />
          )
        }
      />

      {(isProfileModalOpen || isProfileModalLoaded) && (
        <Suspense fallback={null}>
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            onLoaded={() => setIsProfileModalLoaded(true)}
          />
        </Suspense>
      )}
    </>
  );
};

export default ProfileWidget;
