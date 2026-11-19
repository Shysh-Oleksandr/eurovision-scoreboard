import { useRef, useState } from 'react';

import { BaseCountry } from '../../../models';

export const useCustomCountryModal = () => {
  const [isCustomCountryModalOpen, setIsCustomCountryModalOpen] =
    useState(false);
  const [countryToEdit, setCountryToEdit] = useState<BaseCountry | undefined>(
    undefined,
  );
  const [initialGroupId, setInitialGroupId] = useState<string | undefined>(
    undefined,
  );

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /** A new entry; `groupId` when it was started from a group's +. */
  const handleOpenCreateModal = (groupId?: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setCountryToEdit(undefined);
    setInitialGroupId(typeof groupId === 'string' ? groupId : undefined);
    setIsCustomCountryModalOpen(true);
  };

  const handleOpenEditModal = (country: BaseCountry) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setCountryToEdit(country);
    setInitialGroupId(undefined);
    setIsCustomCountryModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCustomCountryModalOpen(false);
    timeoutRef.current = setTimeout(() => {
      setCountryToEdit(undefined);
    }, 400);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  };

  return {
    isCustomCountryModalOpen,
    countryToEdit,
    initialGroupId,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleCloseModal,
  };
};
