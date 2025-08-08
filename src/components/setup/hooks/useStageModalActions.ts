import { useState } from 'react';

import {
  CountryAssignmentGroup,
  EventMode,
  EventStage,
  StageId,
} from '@/models';
import { useCountriesStore } from '@/state/countriesStore';

interface UseStageModalActionsProps {
  allAssignments: Record<EventMode, Record<string, string>>;
  setAssignments: (
    assignments: Record<EventMode, Record<string, string>>,
  ) => void;
}

export const useStageModalActions = ({
  allAssignments,
  setAssignments,
}: UseStageModalActionsProps) => {
  const [isEventStageModalOpen, setEventStageModalOpen] = useState(false);
  const [eventStageToEdit, setEventStageToEdit] = useState<
    EventStage | undefined
  >(undefined);

  const configuredEventStages = useCountriesStore(
    (state) => state.configuredEventStages,
  );
  const setConfiguredEventStages = useCountriesStore(
    (state) => state.setConfiguredEventStages,
  );
  const activeTab = useCountriesStore((state) => state.activeMode);

  const handleOpenCreateEventStageModal = () => {
    setEventStageToEdit(undefined);
    setEventStageModalOpen(true);
  };

  const handleOpenEditEventStageModal = (stage: EventStage) => {
    setEventStageToEdit(stage);
    setEventStageModalOpen(true);
  };

  const handleCloseEventStageModal = () => {
    setEventStageModalOpen(false);
  };

  const handleSaveStage = (
    stage: Omit<EventStage, 'countries' | 'isOver' | 'isJuryVoting'>,
  ) => {
    const isEditing = configuredEventStages.some((s) => s.id === stage.id);

    if (isEditing) {
      setConfiguredEventStages(
        configuredEventStages.map((s) =>
          s.id === stage.id ? { ...s, ...stage } : s,
        ),
      );
    } else {
      const newStage: EventStage = {
        ...stage,
        countries: [],
        isOver: false,
        isJuryVoting: false,
        syncVotersWithParticipants: true, // Default to true
      };
      const grandFinalStage = configuredEventStages.find(
        (s) => s.id === StageId.GF,
      );
      const semiFinalStages = configuredEventStages.filter(
        (s) => s.id !== StageId.GF,
      );

      const newStages = [...semiFinalStages, newStage];

      if (grandFinalStage) {
        newStages.push(grandFinalStage);
      }

      setConfiguredEventStages(newStages);
    }
  };

  const handleDeleteStage = (stageId: string) => {
    setConfiguredEventStages(
      configuredEventStages.filter((s) => s.id !== stageId),
    );

    const newAssignments = { ...allAssignments };
    const updatedTabAssignments = { ...newAssignments[activeTab] };

    for (const countryCode in updatedTabAssignments) {
      if (updatedTabAssignments[countryCode] === stageId) {
        updatedTabAssignments[countryCode] =
          CountryAssignmentGroup.NOT_PARTICIPATING;
      }
    }

    newAssignments[activeTab] = updatedTabAssignments;
    setAssignments(newAssignments);
  };

  return {
    isEventStageModalOpen,
    eventStageToEdit,
    handleOpenCreateEventStageModal,
    handleOpenEditEventStageModal,
    handleCloseEventStageModal,
    handleSaveStage,
    handleDeleteStage,
  };
};
