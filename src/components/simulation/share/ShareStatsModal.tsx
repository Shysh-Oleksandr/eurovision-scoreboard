import React, { useCallback, useEffect, useRef, useState } from 'react';

import Button from '../../common/Button';
import { Checkbox } from '../../common/Checkbox';
import { CollapsibleSection } from '../../common/CollapsibleSection';
import Modal from '../../common/Modal/Modal';
import { Input } from '../../Input';

import StatsImagePreview from './StatsImagePreview';

import { DownloadIcon } from '@/assets/icons/DownloadIcon';
import { Country, StageVotingType, StatsTableType } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { useStatsCustomizationStore } from '@/state/statsCustomizationStore';

interface ShareStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: StatsTableType;
  rankedCountries: (Country & { rank: number })[];
  selectedStageId: string | null;
  selectedVoteType: StageVotingType | 'Total';
  getCellPoints: (
    participantCode: string,
    voterCode: string,
  ) => string | number;
  getCellClassName: (points: number) => string;
  getPoints: (
    country: Country,
    type?: 'jury' | 'televote' | 'combined',
  ) => number;
  selectedStage: any; // EventStage type
}

const ShareStatsModal: React.FC<ShareStatsModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  rankedCountries,
  selectedStageId,
  selectedVoteType,
  getCellPoints,
  getCellClassName,
  getPoints,
  selectedStage,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(
    null,
  );
  const [lastGeneratedImageType, setLastGeneratedImageType] =
    useState<StatsTableType | null>(null);

  const { settings, setSettings, resetSettings } = useStatsCustomizationStore();
  const contestName = useGeneralStore((state) => state.settings.contestName);
  const contestYear = useGeneralStore((state) => state.settings.contestYear);

  const stageName = selectedStage?.name || 'Unknown Stage';
  const defaultTitle = `${contestName} ${contestYear} - ${stageName}`;
  const voteTypeText =
    selectedVoteType === 'Total' ? 'Total' : selectedVoteType;
  const tableTypeText =
    activeTab === StatsTableType.BREAKDOWN
      ? 'Breakdown'
      : activeTab === StatsTableType.SPLIT
      ? 'Split'
      : 'Summary';

  const handleImageGenerated = useCallback(
    (dataUrl: string) => {
      setGeneratedImageUrl(dataUrl);
      setLastGeneratedImageType(activeTab);
    },
    [activeTab],
  );

  const handleDownload = () => {
    if (!generatedImageUrl) return;

    const filename = `${defaultTitle} - ${tableTypeText} - ${voteTypeText} - DouzePoints.app - ${Date.now()}.png`;

    const link = document.createElement('a');

    link.download = filename;
    link.href = generatedImageUrl;
    link.click();
  };

  const updateSetting = (key: keyof typeof settings, value: any) => {
    setSettings({ [key]: value });
  };

  useEffect(() => {
    if (isOpen) {
      setSettings({
        title: defaultTitle,
      });
    }
    if (
      isOpen &&
      settings.generateOnOpen &&
      (!generatedImageUrl || lastGeneratedImageType !== activeTab)
    ) {
      setGeneratedImageUrl(null);
    }
  }, [
    isOpen,
    defaultTitle,
    setSettings,
    settings.generateOnOpen,
    generatedImageUrl,
    lastGeneratedImageType,
    activeTab,
  ]);

  return (
    <Modal
      ref={modalRef}
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,_95vw)]"
      contentClassName="!py-4 !px-2 text-white h-[85vh] narrow-scrollbar"
      overlayClassName="!z-[1001]"
      bottomContent={
        <div className="bg-primary-900 p-4 z-30">
          <Button className="md:text-base text-sm w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="sm:space-y-6 space-y-4 sm:py-2 py-1">
        <div className="sm:mx-3 mx-2">
          <CollapsibleSection
            title="Customization"
            isExpanded={settings.isCustomizationExpanded}
            onToggle={() => {
              setSettings({
                isCustomizationExpanded: !settings.isCustomizationExpanded,
              });
            }}
            contentClassName="lg:px-6 sm:px-4 px-3"
            extraContent={
              <Button
                className="h-10 !py-2 ml-2"
                onClick={(e) => {
                  e.stopPropagation();
                  resetSettings();
                  setSettings({ title: defaultTitle });
                }}
              >
                Reset
              </Button>
            }
          >
            <div className="sm:space-y-4 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-4 gap-2 items-center">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Title
                  </label>
                  <Input
                    type="text"
                    className="pr-2"
                    value={settings.title}
                    onChange={(e) => updateSetting('title', e.target.value)}
                    placeholder="Enter title"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Border Opacity
                  </label>
                  <Input
                    type="number"
                    className="pr-3"
                    value={settings.borderOpacity}
                    onChange={(e) =>
                      updateSetting(
                        'borderOpacity',
                        parseFloat(e.target.value) ?? 1,
                      )
                    }
                    min="0"
                    max="1"
                    step="0.1"
                    placeholder="1"
                  />
                </div>

                <Checkbox
                  id="showBackgroundImage"
                  label="Show Background Image"
                  checked={settings.showBackgroundImage}
                  onChange={(e) =>
                    updateSetting('showBackgroundImage', e.target.checked)
                  }
                />

                {settings.showBackgroundImage && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Background Image Opacity
                    </label>
                    <Input
                      type="number"
                      className="pr-3"
                      value={settings.backgroundOpacity}
                      onChange={(e) =>
                        updateSetting(
                          'backgroundOpacity',
                          parseFloat(e.target.value) || 0.3,
                        )
                      }
                      min="0"
                      max="1"
                      step="0.1"
                      placeholder="0.3"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                <Checkbox
                  id="showVotingCountriesNames"
                  label="Show Voting Countries Names"
                  checked={settings.showVotingCountriesNames}
                  onChange={(e) =>
                    updateSetting('showVotingCountriesNames', e.target.checked)
                  }
                />

                <Checkbox
                  id="generateOnOpen"
                  label="Generate Image Automatically on Open"
                  checked={settings.generateOnOpen}
                  onChange={(e) =>
                    updateSetting('generateOnOpen', e.target.checked)
                  }
                />
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Stats Image Preview */}
        <StatsImagePreview
          activeTab={activeTab}
          rankedCountries={rankedCountries}
          selectedStageId={selectedStageId}
          selectedVoteType={selectedVoteType}
          getCellPoints={getCellPoints}
          getCellClassName={getCellClassName}
          getPoints={getPoints}
          selectedStage={selectedStage}
          modalRef={modalRef}
          onImageGenerated={handleImageGenerated}
          generatedImageUrl={generatedImageUrl}
        />

        {/* Generated Image Result */}
        {generatedImageUrl && (
          <div>
            <h3 className="text-lg font-semibold mb-2 ml-2">Result:</h3>

            <img
              src={generatedImageUrl}
              alt="Generated stats image"
              className="max-w-full h-auto border rounded-sm"
            />
            <Button
              onClick={handleDownload}
              className="mt-4 w-full justify-center"
              variant="tertiary"
              Icon={<DownloadIcon className="w-[20px] h-[20px]" />}
            >
              Download Image
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ShareStatsModal;
