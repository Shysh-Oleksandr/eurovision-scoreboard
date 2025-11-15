import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { z } from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';

import {
  useDeleteProfileAvatarMutation,
  useUpdateProfileMutation,
  useUploadProfileAvatarMutation,
} from '@/api/profiles';
import Button from '@/components/common/Button';
import CustomSelect from '@/components/common/customSelect/CustomSelect';
import { InputField } from '@/components/common/InputField';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomContent from '@/components/common/Modal/ModalBottomContent';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { useCountriesStore } from '@/state/countriesStore';
import { useAuthStore } from '@/state/useAuthStore';
import { getHostingCountryLogo } from '@/theme/hosting';

const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1MB

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
    const hasChanges =
      values.username !== user?.username ||
      values.name !== user?.name ||
      selectedCountry !== user?.country;

    try {
      if (hasChanges) {
        await updateProfile({
          username: values.username.trim(),
          name: values.name.trim(),
          country: selectedCountry,
        });
      }
      if (removeAvatar) {
        await deleteAvatar();
      } else if (selectedFile) {
        await uploadAvatar(selectedFile);
      }
    } catch (error: any) {
      toast(error?.response?.data?.message || 'Failed to update profile', {
        type: 'error',
      });

      return;
    }

    toast('Profile updated successfully!', {
      type: 'success',
    });
    onClose();
  });

  const displayAvatarUrl = useMemo(() => {
    if (selectedFile) return URL.createObjectURL(selectedFile);
    if (removeAvatar) return '/img/ProfileAvatarPlaceholder.png';

    return user?.avatarUrl || '/img/ProfileAvatarPlaceholder.png';
  }, [selectedFile, removeAvatar, user?.avatarUrl]);

  const onProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (!file) {
      return;
    }

    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

    if (!allowed.includes(file.type)) {
      toast('Unsupported image type. Allowed: PNG, JPEG, WEBP, SVG', {
        type: 'error',
      });
      e.currentTarget.value = '';

      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast(
        'Image is too large. Max size is 1MB. Please compress it or upload a smaller image.',
        {
          type: 'error',
          autoClose: 5000,
        },
      );
      e.currentTarget.value = '';

      return;
    }

    setSelectedFile(file);
    setRemoveAvatar(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,550px)]"
      contentClassName="text-white narrow-scrollbar sm:!h-[max(30vh,320px)] !h-[max(30vh,390px)]"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-4 gap-3">
        <div className="flex items-center gap-4 sm:col-span-2">
          <Image
            src={displayAvatarUrl}
            alt="Avatar preview"
            className="w-20 h-20 rounded-full object-cover"
            width={80}
            height={80}
            onError={(e) => {
              e.currentTarget.src = '/img/ProfileAvatarPlaceholder.png';
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={onProfilePictureChange}
            />
            <Button
              variant="tertiary"
              className="!px-3 !py-3 !text-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Change Picture
            </Button>
            {user?.avatarUrl || selectedFile ? (
              <Button
                variant="destructive"
                className="!px-3 !py-3 !text-sm"
                onClick={() => {
                  setSelectedFile(null);
                  setRemoveAvatar(true);
                }}
              >
                Delete Picture
              </Button>
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
          label="Country"
          labelClassName="!text-base font-medium mb-1"
          selectClassName="!shadow-none"
        />
      </div>
    </Modal>
  );
};

export default EditProfileModal;
