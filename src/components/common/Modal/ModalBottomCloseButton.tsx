import React from 'react';

import Button from '../Button';

interface ModalBottomCloseButtonProps {
  onClose: () => void;
}

const ModalBottomCloseButton: React.FC<ModalBottomCloseButtonProps> = ({
  onClose,
}) => {
  return (
    <div className="flex justify-end xs:gap-4 gap-2 bg-primary-900 lg:p-4 md:p-3 p-2 z-30">
      <Button className="md:text-base text-sm w-full" onClick={onClose}>
        Close
      </Button>
    </div>
  );
};

export default ModalBottomCloseButton;
