import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { VoterChannelsPausedNote } from '../event-stage/VoterChannelsPausedNote';
import VotersCountriesSearch from '../event-stage/VotersCountriesSearch';
import VotersList from '../event-stage/VotersList';
import VotersSelectionHeader from '../event-stage/VotersSelectionHeader';

import {
  usePostSetupFormContext,
  useWatchVoterChannels,
  useWatchVotingCountries,
} from './hooks/usePostSetupStageForm';

import {
  BaseCountry,
  EventStage,
  StageId,
  StageVotingMode,
  VoterChannelMode,
  VotingCountry,
} from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import {
  countVotersByChannel,
  normalizeVoterChannels,
} from '@/state/scoreboard/voterChannels';

const mapToVotingCountry = (country: BaseCountry) => ({
  code: country.code,
  name: country.name,
  flag: country.flag,
});

interface EventStageVotersProps {
  className?: string;
  stage: EventStage;
  /** The mode currently chosen on the General tab (may differ from `stage.votingMode`). */
  votingMode?: StageVotingMode;
  onLoaded?: () => void;
}

const EventStageVoters: React.FC<EventStageVotersProps> = ({
  stage,
  votingMode = stage.votingMode,
  onLoaded,
}) => {
  const form = usePostSetupFormContext();
  const votingCountries = useWatchVotingCountries(form);
  // Per-voter channel overrides live in the form store (the modal's error bar
  // resets them too), so there is a single source of truth.
  const voterChannels = useWatchVoterChannels(form);

  // Transient view state: the J / T toggles are hidden again next time the
  // modal opens, so regular users never meet them twice.
  const [showChannelControls, setShowChannelControls] = useState(false);

  const isJuryAndTelevote = votingMode === StageVotingMode.JURY_AND_TELEVOTE;

  const votingCountriesRef = useRef<VotingCountry[]>(votingCountries || []);

  useEffect(() => {
    votingCountriesRef.current = votingCountries || [];
  }, [votingCountries]);

  const [localVotingCountries, setLocalVotingCountries] = useState<
    VotingCountry[]
  >(votingCountries || []);

  const getInitialVotingCountries = useCountriesStore(
    (state) => state.getInitialVotingCountries,
  );

  const getContestParticipants = useCountriesStore(
    (state) => state.getContestParticipants,
  );

  const participatingVoters = useMemo(
    () => stage.countries.map(mapToVotingCountry),
    [stage.countries],
  );

  const initialVotingCountries = getInitialVotingCountries(stage.id);

  // Helper to update both local state and form value without causing loops
  const setLocalVotingCountriesAndForm: React.Dispatch<
    React.SetStateAction<BaseCountry[]>
  > = useCallback(
    (updater) => {
      setLocalVotingCountries((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (prev: BaseCountry[]) => BaseCountry[])(prev)
            : updater;

        // Keep form value in sync when local changes
        form.setVotingCountries(next as VotingCountry[]);

        return next;
      });
    },
    [setLocalVotingCountries, form],
  );

  const handleChannelModeChange = useCallback(
    (code: string, mode: VoterChannelMode) => {
      form.setVoterChannels({
        ...(form.getVoterChannels() ?? {}),
        [code]: mode,
      });
    },
    [form],
  );

  const handleToggleChannelControls = useCallback(() => {
    setShowChannelControls((prev) => !prev);
  }, []);

  const handleAddVoter = (country: BaseCountry) => {
    if (!localVotingCountries.find((c) => c.code === country.code)) {
      setLocalVotingCountriesAndForm((prev) => [...prev, country]);
    }
  };

  // Reset list: voter order and channels reset.
  const handleReset = () => {
    setLocalVotingCountriesAndForm(participatingVoters);
    form.setVoterChannels(undefined);
  };

  const handleClearAll = () => {
    setLocalVotingCountriesAndForm([]);
  };

  const handleSort = (sort: 'az' | 'za' | 'shuffle') => {
    let sortedCountries = [...localVotingCountries];

    if (sort === 'az') {
      sortedCountries = localVotingCountries.sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    } else if (sort === 'za') {
      sortedCountries = localVotingCountries.sort((a, b) =>
        b.name.localeCompare(a.name),
      );
    } else if (sort === 'shuffle') {
      sortedCountries = localVotingCountries.sort(() => Math.random() - 0.5);
    }

    setLocalVotingCountriesAndForm([...sortedCountries]);
  };

  const handleFilter = (
    action: 'inStage' | 'otherStage' | 'allParticipants' | 'yearData',
  ) => {
    if (action === 'yearData') {
      setLocalVotingCountriesAndForm(initialVotingCountries);
    } else if (action === 'inStage') {
      setLocalVotingCountriesAndForm(participatingVoters);
    } else {
      const contestParticipants =
        getContestParticipants().map(mapToVotingCountry);

      if (action === 'otherStage') {
        setLocalVotingCountriesAndForm(
          contestParticipants.filter(
            (c) => !participatingVoters.find((v) => v.code === c.code),
          ),
        );
      } else if (action === 'allParticipants') {
        setLocalVotingCountriesAndForm(contestParticipants);
      }
    }
  };

  const channelCounts = useMemo(
    () => countVotersByChannel(localVotingCountries, voterChannels),
    [localVotingCountries, voterChannels],
  );
  const hasCustomChannels = useMemo(
    () =>
      normalizeVoterChannels(localVotingCountries, voterChannels) !== undefined,
    [localVotingCountries, voterChannels],
  );

  // Load existing voting countries for this stage
  const initializedForStageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (initializedForStageIdRef.current === stage.id) return;
    initializedForStageIdRef.current = stage.id;

    const existing =
      (stage.votingCountries && stage.votingCountries.length > 0
        ? stage.votingCountries
        : votingCountriesRef.current) || [];

    const setInitial = (list: VotingCountry[]) => {
      setLocalVotingCountries(list);
      form.setVotingCountries(list);
      onLoaded?.();
    };

    if (existing.length > 0) {
      setInitial(existing as VotingCountry[]);

      return;
    }

    if (stage.id === StageId.GF) {
      const contestParticipants =
        getContestParticipants().map(mapToVotingCountry);

      setInitial(contestParticipants);

      return;
    }

    setInitial(participatingVoters);
  }, [
    getContestParticipants,
    onLoaded,
    participatingVoters,
    stage.id,
    stage.votingCountries,
    form,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="space-y-3">
          <VotersSelectionHeader
            onReset={handleReset}
            onClearAll={handleClearAll}
            onSort={handleSort}
            votersAmount={localVotingCountries.length}
            handleFilter={handleFilter}
            disableLoadYearData={initialVotingCountries.length <= 1}
            channelCounts={isJuryAndTelevote ? channelCounts : undefined}
            showChannelControls={isJuryAndTelevote && showChannelControls}
            onToggleChannelControls={
              isJuryAndTelevote ? handleToggleChannelControls : undefined
            }
            note={
              !isJuryAndTelevote && hasCustomChannels ? (
                <VoterChannelsPausedNote votingMode={votingMode} />
              ) : undefined
            }
          />
          <VotersList
            localVotingCountries={localVotingCountries}
            setLocalVotingCountries={setLocalVotingCountriesAndForm}
            stageId={stage.id}
            voterChannels={voterChannels}
            showChannelControls={isJuryAndTelevote && showChannelControls}
            onChannelModeChange={
              isJuryAndTelevote ? handleChannelModeChange : undefined
            }
          />
        </div>
        <div className="h-px bg-primary-800 w-full my-4" />

        <VotersCountriesSearch
          localVotingCountries={localVotingCountries}
          onAddVoter={handleAddVoter}
          stageId={stage.id}
        />
      </div>
    </div>
  );
};

export default EventStageVoters;
