import React, { useState, useEffect } from 'react';

import { POINTS_ARRAY } from '../../data/data';
import { PresetJuryVote, PresetTelevoteVote } from '../../models';
import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../Button';
import CountryDropdown from '../CountryDropdown';

type Props = {
  onClose: () => void;
};

const EditPointsModal = ({ onClose }: Props) => {
  const {
    countries,
    isJuryVoting,
    presenterSettings,
    setPresetJuryVotes,
    setPresetTelevoteVotes,
  } = useScoreboardStore();

  const { getVotingCountries } = useCountriesStore();

  const [selectedVotingCountryCode, setSelectedVotingCountryCode] =
    useState<string>('');
  const [currentJuryVote, setCurrentJuryVote] = useState<PresetJuryVote | null>(
    null,
  );
  const [currentTelevoteVotes, setCurrentTelevoteVotes] = useState<
    PresetTelevoteVote[]
  >([]);

  const votingCountries = getVotingCountries();

  useEffect(() => {
    if (isJuryVoting) {
      if (votingCountries.length > 0 && !selectedVotingCountryCode) {
        setSelectedVotingCountryCode(votingCountries[0].code);
      }
    } else {
      // Initialize televote votes
      setCurrentTelevoteVotes(
        presenterSettings.presetTelevoteVotes.length > 0
          ? [...presenterSettings.presetTelevoteVotes]
          : countries.map((country) => ({
              countryCode: country.code,
              points: 0,
            })),
      );
    }
  }, [
    isJuryVoting,
    votingCountries,
    selectedVotingCountryCode,
    countries,
    presenterSettings,
  ]);

  useEffect(() => {
    if (isJuryVoting && selectedVotingCountryCode) {
      const existingVote = presenterSettings.presetJuryVotes.find(
        (vote) => vote.votingCountryCode === selectedVotingCountryCode,
      );

      if (existingVote) {
        setCurrentJuryVote(existingVote);
      } else {
        // Initialize empty vote
        const emptyPoints: { [key: string]: number } = {};

        setCurrentJuryVote({
          votingCountryCode: selectedVotingCountryCode,
          points: emptyPoints,
        });
      }
    }
  }, [
    selectedVotingCountryCode,
    isJuryVoting,
    presenterSettings.presetJuryVotes,
  ]);

  const handleJuryPointSelection = (
    pointValue: number,
    receivingCountryCode: string,
  ) => {
    if (!currentJuryVote) return;

    // Remove this point value from any other country
    const updatedPoints = { ...currentJuryVote.points };

    Object.keys(updatedPoints).forEach((code) => {
      if (updatedPoints[code] === pointValue) {
        delete updatedPoints[code];
      }
    });

    // Assign the point value to the selected country
    updatedPoints[receivingCountryCode] = pointValue;

    setCurrentJuryVote({
      ...currentJuryVote,
      points: updatedPoints,
    });
  };

  const handleTelevotePointChange = (countryCode: string, points: number) => {
    setCurrentTelevoteVotes((prev) =>
      prev.map((vote) =>
        vote.countryCode === countryCode ? { ...vote, points } : vote,
      ),
    );
  };

  const handleRandomPointsForCurrentCountry = () => {
    if (isJuryVoting && currentJuryVote) {
      const availableCountries = countries.filter(
        (country) => country.code !== selectedVotingCountryCode,
      );

      const pointsToDistribute = [...POINTS_ARRAY];
      const randomPoints: { [key: string]: number } = {};

      pointsToDistribute.forEach((pointValue) => {
        const randomIndex = Math.floor(
          Math.random() * availableCountries.length,
        );
        const randomCountry = availableCountries[randomIndex];

        randomPoints[randomCountry.code] = pointValue;

        // Remove the country to avoid duplicates
        availableCountries.splice(randomIndex, 1);
      });

      setCurrentJuryVote({
        ...currentJuryVote,
        points: randomPoints,
      });
    }
  };

  const handleSave = () => {
    if (isJuryVoting && currentJuryVote) {
      // Update the preset jury votes
      const updatedVotes = presenterSettings.presetJuryVotes.filter(
        (vote) => vote.votingCountryCode !== selectedVotingCountryCode,
      );

      updatedVotes.push(currentJuryVote);
      setPresetJuryVotes(updatedVotes);
    } else if (!isJuryVoting) {
      setPresetTelevoteVotes(currentTelevoteVotes);
    }

    onClose();
  };

  const handleClear = () => {
    if (isJuryVoting && currentJuryVote) {
      setCurrentJuryVote({
        ...currentJuryVote,
        points: {},
      });
    } else if (!isJuryVoting) {
      setCurrentTelevoteVotes(
        countries.map((country) => ({ countryCode: country.code, points: 0 })),
      );
    }
  };

  const getSelectedCountryForPoints = (pointValue: number): string | null => {
    if (!currentJuryVote) return null;

    for (const [countryCode, points] of Object.entries(
      currentJuryVote.points,
    )) {
      if (points === pointValue) {
        return countryCode;
      }
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gradient-to-tr from-[30%] from-primary-950 to-primary-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white lg:text-xl text-lg font-medium">
              Edit Points
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors duration-200"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {isJuryVoting ? (
            <>
              {/* Voting Country Selection */}
              <div className="mb-6">
                <h4 className="text-white lg:text-base text-sm font-medium mb-2">
                  Who's voting?
                </h4>
                <CountryDropdown
                  countries={votingCountries}
                  selectedCountryCode={selectedVotingCountryCode}
                  onSelect={setSelectedVotingCountryCode}
                  placeholder="Select voting country"
                />
              </div>

              {/* Random Points Button */}
              <div className="mb-6">
                <Button
                  label="Random Points"
                  onClick={handleRandomPointsForCurrentCountry}
                  variant="secondary"
                  className="w-full"
                />
              </div>

              {/* Points Assignment */}
              {currentJuryVote && (
                <div className="space-y-4 mb-6">
                  {POINTS_ARRAY.map((pointValue) => {
                    const selectedCountryCode =
                      getSelectedCountryForPoints(pointValue);
                    const availableCountries = countries.filter(
                      (country) => country.code !== selectedVotingCountryCode,
                    );

                    return (
                      <div
                        key={pointValue}
                        className="flex items-center space-x-3"
                      >
                        <div className="w-8 text-white font-medium">
                          {pointValue}
                        </div>
                        <CountryDropdown
                          countries={availableCountries}
                          selectedCountryCode={selectedCountryCode}
                          onSelect={(countryCode) =>
                            handleJuryPointSelection(pointValue, countryCode)
                          }
                          placeholder="Select country"
                          className="flex-1"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Televote Points */
            <div className="space-y-4 mb-6">
              <h4 className="text-white lg:text-base text-sm font-medium mb-4">
                Enter televote points for each country
              </h4>
              {currentTelevoteVotes.map((vote) => {
                const country = countries.find(
                  (c) => c.code === vote.countryCode,
                );

                if (!country) return null;

                return (
                  <div
                    key={vote.countryCode}
                    className="flex items-center space-x-3"
                  >
                    <div className="flex-1 text-white">{country.name}</div>
                    <input
                      type="number"
                      value={vote.points}
                      onChange={(e) =>
                        handleTelevotePointChange(
                          vote.countryCode,
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className="w-24 lg:py-2 py-[6px] px-3 bg-primary-800 border border-gray-600 rounded-md text-white lg:text-base text-sm"
                      min="0"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              label="Save"
              onClick={handleSave}
              variant="primary"
              className="flex-1"
            />
            <Button
              label="Clear"
              onClick={handleClear}
              variant="destructive"
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPointsModal;
