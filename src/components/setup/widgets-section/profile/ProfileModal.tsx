'use client';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import dynamic from 'next/dynamic';

import { useLoadContest } from '../../hooks/useLoadContest';
import UserContentSection from '../user-profile/UserContentSection';
import UserProfileHeader from '../user-profile/UserProfileHeader';

import { LogoutIcon } from '@/assets/icons/LogoutIcon';
import { PencilIcon } from '@/assets/icons/PencilIcon';
import Button from '@/components/common/Button';
import GoogleAuthButton from '@/components/common/GoogleAuthButton';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import { useConfirmation } from '@/hooks/useConfirmation';
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
  const t = useTranslations('widgets.profile');
  const { user, logout: storeLogout, isBusy } = useAuthStore();

  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isEditProfileModalLoaded, setIsEditProfileModalLoaded] =
    useState(false);

  const { confirm } = useConfirmation();

  const onLoadContest = useLoadContest();

  const isAuthenticated = !!user;

  useEffectOnce(() => {
    onLoaded();
  });

  const handleLogout = async () => {
    confirm({
      key: 'logout',
      title: t('areYouSureYouWantToLogout'),
      onConfirm: () => {
        storeLogout();
      },
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,750px)]"
      fixedHeight
      overlayClassName="!z-[1001]"
      withBlur
      bottomContent={<ModalBottomCloseButton onClose={onClose} />}
    >
      <h3 className="text-2xl font-bold mb-4">{t('title')}</h3>
      {isAuthenticated ? (
        <div className="text-base flex justify-between flex-wrap items-center gap-4">
          <div className="w-full">
            <UserProfileHeader
              user={user}
              additionalContent={
                <div className="flex items-center gap-2">
                  <Button
                    label={t('editProfile')}
                    variant="primary"
                    onClick={() => setIsEditProfileModalOpen(true)}
                    Icon={<PencilIcon className="w-5 h-5" />}
                  />
                  <Button
                    label={isBusy ? t('loggingOut') : t('logout')}
                    variant="destructive"
                    onClick={handleLogout}
                    disabled={isBusy}
                    Icon={<LogoutIcon className="w-5 h-5 flex-none" />}
                  />
                </div>
              }
            />
          </div>
          <UserContentSection userId={user._id} onLoadContest={onLoadContest} />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 mt-8">
          <p className="text-base text-white/80">{t('authDescription')}</p>
          <GoogleAuthButton />
        </div>
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
