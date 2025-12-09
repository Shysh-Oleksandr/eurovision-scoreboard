import { useState } from 'react';

import {
  CountryAssignmentGroup,
  EventStage,
} from '@/models';
import { useCountriesStore } from '@/state/countriesStore';

interface UseStageModalActionsProps {
  allAssignments: Record<string, string>;
  setAssignments: (assignments: Record<string, string>) => void;
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
      // Update existing stage
      setConfiguredEventStages(
        configuredEventStages.map((s) =>
          s.id === stage.id ? { ...s, ...stage } : s,
        ),
      );
    } else {
      // Append new stage to the end with order = minOrder - 1
      const minOrder =
        configuredEventStages.length > 0
          ? Math.min(...configuredEventStages.map((s) => s.order ?? 0))
          : 0;

      const newStage: EventStage = {
        ...stage,
        order: minOrder - 1,
        countries: [],
        isOver: false,
        isJuryVoting: false,
      };

      setConfiguredEventStages([newStage, ...configuredEventStages]);
    }
  };

  const handleDeleteStage = (stageId: string) => {
    const remainingStages = configuredEventStages.filter(
      (s) => s.id !== stageId,
    );

    // Remove the stage from qualifiesTo of all other stages
    const updatedStages = remainingStages.map((s) => ({
      ...s,
      qualifiesTo: s.qualifiesTo?.filter((q) => q.targetStageId !== stageId),
    }));

    setConfiguredEventStages(updatedStages);

    // Update assignments: move countries from deleted stage to NOT_PARTICIPATING
    const newAssignments = { ...allAssignments };

    for (const countryCode in newAssignments) {
      if (newAssignments[countryCode] === stageId) {
        newAssignments[countryCode] =
          CountryAssignmentGroup.NOT_PARTICIPATING;
      }
    }

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
