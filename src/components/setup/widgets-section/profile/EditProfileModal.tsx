import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';

import {
  useDeleteProfileAvatarMutation,
  useUpdateProfileMutation,
  useUploadProfileAvatarMutation,
} from '@/api/profiles';
import { UserIcon } from '@/assets/icons/UserIcon';
import Button from '@/components/common/Button';
import CustomSelect from '@/components/common/customSelect/CustomSelect';
import { InputField } from '@/components/common/InputField';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomContent from '@/components/common/Modal/ModalBottomContent';
import { DEFAULT_HOSTING_COUNTRY_CODE } from '@/data/data';
import { isGoogleAvatarUrl } from '@/helpers/isGoogleAvatarUrl';
import { toast } from '@/helpers/toast';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { getHostingCountryLogo } from '@/theme/hosting';

const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1MB
const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
];

/** Change picture and Remove / Undo in a row while they fit, else stacked. */
const AVATAR_ACTION_STEPS = [
  { layout: 'inline' },
  { layout: 'stack' },
] as const;

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoaded: () => void;
}

/** The backend's answer when another profile already has the username. */
const isUsernameTaken = (error: unknown) => {
  const response = (
    error as { response?: { status?: number; data?: { message?: unknown } } }
  )?.response;

  return (
    response?.status === 400 &&
    typeof response.data?.message === 'string' &&
    /username already exists/i.test(response.data.message)
  );
};

/**
 * What other fans see of you: picture, name, @username and country, saved
 * together with Save. Account settings that take effect at once (sign-in
 * methods, blocked users, log out, deletion) live in AccountModal.
 */
const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onLoaded,
}) => {
  const t = useTranslations('widgets.profile');
  const tCommon = useTranslations('common');
  const tError = useTranslations('error.imageUpload');
  const getAllCountries = useCountriesStore((state) => state.getAllCountries);
  const shouldUse2026WhiteHeartFlags = useGeneralStore(
    (state) => state.settings.shouldUse2026WhiteHeartFlags,
  );
  const user = useAuthStore((s) => s.user);
  const { mutateAsync: updateProfile, isPending } = useUpdateProfileMutation();
  const { mutateAsync: uploadAvatar, isPending: isUploading } =
    useUploadProfileAvatarMutation();
  const { mutateAsync: deleteAvatar, isPending: isDeleting } =
    useDeleteProfileAvatarMutation();

  const savedCountry = user?.country || DEFAULT_HOSTING_COUNTRY_CODE;
  const [selectedCountry, setSelectedCountry] = useState<string>(savedCountry);

  const schema = useMemo(
    () =>
      z.object({
        username: z
          .string()
          .trim()
          .min(3, t('errors.usernameTooShort'))
          .max(25, t('errors.usernameTooLong'))
          .regex(/^[a-zA-Z0-9_\-.]+$/, t('errors.usernameInvalid')),
        name: z
          .string()
          .trim()
          .min(1, t('errors.nameRequired'))
          .max(100, t('errors.nameTooLong')),
      }),
    [t],
  );

  type FormValues = z.infer<typeof schema>;

  const { register, handleSubmit, formState, reset, setError } =
    useForm<FormValues>({
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
      const { logo, isExisting } = getHostingCountryLogo(
        country,
        true,
        shouldUse2026WhiteHeartFlags,
      );

      return {
        label: country.name,
        value: country.code,
        imageUrl: logo,
        isExisting,
      };
    });
  }, [getAllCountries, shouldUse2026WhiteHeartFlags]);

  useEffectOnce(onLoaded);

  // Start from the saved profile each time the modal opens, and only then:
  // the user object also changes while it is open (a changed email address
  // refetches it), and that must not wipe what is being typed.
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;

    wasOpenRef.current = isOpen;
    if (!justOpened) return;

    reset({ username: user?.username || '', name: user?.name || '' });
    setSelectedCountry(user?.country || DEFAULT_HOSTING_COUNTRY_CODE);
    setSelectedFile(null);
    setRemoveAvatar(false);
  }, [isOpen, user, reset]);

  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const countryChanged = selectedCountry !== savedCountry;
  const pictureChanged = !!selectedFile || removeAvatar;
  const hasChanges = formState.isDirty || countryChanged || pictureChanged;
  const isSaving = isPending || isUploading || isDeleting;

  const onSave = handleSubmit(async (values) => {
    if (!hasChanges || isSaving) return;

    if (formState.isDirty || countryChanged) {
      try {
        await updateProfile({
          username: values.username,
          name: values.name,
          country: selectedCountry,
        });
      } catch (error) {
        if (isUsernameTaken(error)) {
          setError(
            'username',
            { message: t('errors.usernameTaken') },
            { shouldFocus: true },
          );
        } else {
          toast.error(t('errors.saveFailed'));
        }

        return;
      }
    }

    try {
      if (removeAvatar) {
        await deleteAvatar();
      } else if (selectedFile) {
        await uploadAvatar(selectedFile);
      }
    } catch {
      toast.error(t('errors.pictureSaveFailed'));

      return;
    }

    toast.success(t('profileUpdatedSuccessfully'));
    onClose();
  });

  // Enter in Name or Username saves, like any form. The country select stays
  // outside the form: Enter in its search field picks a country.
  const onFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    if (!(e.target instanceof HTMLInputElement)) return;

    e.preventDefault();
    void onSave();
  };

  const displayAvatarUrl = removeAvatar
    ? null
    : previewUrl || user?.avatarUrl || null;
  const [brokenAvatarUrl, setBrokenAvatarUrl] = useState<string | null>(null);
  const showAvatarImage =
    !!displayAvatarUrl && brokenAvatarUrl !== displayAvatarUrl;
  const hasPicture = !!user?.avatarUrl || !!selectedFile;
  const showsPicture = hasPicture && !removeAvatar;

  const avatarActionsRef = useRef<HTMLDivElement>(null);
  const avatarActionsStep = useFitStep(avatarActionsRef, AVATAR_ACTION_STEPS);

  const pickPicture = () => fileInputRef.current?.click();

  const onProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    // Let the same file be picked again after an Undo.
    e.currentTarget.value = '';
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error(tError('errorUnsupportedImageType'));

      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(tError('errorImageTooLarge', { maxSize: 1 }), {
        autoClose: 5000,
      });

      return;
    }

    setSelectedFile(file);
    setRemoveAvatar(false);
  };

  // A picked picture and a removal both wait for Save; Undo takes them back.
  const secondaryPictureAction = selectedFile ? (
    <Button
      variant="surface"
      size="md"
      className="dp-act--quiet"
      onClick={() => setSelectedFile(null)}
    >
      {t('undo')}
    </Button>
  ) : removeAvatar ? (
    <Button
      variant="surface"
      size="md"
      className="dp-act--quiet"
      onClick={() => setRemoveAvatar(false)}
    >
      {t('undo')}
    </Button>
  ) : hasPicture ? (
    <Button
      variant="surface"
      size="md"
      className="dp-act--quiet"
      onClick={() => setRemoveAvatar(true)}
    >
      {t('removePicture')}
    </Button>
  ) : null;

  const usernameField = register('username');
  const nameField = register('name');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,500px)]"
      contentClassName="text-white narrow-scrollbar dp-flat"
      overlayClassName="!z-[1001]"
      fullScreenOnPhone
      bottomContent={
        <ModalBottomContent
          onClose={onClose}
          onSave={onSave}
          isSaving={isSaving}
          saveButtonDisabled={!hasChanges}
        />
      }
    >
      <h3 className="text-2xl font-bold mb-5">{t('editProfile')}</h3>

      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          className="dp-avatar-edit"
          onClick={pickPicture}
          aria-label={showsPicture ? t('changePicture') : t('addPicture')}
        >
          {showAvatarImage && displayAvatarUrl ? (
            <Image
              src={displayAvatarUrl}
              alt=""
              width={80}
              height={80}
              unoptimized={isGoogleAvatarUrl(displayAvatarUrl)}
              onError={() => setBrokenAvatarUrl(displayAvatarUrl)}
            />
          ) : (
            <span className="dp-profile-ph" aria-hidden="true">
              <UserIcon className="size-8" />
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <input
            type="file"
            ref={fileInputRef}
            accept={ALLOWED_IMAGE_TYPES.join(',')}
            className="hidden"
            onChange={onProfilePictureChange}
          />
          <div
            ref={avatarActionsRef}
            className="dp-avatar-actions"
            {...fitStepAttributes(AVATAR_ACTION_STEPS[avatarActionsStep])}
          >
            <Button variant="surface" size="md" onClick={pickPicture}>
              {showsPicture ? t('changePicture') : t('addPicture')}
            </Button>
            {secondaryPictureAction}
          </div>
          <p
            className="text-white/60 text-sm leading-snug text-balance mt-2"
            aria-live="polite"
          >
            {removeAvatar ? t('pictureRemovedOnSave') : t('pictureHint')}
          </p>
        </div>
      </div>

      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void onSave();
        }}
        onKeyDown={onFormKeyDown}
      >
        <InputField
          label={tCommon('name')}
          id="name"
          ref={nameField.ref}
          inputProps={{ ...nameField, autoComplete: 'nickname' }}
          errors={formState.errors}
          hint={t('nameHint')}
        />
        <InputField
          label={t('username')}
          id="username"
          ref={usernameField.ref}
          inputProps={{
            ...usernameField,
            autoComplete: 'username',
            autoCapitalize: 'none',
            autoCorrect: 'off',
            spellCheck: false,
          }}
          errors={formState.errors}
          hint={t('usernameHint')}
          prefix="@"
        />
      </form>

      <div className="flex flex-col gap-2 mt-4">
        <CustomSelect
          options={options}
          value={selectedCountry}
          onChange={(value) => setSelectedCountry(value)}
          id="profile-country-select"
          getImageClassName={(option) =>
            option.isExisting ? 'w-8 h-8 !object-contain' : 'w-8 h-6'
          }
          label={tCommon('country')}
          labelClassName="!text-base font-medium mb-2 inline-block"
          selectClassName="!shadow-none"
        />
        <p className="text-white/60 text-sm leading-snug">{t('countryHint')}</p>
      </div>
    </Modal>
  );
};

export default EditProfileModal;
