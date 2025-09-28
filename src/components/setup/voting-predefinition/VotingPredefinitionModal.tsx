import React from 'react';

import { useVotingPredefinition } from './useVotingPredefinition';
import { VotingPredefinitionHeader } from './VotingPredefinitionHeader';
import { VotingPredefinitionTable } from './VotingPredefinitionTable';

import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { BaseCountry, EventStage } from '@/models';

type VotingPredefinitionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  stage: Pick<EventStage, 'id' | 'name' | 'votingMode'> & {
    countries: (BaseCountry | any)[];
  };
  onSave: (votes: Partial<any>) => void;
  onLoaded?: () => void;
};

type CellKey = `${string}:${string}`; // participant:voter

const VotingPredefinitionModal = ({
  isOpen,
  onClose,
  stage,
  onSave,
  onLoaded,
}: VotingPredefinitionModalProps) => {
  const {
    pointsSystem,
    selectedType,
    setSelectedType,
    votes,
    isSorting,
    setIsSorting,
    totalBadgeLabel,
    isTotalOrCombinedVoteType,
    votingCountries,
    voteTypeOptions,
    rankedCountries,
    randomizeAll,
    resetVotes,
    applyInputValue,
    getVoterValidity,
    getTotalPointsForCountry,
    getCellValue,
    validateAllBeforeSave,
  } = useVotingPredefinition({ stage });

  const shouldShowHeartFlagIcon =
    (window as any)?.store?.general?.settings?.shouldShowHeartFlagIcon ?? false;

  const getCellClassName = (points: number) => {
    if (
      (!isTotalOrCombinedVoteType && points === 12) ||
      (isTotalOrCombinedVoteType && points >= 20)
    ) {
      return 'font-bold bg-primary-700/50';
    }

    if (
      (!isTotalOrCombinedVoteType && points === 10) ||
      (isTotalOrCombinedVoteType && points >= 17)
    ) {
      return 'font-semibold bg-primary-800/60';
    }

    if (
      (!isTotalOrCombinedVoteType && points === 8) ||
      (isTotalOrCombinedVoteType && points >= 15)
    ) {
      return 'font-semibold bg-primary-800/30';
    }

    return 'font-medium';
  };

  // local-only state for input editing visuals
  const [editing, setEditing] = React.useState<Record<CellKey, string>>({});

  const handleSave = () => {
    const { ok, errors } = validateAllBeforeSave();

    if (!ok) {
      const list = errors
        .slice(0, 5)
        .map((e) => `- ${e.label}: ${e.reasons.join('; ')}`)
        .join('\n');

      alert(
        `Please complete valid assignments for all voters before saving.\n\nIssues:\n${list}\n${
          errors.length > 5 ? '...' : ''
        }`,
      );

      return;
    }
    if (!votes) return;
    onSave(votes);
    onClose();
  };

  useEffectOnce(onLoaded);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="!z-[1000]"
      contentClassName="!px-2 text-white flex flex-col !overflow-hidden"
      bottomContent={
        <div className="flex justify-end xs:gap-4 gap-2 bg-primary-900 md:p-4 xs:p-3 p-2 z-30">
          <Button
            variant="secondary"
            className="md:text-base text-sm"
            onClick={onClose}
          >
            Close
          </Button>
          <Button className="w-full !text-base" onClick={handleSave}>
            Save
          </Button>
        </div>
      }
    >
      <VotingPredefinitionHeader
        stageName={stage.name}
        totalBadgeLabel={totalBadgeLabel}
        pointsSystem={pointsSystem as any}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        voteTypeOptions={voteTypeOptions}
        isSorting={isSorting}
        setIsSorting={(v) => setIsSorting(v)}
        onReset={() => {
          resetVotes();
          setEditing({});
        }}
        onRandomize={randomizeAll}
      />

      <VotingPredefinitionTable
        rankedCountries={rankedCountries as any}
        votingCountries={votingCountries as any}
        shouldShowHeartFlagIcon={shouldShowHeartFlagIcon}
        isTotalOrCombinedVoteType={isTotalOrCombinedVoteType}
        getVoterValidity={getVoterValidity as any}
        getTotalPointsForCountry={getTotalPointsForCountry}
        getCellClassName={getCellClassName}
        getCellValue={getCellValue}
        isSameCountry={(participant, voter) => participant === voter}
        isTotalOrCombinedDisabled={(participant, voter) =>
          isTotalOrCombinedVoteType || participant === voter
        }
        valueForCell={(participant, voter) => {
          const key: CellKey = `${participant}:${voter}`;
          const displayValue = getCellValue(participant, voter);

          return (editing[key] ?? String(displayValue || '')) as string;
        }}
        onChangeCell={(participant, voter, val) => {
          const key: CellKey = `${participant}:${voter}`;

          setEditing((s) => ({ ...s, [key]: val }));
        }}
        onBlurCell={(participant, voter, val) => {
          const key: CellKey = `${participant}:${voter}`;
          const parsed = Number(val);
          const ok =
            Number.isFinite(parsed) &&
            (applyInputValue(participant, voter, val), true);

          setEditing((s) => {
            const next = { ...s } as Record<CellKey, string>;

            delete next[key];

            return next;
          });

          if (!ok) {
            // noop
          }
        }}
      />
    </Modal>
  );
};

export default VotingPredefinitionModal;
