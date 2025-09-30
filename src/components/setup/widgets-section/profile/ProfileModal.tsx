import React from 'react';

import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import { useEffectOnce } from '@/hooks/useEffectOnce';

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
  const isAuthenticated = false;

  useEffectOnce(onLoaded);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,650px)]"
      contentClassName="text-white h-[50vh] narrow-scrollbar"
      overlayClassName="!z-[1001]"
      bottomContent={<ModalBottomCloseButton onClose={onClose} />}
    >
      <h3 className="text-2xl font-bold mb-4">Profile</h3>
      {isAuthenticated ? (
        <p className="text-base mb-4">Profile details</p>
      ) : (
        <p className="text-base mb-4">
          Authenticate to be create profile, save your settings and more.
        </p>
      )}

      {isAuthenticated ? (
        <Button label="Logout" variant="secondary" onClick={onClose} />
      ) : (
        <Button
          label="Continue with Google"
          variant="tertiary"
          onClick={onClose}
        />
      )}
    </Modal>
  );
};

export default ProfileModal;
