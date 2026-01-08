import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import {
  useApplyContestMutation,
  useCreateContestMutation,
  useUpdateContestMutation,
} from '@/api/contests';
import { Checkbox } from '@/components/common/Checkbox';
import CustomSelect from '@/components/common/customSelect/CustomSelect';
import { InputField } from '@/components/common/InputField';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomContent from '@/components/common/Modal/ModalBottomContent';
import { TextareaField } from '@/components/common/TextareaField';
import { Tooltip } from '@/components/common/Tooltip';
import { DEFAULT_HOSTING_COUNTRY_CODE } from '@/data/data';
import {
  applyContestSnapshotToStores,
  buildContestSnapshotFromStores,
} from '@/helpers/contestSnapshot';
import { toastAxiosError } from '@/helpers/parseAxiosError';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { getHostingCountryLogo } from '@/theme/hosting';
import { Contest } from '@/types/contest';

interface CreateContestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialContest?: Contest;
  onLoaded?: () => void;
}

const CreateContestModal: React.FC<CreateContestModalProps> = ({
  isOpen,
  onClose,
  initialContest,
  onLoaded,
}) => {
  const t = useTranslations();

  const isEditMode = !!initialContest;

  const settings = useGeneralStore((state) => state.settings);
  const activeContest = useGeneralStore((state) => state.activeContest);
  const customTheme = useGeneralStore((state) => state.customTheme);
  const themeYear = useGeneralStore((state) => state.themeYear);

  const isEditingActiveContest = activeContest?._id === initialContest?._id;

  const [name, setName] = useState(settings.contestName);
  const [year, setYear] = useState(Number(settings.contestYear));
  const [hostingCountryCode, setHostingCountryCode] = useState(
    settings.hostingCountryCode || DEFAULT_HOSTING_COUNTRY_CODE,
  );

  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [overwriteContestSetupAndResults, setOverwriteContestSetupAndResults] =
    useState(true);

  const { mutateAsync: createContest, isPending: isCreating } =
    useCreateContestMutation();
  const { mutateAsync: updateContest, isPending: isUpdating } =
    useUpdateContestMutation();
  const { mutateAsync: applyContestToProfile } = useApplyContestMutation();
  const user = useAuthStore((s) => s.user);

  const getAllCountries = useCountriesStore((state) => state.getAllCountries);

  const hostingCountryOptions = useMemo(() => {
    // For now, we only show the countries that are not custom
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
    if (initialContest) {
      setName(initialContest.name ?? '');
      setDescription(initialContest.description ?? '');
      setIsPublic(!!initialContest.isPublic);
      setYear(initialContest.year ?? new Date().getFullYear());
      setHostingCountryCode(
        initialContest.hostingCountryCode || DEFAULT_HOSTING_COUNTRY_CODE,
      );
      setOverwriteContestSetupAndResults(isEditingActiveContest);
    } else {
      setName(settings.contestName);
      setYear(Number(settings.contestYear));
      setHostingCountryCode(
        settings.hostingCountryCode || DEFAULT_HOSTING_COUNTRY_CODE,
      );
      setDescription(settings.contestDescription);
      setIsPublic(true);
    }
  }, [
    initialContest,
    settings.contestName,
    settings.contestYear,
    settings.hostingCountryCode,
    settings.contestDescription,
    isEditingActiveContest,
  ]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('widgets.contests.contestNameIsRequired'));

      return;
    }

    try {
      if (!user) {
        toast.error(t('widgets.contests.pleaseSignInToSaveContests'));

        return;
      }

      const snapshot = buildContestSnapshotFromStores();
      const themeId = customTheme?._id;
      const standardThemeId = themeYear;

      let contest: Contest;

      if (isEditMode) {
        contest = await updateContest({
          id: initialContest._id,
          year,
          name: name.trim(),
          description: description.trim() || undefined,
          isPublic,
          hostingCountryCode,
          ...(themeId
            ? { themeId }
            : { ...(standardThemeId ? { standardThemeId } : {}) }),
          ...(!overwriteContestSetupAndResults ? {} : { snapshot }),
        });

        toast.success(t('widgets.contests.contestUpdatedSuccessfully'));
      } else {
        contest = await createContest({
          name: name.trim(),
          year,
          description: description.trim() || undefined,
          isPublic,
          hostingCountryCode,
          ...(themeId
            ? { themeId }
            : { ...(standardThemeId ? { standardThemeId } : {}) }),
          snapshot,
        });

        toast.success(t('widgets.contests.contestCreatedSuccessfully'));
      }

      if (!isEditMode || activeContest?._id === contest._id) {
        // Set as active contest (immediate)
        useGeneralStore.getState().setActiveContest(contest);

        // Save to profile (sync across devices)
        if (user) {
          await applyContestToProfile(contest._id);
        }

        // Apply snapshot to stores
        await applyContestSnapshotToStores(
          snapshot,
          contest,
          !overwriteContestSetupAndResults,
        );
      }

      onClose();
    } catch (error: any) {
      toastAxiosError(error, t('widgets.contests.failedToSaveContest'));
    }
  };

  const isSaving = isCreating || isUpdating;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,500px)]"
      overlayClassName="!z-[1002]"
      bottomContent={
        <ModalBottomContent
          onClose={onClose}
          onSave={handleSave}
          isSaving={isSaving}
        />
      }
    >
      <h2 className="text-xl font-bold text-white">
        {t(
          isEditMode
            ? 'widgets.contests.editContest'
            : 'widgets.contests.createContest',
        )}
      </h2>
      <div className="flex flex-col gap-2 mt-2">
        {isEditMode && (
          <div className="flex items-start gap-2 w-full text-white">
            <Tooltip
              content={
                <div className="font-medium">
                  <p>
                    {t(
                      'widgets.contests.overwriteContestSetupAndResultsTooltip',
                    )}
                  </p>
                </div>
              }
              position="left"
            />
            <Checkbox
              id="overwriteContestSetupAndResults"
              label={t('widgets.contests.overwriteContestSetupAndResults')}
              labelClassName="w-full !px-0 !pt-1 !items-start"
              className="w-full"
              checked={overwriteContestSetupAndResults}
              onChange={(e) =>
                setOverwriteContestSetupAndResults(e.target.checked)
              }
            />
          </div>
        )}
        <InputField
          label={t('common.name')}
          id="contestName"
          inputProps={{
            value: name,
            onChange: (e) => setName(e.target.value),
          }}
          placeholder={t('widgets.contests.enterContestName')}
          className="w-full"
        />
        <div className="flex gap-2">
          <div className="flex flex-col gap-2 w-full">
            <label htmlFor="hosting-country-select-box" className="font-medium">
              {t('widgets.contests.hostingCountry')}
            </label>
            <CustomSelect
              options={hostingCountryOptions}
              value={hostingCountryCode || DEFAULT_HOSTING_COUNTRY_CODE}
              onChange={(value) => setHostingCountryCode(value)}
              id="hosting-country-select-box"
              getImageClassName={(option) =>
                option.isExisting ? 'w-8 h-8 !object-contain' : 'w-8 h-6'
              }
              selectClassName="!shadow-none"
            />
          </div>
          <InputField
            label={t('common.year')}
            id="contestYear"
            inputProps={{
              value: year,
              onChange: (e) => setYear(Number(e.target.value)),
              className: 'pr-3',
              min: 1,
            }}
            className="min-w-[100px]"
            type="number"
          />
        </div>

        <TextareaField
          id="contestDesc"
          label={t('common.description')}
          placeholder={t('common.optionalDescription')}
          textareaProps={{
            value: description,
            onChange: (e) => setDescription(e.target.value),
          }}
        />

        <Checkbox
          id="isPublic"
          label={t('widgets.contests.makeContestPublic')}
          labelClassName="w-full !items-start"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
      </div>
    </Modal>
  );
};

export default CreateContestModal;
