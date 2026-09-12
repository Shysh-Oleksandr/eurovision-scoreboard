import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';

import {
  StageId,
  type EventStage,
  type VoterChannels,
  type VotingCountry,
} from '../../../../models';
import { useCountriesStore } from '../../../../state/countriesStore';

/**
 * Minimal external-store "form" for the post-setup modal.
 *
 * This replaces the previous react-hook-form + zod setup: the form holds a
 * single always-valid array value, so the two libraries only added ~270 KB to
 * the chunk fetched on the ПОЧАТИ tap. Keeping the value outside React state
 * preserves RHF's update granularity — only subscribed components re-render
 * when voters change, the modal itself does not.
 */
export interface PostSetupStageForm {
  getVotingCountries: () => VotingCountry[];
  setVotingCountries: (next: VotingCountry[]) => void;
  getVoterChannels: () => VoterChannels | undefined;
  setVoterChannels: (next: VoterChannels | undefined) => void;
  subscribe: (listener: () => void) => () => void;
}

const createFormStore = (): PostSetupStageForm => {
  let value: VotingCountry[] = [];
  let voterChannels: VoterChannels | undefined;
  const listeners = new Set<() => void>();

  return {
    getVotingCountries: () => value,
    setVotingCountries: (next) => {
      value = next;
      listeners.forEach((listener) => listener());
    },
    getVoterChannels: () => voterChannels,
    setVoterChannels: (next) => {
      voterChannels = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

export const PostSetupFormContext = createContext<PostSetupStageForm | null>(
  null,
);

export const usePostSetupFormContext = (): PostSetupStageForm => {
  const form = useContext(PostSetupFormContext);

  if (!form) {
    throw new Error(
      'usePostSetupFormContext must be used within a PostSetupFormContext provider',
    );
  }

  return form;
};

export const useWatchVotingCountries = (
  form: PostSetupStageForm,
): VotingCountry[] =>
  useSyncExternalStore(
    form.subscribe,
    form.getVotingCountries,
    form.getVotingCountries,
  );

export const useWatchVoterChannels = (
  form: PostSetupStageForm,
): VoterChannels | undefined =>
  useSyncExternalStore(
    form.subscribe,
    form.getVoterChannels,
    form.getVoterChannels,
  );

interface UsePostSetupStageFormProps {
  stage?: EventStage;
  isOpen: boolean;
}

export const usePostSetupStageForm = ({
  stage,
  isOpen,
}: UsePostSetupStageFormProps): PostSetupStageForm => {
  const form = useMemo(createFormStore, []);

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

    form.setVotingCountries(getDefaultVotingCountries());
    form.setVoterChannels(stage?.voterChannels);
  }, [stage, isOpen, form]);

  return form;
};
