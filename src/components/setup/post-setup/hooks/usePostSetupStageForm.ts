import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';

import { EventStage } from '../../../../models';

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

    form.reset(
      {
        votingCountries: stage?.votingCountries || [],
      },
      { keepDefaultValues: false },
    );
  }, [stage, isOpen, form]);

  return form;
};
