import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';

import {
  useDeleteProfileAvatarMutation,
  useUpdateProfileMutation,
  useUploadProfileAvatarMutation,
} from '@/api/profiles';
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
  const { mutateAsync: uploadAvatar, isPending: isUploading } =
    useUploadProfileAvatarMutation();
  const { mutateAsync: deleteAvatar, isPending: isDeleting } =
    useDeleteProfileAvatarMutation();

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

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

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

  useEffectOnce(onLoaded);

  useEffect(() => {
    if (!isOpen) return;

    reset({ username: user?.username || '', name: user?.name || '' });
    setSelectedCountry(user?.country || 'CH');

    if (user?.avatarUrl) {
      setSelectedFile(null);
      setRemoveAvatar(false);
    }
  }, [user?.avatarUrl, reset, setSelectedCountry, isOpen, user]);

  const onSave = handleSubmit(async (values) => {
    await updateProfile({
      ...values,
      country: selectedCountry,
    });
    if (removeAvatar) {
      await deleteAvatar();
    } else if (selectedFile) {
      await uploadAvatar(selectedFile);
    }
    onClose();
  });

  const displayAvatarUrl = useMemo(() => {
    if (selectedFile) return URL.createObjectURL(selectedFile);
    if (removeAvatar) return '/img/ProfileAvatarPlaceholder.png';

    return user?.avatarUrl || '/img/ProfileAvatarPlaceholder.png';
  }, [selectedFile, removeAvatar, user?.avatarUrl]);

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
          isSaving={isPending || isUploading || isDeleting}
        />
      }
    >
      <h3 className="text-2xl font-bold mb-4">Edit Profile</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 flex items-start gap-4">
          <img
            src={displayAvatarUrl}
            alt="Avatar preview"
            className="w-16 h-16 rounded-full object-cover"
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;

                if (!file) {
                  return;
                }

                const allowed = [
                  'image/png',
                  'image/jpeg',
                  'image/webp',
                  'image/svg+xml',
                ];

                if (!allowed.includes(file.type)) {
                  alert('Unsupported file type. Allowed: PNG, JPEG, WEBP, SVG');
                  e.currentTarget.value = '';

                  return;
                }

                if (file.size > 3 * 1024 * 1024) {
                  alert('File too large. Max size is 3MB.');
                  e.currentTarget.value = '';

                  return;
                }

                setSelectedFile(file);
                setRemoveAvatar(false);
              }}
            />
            <button
              type="button"
              className="px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600"
              onClick={() => fileInputRef.current?.click()}
            >
              Change Photo
            </button>
            {user?.avatarUrl || selectedFile ? (
              <button
                type="button"
                className="px-3 py-1 rounded bg-red-600 hover:bg-red-500"
                onClick={() => {
                  setSelectedFile(null);
                  setRemoveAvatar(true);
                }}
              >
                Remove Photo
              </button>
            ) : null}
          </div>
        </div>
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
