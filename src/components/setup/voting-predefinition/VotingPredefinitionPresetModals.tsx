'use client';

import React from 'react';

import { LoadVotingPresetModal } from './LoadVotingPresetModal';
import { SaveVotingPresetModal } from './SaveVotingPresetModal';

type Props = {
  saveProps: React.ComponentProps<typeof SaveVotingPresetModal>;
  loadProps: React.ComponentProps<typeof LoadVotingPresetModal>;
};

export const VotingPredefinitionPresetModals: React.FC<Props> = ({
  saveProps,
  loadProps,
}) => (
  <>
    <SaveVotingPresetModal {...saveProps} />
    <LoadVotingPresetModal {...loadProps} />
  </>
);

export default VotingPredefinitionPresetModals;
