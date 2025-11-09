'use client';
import React, { useState } from 'react';

import dynamic from 'next/dynamic';

import { LogoutIcon } from '@/assets/icons/LogoutIcon';
import { PencilIcon } from '@/assets/icons/PencilIcon';
import Button from '@/components/common/Button';
import GoogleAuthButton from '@/components/common/GoogleAuthButton';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import UserInfo from '@/components/common/UserInfo';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { useAuthStore } from '@/state/useAuthStore';

const EditProfileModal = dynamic(() => import('./EditProfileModal'), {
  ssr: false,
});

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoaded: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onLoaded,
}) => {
  const { user, logout: storeLogout, isBusy } = useAuthStore();

  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isEditProfileModalLoaded, setIsEditProfileModalLoaded] =
    useState(false);

  const isAuthenticated = !!user;

  useEffectOnce(() => {
    onLoaded();
  });

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      storeLogout();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,500px)]"
      contentClassName="text-white !h-[max(25vh,250px)]"
      overlayClassName="!z-[1001]"
      bottomContent={<ModalBottomCloseButton onClose={onClose} />}
    >
      <h3 className="text-2xl font-bold mb-4">Profile</h3>
      {isAuthenticated ? (
        <div className="text-base mb-4 flex justify-between flex-wrap items-center gap-4">
          <UserInfo user={user} size="lg" />

          <Button
            label="Edit Profile"
            variant="primary"
            onClick={() => setIsEditProfileModalOpen(true)}
            Icon={<PencilIcon className="w-5 h-5" />}
          />
        </div>
      ) : (
        <p className="text-base mb-4 text-white/80">
          Authenticate to be able to create a profile, use custom countries, and
          more.
        </p>
      )}

      {isAuthenticated ? (
        <Button
          label={isBusy ? 'Logging out...' : 'Logout'}
          variant="destructive"
          onClick={handleLogout}
          disabled={isBusy}
          Icon={<LogoutIcon className="w-5 h-5 flex-none" />}
        />
      ) : (
        <GoogleAuthButton />
      )}

      {(isEditProfileModalOpen || isEditProfileModalLoaded) && (
        <EditProfileModal
          isOpen={isEditProfileModalOpen}
          onClose={() => setIsEditProfileModalOpen(false)}
          onLoaded={() => setIsEditProfileModalLoaded(true)}
        />
      )}
    </Modal>
  );
};

export default ProfileModal;
