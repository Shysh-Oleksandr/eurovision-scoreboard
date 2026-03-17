import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';

import { StageId, type EventStage, type VotingCountry } from '../../../../models';
import { useCountriesStore } from '../../../../state/countriesStore';

// Base schema for common fields
const postSetupStageSchema = z.object({
  votingCountries: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      flag: z.string().optional(),
    }),
  ),
});

export type PostSetupStageFormData = z.infer<typeof postSetupStageSchema>;

interface UsePostSetupStageFormProps {
  stage?: EventStage;
  isOpen: boolean;
}

export const usePostSetupStageForm = ({
  stage,
  isOpen,
}: UsePostSetupStageFormProps) => {
  const form = useForm<PostSetupStageFormData>({
    resolver: zodResolver(postSetupStageSchema),
    defaultValues: {
      votingCountries: [],
    },
  });

  // Reset form when modal opens or stage changes
  useEffect(() => {
    if (!isOpen) return;

    const getDefaultVotingCountries = (): VotingCountry[] => {
      if (!stage) return [];

      if (stage.votingCountries && stage.votingCountries.length > 0) {
        return stage.votingCountries;
      }

      if (stage.id?.toUpperCase() === StageId.GF.toUpperCase()) {
        return useCountriesStore
          .getState()
          .getContestParticipants()
          .map((c) => ({
            code: c.code,
            name: c.name,
            ...(c.flag ? { flag: c.flag } : {}),
          }));
      }

      // Semi-finals/other stages default: stage participants vote
      return (stage.countries || []).map((c) => ({
        code: c.code,
        name: c.name,
        ...(c.flag ? { flag: c.flag } : {}),
      }));
    };

    form.reset(
      {
        votingCountries: getDefaultVotingCountries(),
      },
      { keepDefaultValues: false },
    );
  }, [stage, isOpen, form]);

  return form;
};
