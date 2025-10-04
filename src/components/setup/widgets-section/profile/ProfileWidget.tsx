import React, { Suspense, useState } from 'react';

import { UserIcon } from '@/assets/icons/UserIcon';
import WidgetContainer from '@/components/common/WidgetContainer';
import { useAuthStore } from '@/state/useAuthStore';

const ProfileModal = React.lazy(() => import('./ProfileModal'));

const ProfileWidget = () => {
  const user = useAuthStore((state) => state.user);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProfileModalLoaded, setIsProfileModalLoaded] = useState(false);

  return (
    <>
      <WidgetContainer
        onClick={() => {
          setIsProfileModalOpen(true);
        }}
        title="Profile"
        description={`Manage your profile and settings ${
          user ? `(${user.name})` : ''
        }`}
        icon={<UserIcon className="w-6 h-6 flex-none" />} // TODO: When authenticated, show the checkmark
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
