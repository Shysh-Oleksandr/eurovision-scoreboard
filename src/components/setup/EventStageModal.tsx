import React, { useEffect, useMemo, useState } from 'react';

import { EventStage, StageId, StageVotingMode } from '../../models';
import Modal from '../common/Modal/Modal';
import ModalBottomContent from '../common/Modal/ModalBottomContent';
import Select from '../common/Select';

const getVotingModeLabel = (votingMode: StageVotingMode) => {
  switch (votingMode) {
    case StageVotingMode.TELEVOTE_ONLY:
      return 'Televote Only';
    case StageVotingMode.JURY_ONLY:
      return 'Jury Only';
    case StageVotingMode.COMBINED:
      return 'Combined';
    // case StageVotingMode.PICK_QUALIFIERS:
    //   return 'Pick Qualifiers';
    case StageVotingMode.JURY_AND_TELEVOTE:
    default:
      return 'Jury and Televote';
  }
};

interface EventStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    stage: Omit<EventStage, 'countries' | 'isOver' | 'isJuryVoting'>,
  ) => void;
  onDelete: (stageId: string) => void;
  eventStageToEdit?: EventStage;
  localEventStagesLength: number;
}

const EventStageModal: React.FC<EventStageModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  eventStageToEdit,
  localEventStagesLength,
}) => {
  const isEditMode = !!eventStageToEdit;
  const [shouldClose, setShouldClose] = useState(false);
  const isGrandFinalStage = eventStageToEdit?.id === StageId.GF;

  const [name, setName] = useState('');
  const [qualifiersAmount, setQualifiersAmount] = useState<number>(10);
  const [votingMode, setVotingMode] = useState<StageVotingMode>(
    StageVotingMode.TELEVOTE_ONLY,
  );

  const votingModeOptions = useMemo(() => {
    return (
      Object.values(StageVotingMode)
        // .filter(
        //   () => !isGrandFinalStage, //|| mode !== StageVotingMode.PICK_QUALIFIERS,
        // )
        .map((mode) => ({
          label: getVotingModeLabel(mode),
          value: mode,
        }))
    );
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShouldClose(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (eventStageToEdit) {
      setName(eventStageToEdit.name);
      setQualifiersAmount(eventStageToEdit.qualifiersAmount || 0);
      setVotingMode(eventStageToEdit.votingMode);
    } else {
      setName(`Semi-Final ${localEventStagesLength}`);
      setQualifiersAmount(10);
      setVotingMode(StageVotingMode.TELEVOTE_ONLY);
    }
  }, [eventStageToEdit, isOpen, localEventStagesLength]);

  const handleTriggerClose = () => {
    setShouldClose(true);
  };

  const handleSave = () => {
    if (name.trim() === '') {
      alert('Stage name is required.');

      return;
    }

    onSave({
      id: eventStageToEdit?.id || new Date().toISOString(),
      name,
      qualifiersAmount,
      votingMode,
    });

    handleTriggerClose();
  };

  const handleDelete = () => {
    if (!eventStageToEdit) return;

    if (
      window.confirm(
        `Are you sure you want to delete ${eventStageToEdit.name}?`,
      )
    ) {
      onDelete(eventStageToEdit.id);
      handleTriggerClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen && !shouldClose}
      onClose={handleTriggerClose}
      onClosed={onClose}
      overlayClassName="!z-[1001]"
      containerClassName="!w-[min(100%,500px)]"
      bottomContent={
        <ModalBottomContent
          onClose={handleTriggerClose}
          onSave={handleSave}
          onDelete={isGrandFinalStage ? undefined : handleDelete}
        />
      }
    >
      <div className="flex flex-col gap-4 p-2">
        <h2 className="text-xl font-bold text-white">
          {isEditMode ? 'Edit' : 'Add'}{' '}
          {isGrandFinalStage ? 'Grand Final' : 'Semi-Final'}
        </h2>
        <div className="flex flex-col gap-2">
          <label htmlFor="stageName" className="text-white">
            Name
          </label>
          <input
            id="stageName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-12 py-3 pl-3 pr-10 rounded-md bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/60 transition-colors duration-300 placeholder:text-white/55 text-white lg:text-[0.95rem] text-sm border-solid border-transparent border-b-2 hover:bg-primary-800 focus:bg-primary-800 focus:border-white "
            placeholder="Enter name..."
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="votingMode" className="text-white">
            Voting Mode
          </label>
          <Select
            id="votingMode"
            value={votingMode}
            onChange={(e) => setVotingMode(e.target.value as StageVotingMode)}
            aria-label="Select voting mode"
            options={votingModeOptions}
            className="w-full h-12 py-2.5 pl-3 pr-4 bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/60 lg:text-[0.95rem] text-sm hover:bg-primary-800"
            selectClassName="select"
            arrowClassName="!w-6 !h-6"
          >
            <span className="flex-1">{getVotingModeLabel(votingMode)}</span>
          </Select>
        </div>
        {!isGrandFinalStage && (
          <div className="mb-2 flex items-center gap-2">
            <label
              htmlFor={`qualifiers-${eventStageToEdit?.id}`}
              className="block text-sm text-white"
            >
              Number of qualifiers:
            </label>
            <input
              id={`qualifiers-${eventStageToEdit?.id}`}
              type="number"
              value={qualifiersAmount || ''}
              onChange={(e) => {
                setQualifiersAmount(parseInt(e.target.value, 10));
              }}
              className="bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-900 to-primary-800/40 shadow-sm text-white px-3 py-1 rounded transition-colors duration-300 hover:bg-primary-950 focus:bg-primary-950 w-[56px]"
              min={0}
              max={eventStageToEdit?.countries.length}
              aria-label={`Number of qualifiers for ${eventStageToEdit?.name}`}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default EventStageModal;
