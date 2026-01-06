import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import { TrophyIcon } from '@/assets/icons/TrophyIcon';
import { Checkbox } from '@/components/common/Checkbox';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomContent from '@/components/common/Modal/ModalBottomContent';
import Tabs from '@/components/common/tabs/Tabs';
import {
  LoadContestOptions,
  SimulationLoadOptions,
} from '@/helpers/contestSnapshot';

interface LoadContestModalProps {
  isOpen: boolean;
  isSimulationStarted: boolean;
  onClose: () => void;
  onLoad: (options: LoadContestOptions) => void;
}

const LoadContestModal: React.FC<LoadContestModalProps> = ({
  isOpen,
  isSimulationStarted,
  onClose,
  onLoad,
}) => {
  const t = useTranslations();

  const tabs = useMemo(
    () => [
      {
        value: SimulationLoadOptions.RESULTS,
        label: t('widgets.contests.loadContestResults'),
      },
      {
        value: SimulationLoadOptions.PRESENTATION,
        label: t('widgets.contests.loadContestPresentation'),
      },
    ],
    [t],
  );

  const [options, setOptions] = useState<LoadContestOptions>({
    generalInfo: true,
    setup: true,
    simulation: isSimulationStarted,
    simulationLoadOption: SimulationLoadOptions.RESULTS,
  });

  const handleOptionChange = (key: keyof LoadContestOptions) => {
    setOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleLoad = () => {
    onLoad(options);
    onClose();
  };

  const hasSelectedOptions = options.generalInfo || options.setup;

  const isSimulationEnabled = options.simulation && options.setup;

  const optionsList = [
    {
      id: 'generalInfo' as keyof LoadContestOptions,
      label: t('widgets.contests.generalInfo'),
      description: t('widgets.contests.generalInfoDescription'),
      checked: options.generalInfo,
    },
    {
      id: 'setup' as keyof LoadContestOptions,
      label: t('widgets.contests.setup'),
      description: t('widgets.contests.setupDescription'),
      checked: options.setup,
    },
    {
      id: 'simulation' as keyof LoadContestOptions,
      label: t('widgets.contests.simulation'),
      description: t('widgets.contests.simulationDescription'),
      checked: isSimulationEnabled,
      disabled: !options.setup || !isSimulationStarted,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,500px)]"
      contentClassName="text-white"
      overlayClassName="!z-[1002]"
      bottomContent={
        <ModalBottomContent
          onClose={onClose}
          onSave={handleLoad}
          isSaving={false}
          saveButtonLabel="load"
          saveButtonIcon={<TrophyIcon className="size-5" />}
          saveButtonDisabled={!hasSelectedOptions}
        />
      }
    >
      <div>
        <h3 className="text-xl font-semibold mb-2">
          {t('widgets.contests.loadContestOptions')}
        </h3>
        <p className="text-white/70 mb-4">
          {t('widgets.contests.loadContestDescription')}
        </p>

        <div className="space-y-2">
          {optionsList.map((option) => (
            <div key={option.id}>
              <Checkbox
                key={option.id}
                id={option.id}
                label={option.label}
                checked={option.checked}
                onChange={() => handleOptionChange(option.id)}
                disabled={option.disabled}
                labelClassName="text-white"
                className={
                  option.disabled ? 'opacity-50 cursor-not-allowed' : ''
                }
              />
              <p className="text-white/60 text-sm !ml-2">
                {option.description}
              </p>

              {isSimulationEnabled && option.id === 'simulation' && (
                <Tabs
                  tabs={tabs}
                  activeTab={
                    options.simulationLoadOption ||
                    SimulationLoadOptions.RESULTS
                  }
                  setActiveTab={(tab) =>
                    setOptions((prev) => ({
                      ...prev,
                      simulationLoadOption: tab as SimulationLoadOptions,
                    }))
                  }
                  containerClassName="!px-0 !py-0 mt-2 !overflow-hidden"
                  overlayClassName="!top-0"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default LoadContestModal;
