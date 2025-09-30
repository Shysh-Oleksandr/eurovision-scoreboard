import React, { Suspense, useState } from 'react';

import { UserIcon } from '@/assets/icons/UserIcon';
import WidgetContainer from '@/components/common/WidgetContainer';

const ProfileModal = React.lazy(() => import('./ProfileModal'));

const ProfileWidget = () => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProfileModalLoaded, setIsProfileModalLoaded] = useState(false);

  return (
    <>
      <WidgetContainer
        onClick={() => {
          setIsProfileModalOpen(true);
        }}
        title="Profile"
        description="Manage your profile and settings"
        icon={<UserIcon className="w-6 h-6 flex-none" />}
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
