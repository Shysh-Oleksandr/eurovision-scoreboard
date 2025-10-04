import React, { Suspense, useState } from 'react';

import GoogleIcon from '@/assets/icons/GoogleIcon';
import { LogoutIcon } from '@/assets/icons/LogoutIcon';
import { PencilIcon } from '@/assets/icons/PencilIcon';
import Button from '@/components/common/Button';
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
  const { user, login, logout: storeLogout, isBusy } = useAuthStore();

  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isEditProfileModalLoaded, setIsEditProfileModalLoaded] =
    useState(false);

  const isAuthenticated = !!user;

  useEffectOnce(() => {
    onLoaded();
  });

  const { logo, isExisting } = getHostingCountryLogo(user?.country || 'WW');

  const handleGoogleLogin = () => {
    login();
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      storeLogout();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,600px)]"
      contentClassName="text-white !h-[max(30vh,300px)]"
      overlayClassName="!z-[1001]"
      bottomContent={<ModalBottomCloseButton onClose={onClose} />}
    >
      <h3 className="text-2xl font-bold mb-4">Profile</h3>
      {isAuthenticated ? (
        <div className="text-base mb-4 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            {user?.avatarUrl ? (
              <img
                src={user?.avatarUrl}
                alt={user?.username || 'avatar'}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : null}
            <div>
              <div className="font-semibold">{user?.name || 'Anonymous'}</div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/70">@{user?.username}</span>
                {user?.country && (
                  <img
                    src={logo}
                    alt={`${user?.country} flag`}
                    className={`flex-none rounded-sm pointer-events-none ${
                      isExisting ? 'w-6 h-6' : 'w-7 h-5 object-cover'
                    }`}
                    width={28}
                    height={28}
                    loading="lazy"
                  />
                )}
              </div>
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
        <p className="text-base mb-4">
          Authenticate to be create profile, save your settings and more.
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
        <Button
          label="Continue with Google"
          Icon={<GoogleIcon className="w-6 h-6 flex-none" />}
          variant="tertiary"
          onClick={handleGoogleLogin}
        />
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
