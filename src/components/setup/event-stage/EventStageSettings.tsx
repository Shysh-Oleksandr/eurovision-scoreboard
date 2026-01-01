import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import { EventStage, StageVotingMode } from '../../../models';
import Select from '../../common/Select';
import { Input } from '../../Input';

import QualifierTargetsSection from './QualifierTargetsSection';

const getVotingModeLabel = (votingMode: StageVotingMode, t: any) => {
  switch (votingMode) {
    case StageVotingMode.TELEVOTE_ONLY:
      return t('setup.eventStageModal.televoteOnly');
    case StageVotingMode.JURY_ONLY:
      return t('setup.eventStageModal.juryOnly');
    case StageVotingMode.COMBINED:
      return t('setup.eventStageModal.combined');
    case StageVotingMode.JURY_AND_TELEVOTE:
    default:
      return t('setup.eventStageModal.juryAndTelevote');
  }
};

interface EventStageSettingsProps {
  isEditMode: boolean;
  isLastStage: boolean;
  eventStageToEdit?: EventStage;
}

const EventStageSettings: React.FC<EventStageSettingsProps> = ({
  isEditMode,
  isLastStage,
  eventStageToEdit,
}) => {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();

  const t = useTranslations();
  const votingMode = watch('votingMode');

  const votingModeOptions = useMemo(() => {
    return Object.values(StageVotingMode).map((mode) => ({
      label: getVotingModeLabel(mode, t as any),
      value: mode,
    }));
  }, [t]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-white">
        {t(
          isEditMode
            ? 'setup.eventStageModal.editStage'
            : 'setup.eventStageModal.addStage',
        )}
      </h2>
      <div className="flex flex-col gap-2">
        <label htmlFor="stageName" className="text-white">
          {t('common.name')}
        </label>
        <Input
          id="stageName"
          type="text"
          {...register('name')}
          className="h-12 lg:text-[0.95rem] text-sm"
          placeholder={t('setup.eventStageModal.stageNamePlaceholder')}
          autoFocus={!isEditMode}
        />
        {errors.name && (
          <span className="text-red-400 text-sm">
            {errors.name.message as string}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="votingMode" className="text-white">
          {t('setup.eventStageModal.votingMode')}
        </label>
        <Select
          id="votingMode"
          value={votingMode}
          onChange={(e) =>
            setValue('votingMode', e.target.value as StageVotingMode)
          }
          aria-label="Select voting mode"
          options={votingModeOptions}
          className="w-full h-12 py-2.5 pl-3 pr-4 bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/60 lg:text-[0.95rem] text-sm hover:bg-primary-800"
          arrowClassName="!w-6 !h-6"
        >
          <span className="flex-1">
            {getVotingModeLabel(votingMode, t as any)}
          </span>
        </Select>
      </div>
      {!isLastStage && (
        <QualifierTargetsSection
          isEditMode={isEditMode}
          eventStageToEdit={eventStageToEdit}
        />
      )}
    </div>
  );
};

export default EventStageSettings;
