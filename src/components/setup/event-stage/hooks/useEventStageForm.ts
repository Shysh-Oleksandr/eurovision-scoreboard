import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';

import { useCountriesStore } from '@/state/countriesStore';
import {
  EventStage,
  QualifierTarget,
  StageVotingMode,
} from '../../../../models';

// Schema for qualifier target
const qualifierTargetSchema = z.object({
  targetStageId: z.string().min(1, 'Target stage is required'),
  amount: z.number().min(1, 'Amount must be at least 1'),
});

// Base schema for common fields
const eventStageSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  order: z.number().int(),
  votingMode: z.enum(Object.values(StageVotingMode)),
  qualifiesTo: z.array(qualifierTargetSchema).optional(),
});

export type EventStageFormData = z.infer<typeof eventStageSchema>;

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
  const configuredEventStages = useCountriesStore(
    (state) => state.configuredEventStages,
  );

  // Determine if this is the last stage (highest order)
  const isLastStage: boolean = useMemo(() => {
    if (!eventStageToEdit) return false;
    if (configuredEventStages.length === 0) return false;

    const maxOrder = Math.max(
      ...configuredEventStages.map((s) => s.order ?? 0),
    );
    return (eventStageToEdit.order ?? 0) === maxOrder;
  }, [eventStageToEdit, configuredEventStages]);

  const getDefaultOrder = () => {
    if (eventStageToEdit) {
      return eventStageToEdit.order ?? 0;
    }

    const minOrder = Math.min(
      ...configuredEventStages.map((s) => s.order ?? 0),
    );
    return minOrder - 1;
  };

  const form = useForm<EventStageFormData>({
    resolver: zodResolver(eventStageSchema),
    defaultValues: {
      name: '',
      order: getDefaultOrder(),
      votingMode: StageVotingMode.TELEVOTE_ONLY,
      qualifiesTo: [],
    },
  });

  // Reset form when modal opens or eventStageToEdit changes
  useEffect(() => {
    if (!isOpen) return;

    if (eventStageToEdit) {
      form.reset(
        {
          name: eventStageToEdit.name,
          order: eventStageToEdit.order ?? 0,
          votingMode: eventStageToEdit.votingMode,
          qualifiesTo: (eventStageToEdit.qualifiesTo as any) || [],
        },
        { keepDefaultValues: false },
      );
    } else {
      // When creating a new stage, initialize qualifiesTo with the last stage
      // Default: 10 qualifiers for the last stage (highest order)
      // Only include entries with amount > 0 to satisfy validation
      const sortedStages = [...configuredEventStages].sort(
        (a, b) => (b.order ?? 0) - (a.order ?? 0),
      );
      const lastStage = sortedStages[0];
      const defaultQualifiesTo: QualifierTarget[] = lastStage
        ? [
            {
              targetStageId: lastStage.id,
              amount: 10,
            },
          ]
        : [];

      form.reset(
        {
          name: `Stage ${localEventStagesLength + 1}`,
          order: getDefaultOrder(),
          votingMode: StageVotingMode.TELEVOTE_ONLY,
          qualifiesTo: defaultQualifiesTo,
        },
        { keepDefaultValues: false },
      );
    }
  }, [eventStageToEdit, isOpen, localEventStagesLength, form]);

  const onSubmit = (data: EventStageFormData) => {
    // Filter out entries with amount <= 0 to satisfy validation
    const validQualifiesTo = (data.qualifiesTo || []).filter(
      (target) => target.amount > 0,
    );

    return {
      id: eventStageToEdit?.id || new Date().toISOString(),
      name: data.name,
      order: data.order,
      qualifiesTo: validQualifiesTo,
      votingMode: data.votingMode,
    };
  };

  return {
    form,
    onSubmit,
    isEditMode,
    isLastStage,
    configuredEventStages,
  };
};
