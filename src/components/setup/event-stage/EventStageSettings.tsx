import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useId } from 'react';
import { useFormContext } from 'react-hook-form';

import { EventStage, StageVotingMode } from '../../../models';
import {
  Field,
  FieldError,
  INPUT_CLASS,
} from '../widgets-section/contests/dialogFields';

import QualifierTargetsSection from './QualifierTargetsSection';

const VOTING_MODES = [
  StageVotingMode.JURY_AND_TELEVOTE,
  StageVotingMode.TELEVOTE_ONLY,
  StageVotingMode.JURY_ONLY,
  StageVotingMode.COMBINED,
] as const;

const VOTING_MODE_LABEL_KEYS = {
  [StageVotingMode.JURY_AND_TELEVOTE]: 'juryAndTelevote',
  [StageVotingMode.TELEVOTE_ONLY]: 'televoteOnly',
  [StageVotingMode.JURY_ONLY]: 'juryOnly',
  [StageVotingMode.COMBINED]: 'combined',
} as const;

interface EventStageSettingsProps {
  isEditMode: boolean;
  isLastStage: boolean;
  eventStageToEdit?: EventStage;
  titleId: string;
}

const EventStageSettings: React.FC<EventStageSettingsProps> = ({
  isEditMode,
  isLastStage,
  eventStageToEdit,
  titleId,
}) => {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext();

  const t = useTranslations('setup.eventStageModal');
  const tCommon = useTranslations('common');
  const ids = useId();
  const nameId = `${ids}-name`;
  const votingId = `${ids}-voting`;
  const votingHintId = `${ids}-voting-hint`;

  const votingMode =
    (watch('votingMode') as StageVotingMode) ??
    StageVotingMode.JURY_AND_TELEVOTE;
  const votingLabel = (mode: StageVotingMode) =>
    t(VOTING_MODE_LABEL_KEYS[mode] ?? 'juryAndTelevote');

  return (
    <div className="flex flex-col">
      <h2
        id={titleId}
        className="m-0 text-[20px] font-extrabold leading-[1.25] tracking-[-.02em] text-balance"
      >
        {isEditMode ? t('editStage') : t('addStage')}
      </h2>

      <div className="mt-4 flex flex-col gap-2.5">
        <Field label={tCommon('name')} htmlFor={nameId} invalid={!!errors.name}>
          <input
            id={nameId}
            type="text"
            {...register('name')}
            autoComplete="off"
            autoFocus={!isEditMode}
            placeholder={t('stageNamePlaceholder')}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
            className={INPUT_CLASS}
          />
        </Field>
        {errors.name && (
          <FieldError id={`${nameId}-error`}>{t('nameRequired')}</FieldError>
        )}

        <div>
          {/* The native select covers the well: the OS picker on phones,
              arrow keys and type-ahead on desktop. */}
          <label
            htmlFor={votingId}
            className="dp-field relative flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl px-3 py-1.5"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="text-[12px] font-semibold leading-none text-white/75">
                {t('votingMode')}
              </span>
              <span className="truncate text-[16px] font-bold leading-[1.3] md:text-[14.5px]">
                {votingLabel(votingMode)}
              </span>
            </span>
            <ChevronDown
              className="size-[18px] flex-none text-white/75"
              aria-hidden="true"
            />
            <select
              id={votingId}
              value={votingMode}
              onChange={(e) =>
                setValue('votingMode', e.target.value as StageVotingMode)
              }
              aria-label={t('votingMode')}
              aria-describedby={votingHintId}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            >
              {VOTING_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {votingLabel(mode)}
                </option>
              ))}
            </select>
          </label>
          <p
            id={votingHintId}
            className="mt-1.5 px-1 text-[12.5px] font-semibold leading-[1.4] text-white/75 text-pretty"
          >
            {t(`votingModeHint.${votingMode}`)}
          </p>
        </div>
      </div>

      {isLastStage ? (
        <p className="mt-6 px-1 text-[13px] font-semibold leading-[1.45] text-white/80 text-pretty">
          {t('lastStageNote')}
        </p>
      ) : (
        <QualifierTargetsSection
          isEditMode={isEditMode}
          eventStageToEdit={eventStageToEdit}
        />
      )}
    </div>
  );
};

export default EventStageSettings;
