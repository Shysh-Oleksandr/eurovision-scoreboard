import React, { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import { EventStage, StageVotingMode } from '../../../models';
import Select from '../../common/Select';
import { Input } from '../../Input';

const getVotingModeLabel = (votingMode: StageVotingMode) => {
  switch (votingMode) {
    case StageVotingMode.TELEVOTE_ONLY:
      return 'Televote Only';
    case StageVotingMode.JURY_ONLY:
      return 'Jury Only';
    case StageVotingMode.COMBINED:
      return 'Combined';
    case StageVotingMode.JURY_AND_TELEVOTE:
    default:
      return 'Jury and Televote';
  }
};

interface EventStageSettingsProps {
  eventStageToEdit?: EventStage;
  isEditMode: boolean;
  isGrandFinalStage: boolean;
}

const EventStageSettings: React.FC<EventStageSettingsProps> = ({
  eventStageToEdit,
  isEditMode,
  isGrandFinalStage,
}) => {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();
  const votingMode = watch('votingMode');

  const votingModeOptions = useMemo(() => {
    return Object.values(StageVotingMode).map((mode) => ({
      label: getVotingModeLabel(mode),
      value: mode,
    }));
  }, []);

  return (
    <div className="flex flex-col gap-4 p-2">
      <h2 className="text-xl font-bold text-white">
        {isEditMode ? 'Edit' : 'Add'}{' '}
        {isGrandFinalStage ? 'Grand Final' : 'Semi-Final'}
      </h2>
      <div className="flex flex-col gap-2">
        <label htmlFor="stageName" className="text-white">
          Name
        </label>
        <Input
          id="stageName"
          type="text"
          {...register('name')}
          className="h-12 lg:text-[0.95rem] text-sm"
          placeholder="Enter name..."
        />
        {errors.name && (
          <span className="text-red-400 text-sm">
            {errors.name.message as string}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="votingMode" className="text-white">
          Voting Mode
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
          <span className="flex-1">{getVotingModeLabel(votingMode)}</span>
        </Select>
      </div>
      {!isGrandFinalStage && (
        <>
          <div className="flex items-center gap-2">
            <label
              htmlFor={`qualifiers-${eventStageToEdit?.id}`}
              className="block text-base text-white"
            >
              Number of qualifiers:
            </label>
            <Input
              id={`qualifiers-${eventStageToEdit?.id}`}
              type="number"
              {...register('qualifiersAmount', { valueAsNumber: true })}
              className="bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/40 shadow-sm !px-3 !py-2 hover:bg-primary-950 focus:bg-primary-950 !w-[64px]"
              min={0}
              max={eventStageToEdit?.countries.length}
              aria-label={`Number of qualifiers for ${eventStageToEdit?.name}`}
            />
          </div>
          {errors.qualifiersAmount && (
            <span className="text-red-400 text-sm block pt-1">
              {errors.qualifiersAmount.message as string}
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default EventStageSettings;
