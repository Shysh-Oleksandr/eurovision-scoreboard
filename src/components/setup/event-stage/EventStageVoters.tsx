import React from 'react';
import { useFormContext } from 'react-hook-form';

interface EventStageVotersProps {
  className?: string;
}

const EventStageVoters: React.FC<EventStageVotersProps> = () => {
  const { watch } = useFormContext();
  const votingMode = watch('votingMode');

  return (
    <div className="flex flex-col gap-4 p-2">
      <h2 className="text-xl font-bold text-white">Voters</h2>
      <p className="text-white text-sm">Voting mode: {votingMode}</p>
      <p className="text-gray-400 text-sm">
        Voter configuration will be implemented here.
      </p>
    </div>
  );
};

export default EventStageVoters;
