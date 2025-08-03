import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';

import { EventStage, StageId, StageVotingMode } from '../../../../models';

// Base schema for common fields
const baseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  votingMode: z.enum(Object.values(StageVotingMode) as [string, ...string[]]),
  votingCountries: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
      }),
    )
    .optional(),
});

// Schema for Grand Final (no qualifiersAmount)
const grandFinalSchema = baseSchema.extend({
  qualifiersAmount: z.number().optional(),
});

// Schema for Semi-Finals (qualifiersAmount required)
const semiFinalSchema = baseSchema.extend({
  qualifiersAmount: z
    .number()
    .min(1, 'Number of qualifiers must be at least 1'),
});

type GrandFinalFormData = z.infer<typeof grandFinalSchema>;
type SemiFinalFormData = z.infer<typeof semiFinalSchema>;
export type EventStageFormData = GrandFinalFormData | SemiFinalFormData;

interface UseEventStageFormProps {
  eventStageToEdit?: EventStage;
  localEventStagesLength: number;
  isOpen: boolean;
}

export const useEventStageForm = ({
  eventStageToEdit,
  localEventStagesLength,
  isOpen,
}: UseEventStageFormProps) => {
  const isEditMode = !!eventStageToEdit;
  const isGrandFinalStage = eventStageToEdit?.id === StageId.GF;

  // Create separate form instances based on stage type
  const grandFinalForm = useForm<GrandFinalFormData>({
    resolver: zodResolver(grandFinalSchema),
    defaultValues: {
      name: '',
      qualifiersAmount: undefined,
      votingMode: StageVotingMode.TELEVOTE_ONLY,
      votingCountries: [],
    },
  });

  const semiFinalForm = useForm<SemiFinalFormData>({
    resolver: zodResolver(semiFinalSchema),
    defaultValues: {
      name: '',
      qualifiersAmount: 10,
      votingMode: StageVotingMode.TELEVOTE_ONLY,
      votingCountries: [],
    },
  });

  const form = isGrandFinalStage ? grandFinalForm : semiFinalForm;

  // Reset form when modal opens or eventStageToEdit changes
  React.useEffect(() => {
    if (isOpen) {
      if (eventStageToEdit) {
        form.reset({
          name: eventStageToEdit.name,
          qualifiersAmount:
            eventStageToEdit.qualifiersAmount ||
            (isGrandFinalStage ? undefined : 0),
          votingMode: eventStageToEdit.votingMode,
          votingCountries: eventStageToEdit.votingCountries || [],
        });
      } else {
        form.reset({
          name: `Semi-Final ${localEventStagesLength}`,
          qualifiersAmount: isGrandFinalStage ? undefined : 10,
          votingMode: StageVotingMode.TELEVOTE_ONLY,
          votingCountries: [],
        });
      }
    }
  }, [
    eventStageToEdit,
    isOpen,
    localEventStagesLength,
    form,
    isGrandFinalStage,
  ]);

  const onSubmit = (data: EventStageFormData) => {
    return {
      id: eventStageToEdit?.id || new Date().toISOString(),
      name: data.name,
      qualifiersAmount: data.qualifiersAmount,
      votingMode: data.votingMode,
      votingCountries: data.votingCountries || [],
    };
  };

  return {
    form,
    onSubmit,
    isEditMode,
    isGrandFinalStage,
  };
};
