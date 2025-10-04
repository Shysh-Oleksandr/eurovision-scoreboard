import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';

import { useUpdateProfileMutation } from '@/api/profiles';
import CustomSelect from '@/components/common/customSelect/CustomSelect';
import { InputField } from '@/components/common/InputField';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomContent from '@/components/common/Modal/ModalBottomContent';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { useCountriesStore } from '@/state/countriesStore';
import { useAuthStore } from '@/state/useAuthStore';
import { getHostingCountryLogo } from '@/theme/hosting';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoaded: () => void;
}

const schema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(25, 'Username must be at most 25 characters')
    .regex(/^[a-zA-Z0-9_\-.]+$/, 'Only letters, numbers, _ . - allowed'),
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
});

type FormValues = z.infer<typeof schema>;

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onLoaded,
}) => {
  const getAllCountries = useCountriesStore((state) => state.getAllCountries);
  const user = useAuthStore((s) => s.user);
  const { mutateAsync: updateProfile, isPending } = useUpdateProfileMutation();

  const [selectedCountry, setSelectedCountry] = useState<string>(
    user?.country || 'WW',
  );

  const { register, handleSubmit, formState, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: user?.username || '',
      name: user?.name || '',
    },
  });

  const options = useMemo(() => {
    return getAllCountries(false).map((country) => {
      const { logo, isExisting } = getHostingCountryLogo(country);

      return {
        label: country.name,
        value: country.code,
        imageUrl: logo,
        isExisting,
      };
    });
  }, [getAllCountries]);

  useEffectOnce(() => {
    onLoaded();
    reset({ username: user?.username || '', name: user?.name || '' });
    setSelectedCountry(user?.country || 'CH');
  });

  const onSave = handleSubmit(async (values) => {
    await updateProfile({
      ...values,
      country: selectedCountry,
    });
    onClose();
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,550px)]"
      contentClassName="text-white narrow-scrollbar !h-[max(30vh,300px)]"
      overlayClassName="!z-[1001]"
      bottomContent={
        <ModalBottomContent
          onClose={onClose}
          onSave={onSave}
          isSaving={isPending}
        />
      }
    >
      <h3 className="text-2xl font-bold mb-4">Edit Profile</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          label="Username"
          id="username"
          ref={register('username').ref}
          inputProps={{ ...register('username') }}
          errors={formState.errors}
        />
        <InputField
          label="Name"
          id="name"
          ref={register('name').ref}
          inputProps={{ ...register('name') }}
          errors={formState.errors}
        />
        <CustomSelect
          options={options}
          value={selectedCountry}
          onChange={(value) => setSelectedCountry(value)}
          id="hosting-country-select-box"
          className="ml-1"
          getImageClassName={(option) =>
            option.isExisting ? 'w-8 h-8 !object-contain' : 'w-8 h-6'
          }
          selectClassName="!shadow-none"
        />
      </div>
    </Modal>
  );
};

export default EditProfileModal;
