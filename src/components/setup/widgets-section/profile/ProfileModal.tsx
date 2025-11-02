import React, { Suspense, useState } from 'react';

import { LogoutIcon } from '@/assets/icons/LogoutIcon';
import { PencilIcon } from '@/assets/icons/PencilIcon';
import Button from '@/components/common/Button';
import GoogleAuthButton from '@/components/common/GoogleAuthButton';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { useAuthStore } from '@/state/useAuthStore';
import { getHostingCountryLogo } from '@/theme/hosting';

const EditProfileModal = React.lazy(() => import('./EditProfileModal'));

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

  const { logo, isExisting } = getHostingCountryLogo(user?.country || 'WW');

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
          <div className="flex items-center gap-2.5">
            <img
              src={user?.avatarUrl || '/img/ProfileAvatarPlaceholder.png'}
              alt={user?.username || 'avatar'}
              className="w-14 h-14 rounded-full object-cover"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <div className="font-semibold">{user?.name || 'Anonymous'}</div>
                {user?.country && (
                  <img
                    src={logo}
                    alt={`${user?.country} flag`}
                    className={`flex-none rounded-sm mb-0.5 pointer-events-none ${
                      isExisting ? 'w-6 h-6' : 'w-7 h-5 object-cover'
                    }`}
                    width={28}
                    height={28}
                    loading="lazy"
                  />
                )}
              </div>
              <span className="text-sm text-white/70">@{user?.username}</span>
            </div>
          </div>

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
        <Suspense fallback={null}>
          <EditProfileModal
            isOpen={isEditProfileModalOpen}
            onClose={() => setIsEditProfileModalOpen(false)}
            onLoaded={() => setIsEditProfileModalLoaded(true)}
          />
        </Suspense>
      )}
    </Modal>
  );
};

export default ProfileModal;
