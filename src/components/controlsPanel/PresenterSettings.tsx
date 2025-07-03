import React, { useState } from 'react';

import { useScoreboardStore } from '../../state/scoreboardStore';
import Button from '../Button';
import RadioButton from '../RadioButton';

import EditPointsModal from './EditPointsModal';

const PresenterSettings = () => {
  const {
    presenterSettings,
    isJuryVoting,
    setPointGrouping,
    generateRandomPresetVotes,
    startPresenterMode,
    stopPresenterMode,
  } = useScoreboardStore();

  const [showEditModal, setShowEditModal] = useState(false);

  const hasPresetVotes = isJuryVoting
    ? presenterSettings.presetJuryVotes.length > 0
    : presenterSettings.presetTelevoteVotes.length > 0;

  const canStartPresenting = hasPresetVotes && !presenterSettings.isAutoPlaying;

  const handleTogglePresenterMode = () => {
    if (presenterSettings.isAutoPlaying) {
      stopPresenterMode();
    } else if (canStartPresenting) {
      startPresenterMode();
    }
  };

  const getPresenterButtonLabel = () => {
    if (presenterSettings.isAutoPlaying) {
      return 'STOP PRESENTER MODE';
    }
    if (!hasPresetVotes) {
      return 'CONFIGURE POINTS FIRST';
    }

    return 'START PRESENTER MODE';
  };

  const isButtonDisabled = !hasPresetVotes && !presenterSettings.isAutoPlaying;

  return (
    <>
      <div className="w-full mt-4 p-4 bg-gradient-to-tr from-[30%] from-primary-950 to-primary-900 rounded-md">
        <h4 className="text-white lg:text-lg text-base font-medium mb-3">
          Presenter Settings
        </h4>

        {/* Presenter Mode Toggle */}
        <div className="mb-4">
          <Button
            label={getPresenterButtonLabel()}
            onClick={handleTogglePresenterMode}
            variant={
              presenterSettings.isAutoPlaying ? 'destructive' : 'primary'
            }
            className="w-full"
            disabled={isButtonDisabled}
          />
        </div>

        {/* Point Grouping - Only show for jury voting */}
        {isJuryVoting && (
          <div className="mb-4">
            <h5 className="text-white lg:text-base text-sm font-medium mb-3">
              Point Grouping
              {!hasPresetVotes && (
                <span className="text-gray-400 text-xs ml-2">
                  (Configure points first)
                </span>
              )}
            </h5>
            <div className="grid grid-cols-2 gap-3">
              <RadioButton
                label="Individual"
                checked={presenterSettings.pointGrouping === 'individual'}
                onChange={() => setPointGrouping('individual')}
                disabled={!hasPresetVotes}
              />
              <RadioButton
                label="Grouped"
                checked={presenterSettings.pointGrouping === 'grouped'}
                onChange={() => setPointGrouping('grouped')}
                disabled={!hasPresetVotes}
              />
            </div>
          </div>
        )}

        {/* Predetermined Points */}
        <div>
          <h5 className="text-white lg:text-base text-sm font-medium mb-2">
            Predetermined Points
          </h5>
          <div className="flex space-x-2">
            <Button
              label="Edit Points"
              onClick={() => setShowEditModal(true)}
              variant="secondary"
              className="flex-1"
            />
            <Button
              label="Use Random Points"
              onClick={generateRandomPresetVotes}
              variant="secondary"
              className="flex-1"
            />
          </div>
        </div>

        {/* Status indicator removed */}
      </div>

      {/* Edit Points Modal */}
      {showEditModal && (
        <EditPointsModal onClose={() => setShowEditModal(false)} />
      )}
    </>
  );
};

export default PresenterSettings;
