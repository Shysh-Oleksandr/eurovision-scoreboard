import { useRef, useState } from 'react';

import { BaseCountry } from '../../../models';

export const useCustomCountryModal = () => {
  const [isCustomCountryModalOpen, setIsCustomCountryModalOpen] =
    useState(false);
  const [countryToEdit, setCountryToEdit] = useState<BaseCountry | undefined>(
    undefined,
  );

  const timeoutRef = useRef<number | null>(null);

  const handleOpenCreateModal = () => {
    setCountryToEdit(undefined);
    setIsCustomCountryModalOpen(true);
  };

  const handleOpenEditModal = (country: BaseCountry) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setCountryToEdit(country);
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
    handleOpenCreateModal,
    handleOpenEditModal,
    handleCloseModal,
  };
};
