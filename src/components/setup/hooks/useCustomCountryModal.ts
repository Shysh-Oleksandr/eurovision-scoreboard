import { useState } from 'react';

import { BaseCountry } from '../../../models';

export const useCustomCountryModal = () => {
  const [isCustomCountryModalOpen, setIsCustomCountryModalOpen] =
    useState(false);
  const [countryToEdit, setCountryToEdit] = useState<BaseCountry | undefined>(
    undefined,
  );

  const handleOpenCreateModal = () => {
    setCountryToEdit(undefined);
    setIsCustomCountryModalOpen(true);
  };

  const handleOpenEditModal = (country: BaseCountry) => {
    setCountryToEdit(country);
    setIsCustomCountryModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCustomCountryModalOpen(false);
    setCountryToEdit(undefined);
  };

  return {
    isCustomCountryModalOpen,
    countryToEdit,
    handleOpenCreateModal,
    handleOpenEditModal,
    handleCloseModal,
  };
};
