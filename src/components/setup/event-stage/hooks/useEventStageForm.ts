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
  minRank: z.number().optional(),
  maxRank: z.number().optional(),
}).refine((data) => {
  // If one rank is provided, both must be provided
  if ((data.minRank && !data.maxRank) || (!data.minRank && data.maxRank)) {
    return false;
  }
  // If both ranks are provided, validate they make sense
  if (data.minRank && data.maxRank) {
    return data.minRank >= 1 && data.maxRank >= data.minRank;
  }
  return true;
}, {
  message: 'Invalid rank range. Both min and max rank must be provided and min rank must be less than or equal to max rank.',
  path: ['minRank'],
});

// Base schema for common fields
const eventStageSchema = z.object({
  id: z.string().min(1, 'Id is required'),
  name: z.string().min(1, 'Name is required'),
  order: z.number().int(),
  votingMode: z.enum(Object.values(StageVotingMode)),
  qualifiesTo: z.array(qualifierTargetSchema).optional(),
  eventsOrder: z.array(z.string()),
}).refine((data) => {
  const qualifiesTo = data.qualifiesTo || [];

  // Check if using rank-based qualification
  const hasRankBased = qualifiesTo.some(target => target.minRank && target.maxRank);

  if (!hasRankBased) {
    // Amount-based validation is handled elsewhere
    return true;
  }

  // Validate rank-based qualification
  const ranges = qualifiesTo
    .filter(target => target.minRank && target.maxRank)
    .map(target => ({
      minRank: target.minRank!,
      maxRank: target.maxRank!,
      targetStageId: target.targetStageId,
    }))
    .sort((a, b) => a.minRank - b.minRank);

  // Check for overlapping ranges
  for (let i = 0; i < ranges.length - 1; i++) {
    const current = ranges[i];
    const next = ranges[i + 1];

    if (current.maxRank >= next.minRank) {
      return false; // Overlapping ranges
    }
  }

  // Check for gaps (non-consecutive ranges)
  let expectedMinRank = 1;
  for (const range of ranges) {
    if (range.minRank !== expectedMinRank) {
      return false; // Gap in ranges
    }
    expectedMinRank = range.maxRank + 1;
  }

  return true;
}, {
  message: 'Rank ranges must not overlap and must cover consecutive positions starting from rank 1.',
  path: ['qualifiesTo'],
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
      id: new Date().toISOString(),
      name: '',
      order: getDefaultOrder(),
      votingMode: StageVotingMode.TELEVOTE_ONLY,
      qualifiesTo: [],
      eventsOrder: [],
    },
  });

  // Reset form when modal opens or eventStageToEdit changes
  useEffect(() => {
    if (!isOpen) return;

    const sortedStagesIds = [...configuredEventStages]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((s) => s.id);

    if (eventStageToEdit) {
      form.reset(
        {
          id: eventStageToEdit.id,
          name: eventStageToEdit.name,
          order: eventStageToEdit.order ?? 0,
          votingMode: eventStageToEdit.votingMode,
          qualifiesTo: (eventStageToEdit.qualifiesTo as any) || [],
          eventsOrder: sortedStagesIds,
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
          id: new Date().toISOString(),
          name: `Stage ${localEventStagesLength + 1}`,
          order: getDefaultOrder(),
          votingMode: StageVotingMode.TELEVOTE_ONLY,
          qualifiesTo: defaultQualifiesTo,
          eventsOrder: sortedStagesIds,
        },
        { keepDefaultValues: false },
      );
    }
  }, [eventStageToEdit, isOpen, localEventStagesLength, form]);

  const onSubmit = (data: EventStageFormData) => {
    // Process qualifiesTo based on whether it's rank-based or amount-based
    const validQualifiesTo = (data.qualifiesTo || [])
      .filter((target) => {
        // For rank-based, check if ranks are valid
        if (target.minRank && target.maxRank) {
          return target.minRank >= 1 && target.maxRank >= target.minRank;
        }
        // For amount-based, check amount
        return target.amount > 0;
      })
      .map((target) => {
        // For rank-based, update amount to match the range size
        if (target.minRank && target.maxRank) {
          return {
            ...target,
            amount: target.maxRank - target.minRank + 1,
          };
        }
        return target;
      });

    return {
      id: data.id,
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
