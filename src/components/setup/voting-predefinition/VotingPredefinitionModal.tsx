import React, { useEffect, useMemo, useState } from 'react';

import { ArrowDown10 } from '@/assets/icons/ArrowDown10';
import { RestartIcon } from '@/assets/icons/RestartIcon';
import SortAZIcon from '@/assets/icons/SortAZIcon';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import { PREDEFINED_SYSTEMS_MAP } from '@/data/data';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import {
  BaseCountry,
  EventStage,
  StageVotingMode,
  StageVotingType,
} from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { StageVotes } from '@/state/scoreboard/types';
import { predefineStageVotes } from '@/state/scoreboard/votesPredefinition';
import { getHostingCountryLogo } from '@/theme/hosting';

type VotingPredefinitionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  stage: Pick<EventStage, 'id' | 'name' | 'votingMode'> & {
    countries: (BaseCountry | any)[];
  };
  onSave: (votes: Partial<StageVotes>) => void;
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
  const pointsSystem = useGeneralStore((s) => s.pointsSystem);
  const randomnessLevel = useGeneralStore((s) => s.settings.randomnessLevel);
  const shouldShowHeartFlagIcon = useGeneralStore(
    (state) => state.settings.shouldShowHeartFlagIcon,
  );
  const getStageVotingCountries = useCountriesStore(
    (s) => s.getStageVotingCountries,
  );
  const { countryOdds } = useCountriesStore();

  const [selectedType, setSelectedType] = useState<'Total' | StageVotingType>(
    'Total',
  );

  const [votes, setVotes] = useState<Partial<StageVotes> | null>(null);
  const [editing, setEditing] = useState<Record<CellKey, string>>({});

  const [lastStageId, setLastStageId] = useState<string | null>(stage.id);

  const [isSorting, setIsSorting] = useState(false);

  const votingCountries = getStageVotingCountries(
    stage.id,
    selectedType !== StageVotingType.JURY,
  );

  const randomizeAll = () => {
    const generated = predefineStageVotes(
      stage.countries,
      votingCountries,
      stage.votingMode,
      countryOdds,
      randomnessLevel,
      pointsSystem,
    );

    setVotes(generated);
    setIsSorting(true);
  };

  const reset = () => {
    setVotes(null);
    setEditing({});
  };

  const isCombinedVoting = stage.votingMode === StageVotingMode.COMBINED;

  const totalBadgeLabel = useMemo(() => {
    const { votingMode } = stage;

    if (votingMode === StageVotingMode.JURY_ONLY) {
      return 'Jury';
    }
    if (votingMode === StageVotingMode.TELEVOTE_ONLY) {
      return 'Televote';
    }
    if (votingMode === StageVotingMode.COMBINED) {
      return 'Combined';
    }

    return 'Total';
  }, [stage]);

  const isTotalVoteType =
    selectedType === 'Total' && totalBadgeLabel === 'Total';
  const isTotalOrCombinedVoteType =
    selectedType === 'Total' &&
    (totalBadgeLabel === 'Combined' || totalBadgeLabel === 'Total');

  const getActiveSource = (): 'jury' | 'televote' | null => {
    if (
      selectedType === StageVotingType.JURY ||
      stage.votingMode === StageVotingMode.JURY_ONLY
    )
      return 'jury';
    if (
      selectedType === StageVotingType.TELEVOTE ||
      stage.votingMode === StageVotingMode.TELEVOTE_ONLY
    )
      return 'televote';

    return null;
  };

  const applyInputValue = (
    participantCode: string,
    voterCode: string,
    rawValue: string,
  ) => {
    // Accept empty => clear assignment for this participant
    const source = getActiveSource();

    if (!source) return; // Total tab is non-editable

    setVotes((prev) => {
      const nextVotes: Partial<StageVotes> = prev ? { ...prev } : {};
      const sourceMap: Record<string, any[]> = (nextVotes as any)[source] || {};
      const arr: any[] = [...(sourceMap[voterCode] || [])];
      const idx = arr.findIndex((v) => v.countryCode === participantCode);

      const parsed = Number(rawValue);

      if (!rawValue || !Number.isFinite(parsed)) {
        // remove assignment
        if (idx !== -1) {
          arr.splice(idx, 1);
        }
      } else {
        const match = pointsSystem.find((p) => p.value === parsed);

        if (!match) {
          // number not in points system => clear
          if (idx !== -1) {
            arr.splice(idx, 1);
          }
        } else {
          const entry = {
            countryCode: participantCode,
            points: match.value,
            pointsId: match.id,
            showDouzePointsAnimation: match.value === 12,
          };

          if (idx !== -1) {
            arr[idx] = entry;
          } else {
            arr.push(entry);
          }
        }
      }

      (nextVotes as any)[source] = { ...sourceMap, [voterCode]: arr };

      return nextVotes;
    });
  };

  const getVoterValidity = (voterCode: string) => {
    const source = getActiveSource();

    if (!source || !votes) return null;

    const used = (votes as any)[source]?.[voterCode] || [];

    if (!used || used.length === 0) return 'incomplete';

    const expectedIds = pointsSystem.map((p) => p.id);
    const usedIds = used.map((v: any) => v.pointsId);

    const hasAll = expectedIds.every((id) => usedIds.includes(id));
    const noDuplicates = new Set(usedIds).size === usedIds.length;

    if (hasAll && noDuplicates && usedIds.length === expectedIds.length) {
      return 'valid';
    }

    // Some entries present but not complete or duplicated
    return hasAll ? 'invalid' : 'incomplete';
  };

  const validateAllBeforeSave = () => {
    const modesToValidate: Array<'jury' | 'televote'> = [];

    if (
      stage.votingMode === StageVotingMode.JURY_AND_TELEVOTE ||
      stage.votingMode === StageVotingMode.COMBINED
    ) {
      modesToValidate.push('jury', 'televote');
    } else if (stage.votingMode === StageVotingMode.JURY_ONLY) {
      modesToValidate.push('jury');
    } else if (stage.votingMode === StageVotingMode.TELEVOTE_ONLY) {
      modesToValidate.push('televote');
    }

    const errors: string[] = [];

    for (const mode of modesToValidate) {
      for (const voter of votingCountries) {
        if (mode === 'jury' && voter.code === 'WW') continue;

        const arr: any[] = (votes as any)?.[mode]?.[voter.code] || [];
        const expectedIds = pointsSystem.map((p) => p.id);
        const usedIds = arr.map((v) => v.pointsId);
        const hasAll = expectedIds.every((id) => usedIds.includes(id));
        const noDuplicates = new Set(usedIds).size === usedIds.length;

        if (
          !(hasAll && noDuplicates && usedIds.length === expectedIds.length)
        ) {
          errors.push(`${voter.name} (${mode})`);
        }
      }
    }

    return { ok: errors.length === 0, errors };
  };

  const getCellClassName = (points: number) => {
    if (
      (!isTotalVoteType && points === 12) ||
      (isTotalVoteType && points >= 20)
    ) {
      return 'font-bold bg-primary-700/50';
    }

    if (
      (!isTotalVoteType && points === 10) ||
      (isTotalVoteType && points >= 17)
    ) {
      return 'font-semibold bg-primary-800/60';
    }

    if (
      (!isTotalVoteType && points === 8) ||
      (isTotalVoteType && points >= 15)
    ) {
      return 'font-semibold bg-primary-800/30';
    }

    return 'font-medium';
  };

  const getTotalPointsForCountry = (countryCode: string): number => {
    if (!votes) return 0;

    const addFrom = (arr: any[] | undefined, acc: number) => {
      if (!arr) return acc;
      for (const v of arr) {
        if (v.countryCode === countryCode) acc += v.points || 0;
      }

      return acc;
    };

    if (selectedType === 'Total') {
      if (isCombinedVoting) {
        let sum = 0;

        Object.values(votes.combined || {}).forEach((a: any) => {
          sum = addFrom(a as any[], sum);
        });

        return sum;
      }

      let sum = 0;

      Object.values(votes.jury || {}).forEach((a: any) => {
        sum = addFrom(a as any[], sum);
      });
      Object.values(votes.televote || {}).forEach((a: any) => {
        sum = addFrom(a as any[], sum);
      });

      return sum;
    }

    if (selectedType === StageVotingType.JURY) {
      let sum = 0;

      Object.values(votes.jury || {}).forEach((a: any) => {
        sum = addFrom(a as any[], sum);
      });

      return sum;
    }

    let sum = 0;

    Object.values(votes.televote || {}).forEach((a: any) => {
      sum = addFrom(a as any[], sum);
    });

    return sum;
  };

  const getCellValue = (participantCode: string, voterCode: string): number => {
    if (!votes) return 0;

    if (isTotalOrCombinedVoteType) {
      const juryArr = votes.jury?.[voterCode] || [];
      const televoteArr = votes.televote?.[voterCode] || [];
      const combinedArr = votes.combined?.[voterCode] || [];
      const arr = isCombinedVoting ? combinedArr : [...juryArr, ...televoteArr];
      const found = arr
        .filter((v: any) => v.countryCode === participantCode)
        .reduce((acc, v) => acc + v.points, 0);

      return found || 0;
    }

    const source = getActiveSource() || 'televote';
    const arr = votes?.[source]?.[voterCode] || [];
    const found = arr.find((v: any) => v.countryCode === participantCode);

    return found?.points || 0;
  };

  const voteTypeOptions = useMemo(() => {
    if (!stage) return [];

    const { votingMode } = stage;

    if (
      [StageVotingMode.JURY_AND_TELEVOTE, StageVotingMode.COMBINED].includes(
        votingMode,
      )
    ) {
      return [StageVotingType.JURY, StageVotingType.TELEVOTE];
    }

    return [];
  }, [stage]);

  const rankedCountries = useMemo(() => {
    const totals: Record<string, number> = {};

    stage.countries.forEach((c) => {
      totals[c.code] = 0;
    });
    if (votes) {
      const add = (arr: any[]) => {
        arr.forEach((v) => {
          totals[v.countryCode] = (totals[v.countryCode] || 0) + v.points;
        });
      };

      if (selectedType === 'Total') {
        if (isCombinedVoting) {
          Object.values(votes.combined || {}).forEach((arr: any) =>
            add(arr as any[]),
          );
        } else {
          Object.values(votes.jury || {}).forEach((arr: any) =>
            add(arr as any[]),
          );
          Object.values(votes.televote || {}).forEach((arr: any) =>
            add(arr as any[]),
          );
        }
      } else if (selectedType === StageVotingType.JURY) {
        Object.values(votes.jury || {}).forEach((arr: any) =>
          add(arr as any[]),
        );
      } else {
        Object.values(votes.televote || {}).forEach((arr: any) =>
          add(arr as any[]),
        );
      }
    }
    const withRank = stage.countries
      .sort((a, b) => (totals[b.code] || 0) - (totals[a.code] || 0))
      .map((c, i) => ({ ...c, rank: i + 1 }));

    const finalCountries = isSorting
      ? withRank
      : withRank.sort((a, b) => a.name.localeCompare(b.name));

    return finalCountries;
  }, [stage.countries, votes, selectedType, isCombinedVoting, isSorting]);

  const handleSave = () => {
    const { ok, errors } = validateAllBeforeSave();

    if (!ok) {
      alert(
        `Please complete valid assignments for all voters before saving. Invalid: \n- ${errors
          .slice(0, 5)
          .join('\n- ')}\n${errors.length > 5 ? '...' : ''}`,
      );

      return;
    }
    if (!votes) return;

    onSave(votes);
    onClose();
  };

  useEffectOnce(onLoaded);

  // TODO: Add a progress bar

  useEffect(() => {
    if (stage.id !== lastStageId) {
      setVotes(null);
      setEditing({});
      setSelectedType('Total');
      setIsSorting(false);
    }

    setLastStageId(stage.id);
  }, [stage.id, lastStageId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      overlayClassName="!z-[1000]"
      contentClassName="!px-2 text-white"
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
      <div className="sm:mb-1 gap-1 px-2">
        <div className="flex items-center justify-between md:gap-4 gap-2 flex-wrap">
          <div className="md:w-auto w-full">
            <div className="flex gap-4 items-center sm:justify-start justify-between">
              <h3 className="text-lg font-bold">{stage.name}</h3>

              <div className="flex flex-wrap sm:gap-2 gap-1.5 items-center justify-end">
                <Badge
                  label={totalBadgeLabel}
                  onClick={() => setSelectedType('Total')}
                  isActive={selectedType === 'Total'}
                />
                {voteTypeOptions.map((type) => (
                  <Badge
                    key={type}
                    label={
                      type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
                    }
                    onClick={() => setSelectedType(type)}
                    isActive={selectedType === type}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Enter the points each voting country awards to participants (
              {pointsSystem.every(
                (p, index) =>
                  PREDEFINED_SYSTEMS_MAP['default'][index].value === p.value,
              )
                ? '1-8, 10, 12'
                : pointsSystem.map((p) => p.value).join(', ')}
              )
            </p>
          </div>

          <div className="flex gap-2 ml-auto">
            <Button
              onClick={() => setIsSorting((s) => !s)}
              className="!p-3"
              aria-label={isSorting ? 'Sort by name' : 'Sort by points'}
              title={isSorting ? 'Sort by name' : 'Sort by points'}
              Icon={
                isSorting ? (
                  <SortAZIcon className="w-5 h-5" />
                ) : (
                  <ArrowDown10 className="w-5 h-5" />
                )
              }
            />
            <Button
              variant="primary"
              onClick={reset}
              className="!p-3"
              aria-label="Restart"
              title="Restart"
              Icon={<RestartIcon className="w-5 h-5" />}
            />
            <Button variant="primary" onClick={randomizeAll} className="!px-4">
              Randomize
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="narrow-scrollbar overflow-x-auto overflow-y-hidden">
        <table className="text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="p-2 min-w-[220px] w-[220px] h-auto"></th>
              {votingCountries.map((country) => {
                const { logo, isExisting } = getHostingCountryLogo(
                  country,
                  shouldShowHeartFlagIcon,
                );

                return (
                  <th key={country.code} className="p-1 min-w-12 w-12">
                    <div className="flex flex-col items-center justify-end gap-1.5">
                      {isTotalOrCombinedVoteType ? (
                        <span className="w-2.5 h-2.5"></span>
                      ) : (
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            getVoterValidity(country.code) === 'valid'
                              ? 'bg-green-500'
                              : getVoterValidity(country.code) === 'invalid'
                              ? 'bg-red-600'
                              : 'bg-yellow-500'
                          }`}
                          title={`$${country.name} - ${getVoterValidity(
                            country.code,
                          )}`}
                        />
                      )}
                      <img
                        src={logo}
                        alt={country.name}
                        className={`${
                          isExisting
                            ? 'w-8 h-8'
                            : 'w-8 h-6 object-cover rounded-sm'
                        } mx-auto flex-shrink-0`}
                        loading="lazy"
                        width={32}
                        height={24}
                        title={country.name}
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rankedCountries.map((country) => {
              const { logo, isExisting } = getHostingCountryLogo(
                country,
                shouldShowHeartFlagIcon,
              );

              return (
                <tr key={country.code}>
                  <td className="p-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold w-6 text-center">
                        {country.rank}
                      </span>
                      <img
                        src={logo}
                        alt={country.name}
                        className={`${
                          isExisting
                            ? 'w-8 h-8'
                            : 'w-8 h-6 object-cover rounded-sm'
                        }`}
                        loading="lazy"
                        width={32}
                        height={32}
                      />
                      <span className="font-medium truncate flex-1 leading-normal">
                        {country.name}
                      </span>
                      <span className="font-bold text-lg">
                        {getTotalPointsForCountry(country.code)}
                      </span>
                    </div>
                  </td>
                  {votingCountries.map((voter) => {
                    const key: CellKey = `${country.code}:${voter.code}`;
                    const displayValue = getCellValue(country.code, voter.code);
                    const value = editing[key] ?? String(displayValue || '');
                    const isSameCountry = country.code === voter.code;

                    return (
                      <td
                        key={voter.code}
                        className={`p-1 min-h-12 h-12 text-center ${getCellClassName(
                          displayValue || 0,
                        )}`}
                      >
                        <input
                          className={`w-full h-full rounded-sm text-center focus:outline-none focus:ring-0 border-none ${
                            value === '' &&
                            !isSameCountry &&
                            !isTotalOrCombinedVoteType
                              ? 'bg-primary-800/30'
                              : 'bg-transparent'
                          } ${
                            isTotalOrCombinedVoteType || isSameCountry
                              ? ''
                              : 'hover:bg-primary-800/60 focus:bg-primary-800/60 transition-colors duration-300'
                          } ${
                            isTotalOrCombinedVoteType &&
                            !isSameCountry &&
                            value === ''
                              ? 'bg-primary-900/40'
                              : ''
                          } [&:disabled]:opacity-100`}
                          value={value}
                          inputMode="numeric"
                          disabled={isTotalOrCombinedVoteType || isSameCountry}
                          onChange={(e) =>
                            setEditing((s) => ({ ...s, [key]: e.target.value }))
                          }
                          onBlur={(e) => {
                            const parsed = Number(e.target.value);
                            const ok =
                              Number.isFinite(parsed) &&
                              (applyInputValue(
                                country.code,
                                voter.code,
                                e.target.value,
                              ),
                              true);

                            // reset visible value to canonical
                            setEditing((s) => {
                              const next = { ...s };

                              delete next[key];

                              return next;
                            });

                            if (!ok) {
                              // noop: invalid -> revert by clearing editing state
                            }
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};

export default VotingPredefinitionModal;
