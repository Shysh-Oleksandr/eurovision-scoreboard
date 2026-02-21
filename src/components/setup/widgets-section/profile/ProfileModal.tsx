'use client';
import { useTranslations } from 'next-intl';
import React, { useCallback, useMemo, useState } from 'react';

import dynamic from 'next/dynamic';

import { useLoadContest } from '../../hooks/useLoadContest';
import UserContentSection from '../user-profile/UserContentSection';
import UserProfileHeader from '../user-profile/UserProfileHeader';

import FollowingFeedSection from './FollowingFeedSection';

import { LogoutIcon } from '@/assets/icons/LogoutIcon';
import { PencilIcon } from '@/assets/icons/PencilIcon';
import Button from '@/components/common/Button';
import GoogleAuthButton from '@/components/common/GoogleAuthButton';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import Tabs, { TabContent } from '@/components/common/tabs/Tabs';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { useAuthStore } from '@/state/useAuthStore';

const EditProfileModal = dynamic(() => import('./EditProfileModal'), {
  ssr: false,
});

enum ProfileTab {
  YOUR_PROFILE = 'your-profile',
  FOLLOWING = 'following',
}

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
  const [activeTab, setActiveTab] = useState<ProfileTab>(
    ProfileTab.YOUR_PROFILE,
  );

  const onLoadContest = useLoadContest();

  const isAuthenticated = !!user;

  const handleLogout = useCallback(async () => {
    confirm({
      key: 'logout',
      title: t('areYouSureYouWantToLogout'),
      onConfirm: () => {
        storeLogout();
      },
    });
  }, [confirm, storeLogout, t]);

  const tabs = useMemo(
    () => [
      {
        value: ProfileTab.YOUR_PROFILE,
        label: t('yourProfile'),
      },
      { value: ProfileTab.FOLLOWING, label: t('following') },
    ],
    [t],
  );

  const tabsWithContent = useMemo(
    () => [
      {
        ...tabs[0],
        content: (
          <div className="space-y-4">
            {user && (
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
            )}
            <UserContentSection
              userId={user?._id ?? ''}
              onLoadContest={onLoadContest}
            />
          </div>
        ),
      },
      {
        ...tabs[1],
        content: <FollowingFeedSection onLoadContest={onLoadContest} />,
      },
    ],
    [tabs, user, t, isBusy, handleLogout, onLoadContest],
  );

  useEffectOnce(() => {
    onLoaded();
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,750px)]"
      contentClassName="!pt-3 sm:h-[75vh] h-[72vh] max-h-[72vh]"
      fixedHeight
      overlayClassName="!z-[1001]"
      withBlur
      bottomContent={<ModalBottomCloseButton onClose={onClose} />}
      topContent={
        isAuthenticated ? (
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            setActiveTab={(tab) => setActiveTab(tab as ProfileTab)}
          />
        ) : undefined
      }
    >
      {isAuthenticated ? (
        <div className="text-base flex flex-col gap-4">
          <TabContent
            tabs={tabsWithContent}
            activeTab={activeTab}
            preserveContent
          />
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
