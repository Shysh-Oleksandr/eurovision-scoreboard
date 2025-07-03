import React, { useState, useEffect } from 'react';

import { POINTS_ARRAY } from '../../data/data';
import { PresetJuryVote, PresetTelevoteVote } from '../../models';
import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../Button';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      {/* Modal - floating popup without backdrop */}
      <div className="relative bg-gradient-to-tr from-primary-950 to-primary-900 border border-gray-600 rounded-lg shadow-2xl w-full max-w-[60%] max-h-[80vh] overflow-hidden pointer-events-auto">
        {/* Header */}
        <div className="bg-primary-800/50 px-4 py-3 border-b border-gray-600 flex justify-between items-center">
          <h3 className="text-white text-lg font-medium">
            {isJuryVoting
              ? 'Configure Jury Points'
              : 'Configure Televote Points'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded"
          >
            <svg
              className="w-5 h-5"
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

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
          {isJuryVoting ? (
            <>
              {/* Country Selection */}
              <div className="mb-4">
                <label className="block text-white text-sm font-medium mb-2">
                  Voting Country
                </label>
                <select
                  value={selectedVotingCountryCode}
                  onChange={(e) => setSelectedVotingCountryCode(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-gray-600 rounded text-black text-sm focus:border-primary-400 focus:outline-none"
                >
                  <option value="">Select country</option>
                  {votingCountries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Random Button */}
              <div className="mb-4">
                <Button
                  label="Generate Random Points"
                  onClick={handleRandomPointsForCurrentCountry}
                  variant="secondary"
                  className="w-full"
                />
              </div>

              {/* Points Assignment */}
              {currentJuryVote && (
                <div className="space-y-3">
                  <label className="block text-white text-sm font-medium">
                    Point Distribution
                  </label>
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
                        <div className="bg-primary-600 text-white font-medium text-sm px-2 py-1 rounded min-w-[30px] text-center">
                          {pointValue}
                        </div>
                        <select
                          value={selectedCountryCode || ''}
                          onChange={(e) =>
                            handleJuryPointSelection(pointValue, e.target.value)
                          }
                          className="flex-1 py-2 px-3 bg-white border border-gray-600 rounded text-black text-sm focus:border-primary-400 focus:outline-none"
                        >
                          <option value="">Select country</option>
                          {availableCountries.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Televote Points */
            <div className="space-y-3">
              <label className="block text-white text-sm font-medium">
                Televote Points
              </label>
              {currentTelevoteVotes.map((vote) => {
                const country = countries.find(
                  (c) => c.code === vote.countryCode,
                );

                if (!country) return null;

                return (
                  <div
                    key={vote.countryCode}
                    className="flex items-center justify-between"
                  >
                    <span className="text-white text-sm">{country.name}</span>
                    <input
                      type="number"
                      value={vote.points}
                      onChange={(e) =>
                        handleTelevotePointChange(
                          vote.countryCode,
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className="w-20 py-1 px-2 bg-gray-700 border border-gray-600 rounded text-white text-sm text-center focus:border-primary-400 focus:outline-none"
                      min="0"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-primary-800/30 px-4 py-3 border-t border-gray-600 flex space-x-3">
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
  );
};

export default EditPointsModal;
