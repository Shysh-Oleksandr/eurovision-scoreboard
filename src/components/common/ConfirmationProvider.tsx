import React from 'react';

import { ConfirmationModal } from '@/components/common/Modal/ConfirmationModal';
import { useConfirmation } from '@/hooks/useConfirmation';

interface ConfirmationProviderProps {
  children: React.ReactNode;
}

export const ConfirmationProvider: React.FC<ConfirmationProviderProps> = ({
  children,
}) => {
  const { currentConfirmation, handleConfirm, handleCancel } =
    useConfirmation();

  return (
    <>
      {children}
      {currentConfirmation && (
        <ConfirmationModal
          isOpen={!!currentConfirmation}
          onClose={handleCancel}
          onConfirm={handleConfirm}
          title={currentConfirmation.title}
          description={currentConfirmation.description}
          confirmationKey={currentConfirmation.key}
          type={currentConfirmation.type}
        />
      )}
    </>
  );
};
