import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ShareGroup,
  ShareLinkButton,
  ShareSegmented,
  ShareTextField,
  ShareToggle,
} from './controls';
import ShareImageModal from './ShareImageModal';

import { StatsSource } from '@/graphics/render/DesignDataContext';
import { useGraphicsStudioStore } from '@/graphics/state/graphicsStudioStore';
import { toEditableDesign } from '@/graphics/templates/editor';
import { buildStatsDesign, STATS_MIN_WIDTH } from '@/graphics/templates/stats';
import { buildShareUrl } from '@/helpers/shareUrl';
import { Country, EventStage, StageVotingType, StatsTableType } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { useStatsCustomizationStore } from '@/state/statsCustomizationStore';

interface ShareStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: StatsTableType;
  /**
   * The tables the modal's Table switch offers (with `onTableChange`); the
   * caller feeds the data for the one picked through `activeTab`.
   */
  tableOptions?: StatsTableType[];
  onTableChange?: (table: StatsTableType) => void;
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
  selectedStage?: EventStage;
  onLoaded: () => void;
  /** When true, only SPLIT/SUMMARY tabs are used; breakdown is not shown. For COMBINED mode, hides jury/televote sub-columns. */
  aggregateOnly?: boolean;
}

/** PNG at 2× the measured table: sharp text without a 3× file on phones. */
const EXPORT_OPTIONS = { scale: 2, format: 'png' as const };

type BackgroundLevel = 'off' | 'faint' | 'strong';
type GridLevel = 'faint' | 'strong';

const BACKGROUND_OPACITY: Record<Exclude<BackgroundLevel, 'off'>, number> = {
  faint: 0.3,
  strong: 0.65,
};
const GRID_OPACITY: Record<GridLevel, number> = { faint: 0.5, strong: 1 };

const TABLE_LABEL_KEYS = {
  [StatsTableType.BREAKDOWN]: 'breakdown',
  [StatsTableType.SPLIT]: 'split',
  [StatsTableType.SUMMARY]: 'summary',
} as const;

const ShareStatsModal: React.FC<ShareStatsModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  tableOptions,
  onTableChange,
  rankedCountries,
  selectedStageId,
  selectedVoteType,
  getCellPoints,
  getCellClassName,
  getPoints,
  selectedStage,
  onLoaded,
  aggregateOnly = false,
}) => {
  const t = useTranslations('share');
  const tc = useTranslations('common');
  const tg = useTranslations('graphics.share');
  const tStats = useTranslations('simulation.finalStats');

  const { settings, setSettings } = useStatsCustomizationStore();
  const openEditor = useGraphicsStudioStore((state) => state.openEditor);
  const contestName = useGeneralStore((state) => state.settings.contestName);
  const contestYear = useGeneralStore((state) => state.settings.contestYear);
  const activeContest = useGeneralStore((state) => state.activeContest);

  const stageName = selectedStage?.name || 'Unknown Stage';
  const defaultTitle = `${contestName} ${contestYear} - ${stageName}`;
  const tableTypeText =
    activeTab === StatsTableType.BREAKDOWN
      ? 'Breakdown'
      : activeTab === StatsTableType.SPLIT
      ? 'Split'
      : 'Summary';
  const voteTypeText =
    selectedVoteType === 'Total' ? 'Total' : selectedVoteType;

  useEffect(() => {
    if (isOpen) setSettings({ title: defaultTitle });
  }, [isOpen, defaultTitle, setSettings]);

  useEffect(() => {
    if (isOpen) onLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Content-sized canvas: the measured width feeds the title/branding font
  // sizes on the next render (docs/graphics-studio.md).
  const [measuredWidth, setMeasuredWidth] = useState(STATS_MIN_WIDTH);
  const handleMeasured = useCallback((size: { width: number }) => {
    setMeasuredWidth((prev) =>
      Math.abs(prev - size.width) > 10 ? size.width : prev,
    );
  }, []);

  const statsSource = useMemo<StatsSource>(
    () => ({
      rankedCountries,
      selectedStage,
      selectedStageId,
      selectedVoteType,
      getCellPoints,
      getCellClassName,
      getPoints,
      aggregateTotalsOnly: aggregateOnly,
    }),
    [
      rankedCountries,
      selectedStage,
      selectedStageId,
      selectedVoteType,
      getCellPoints,
      getCellClassName,
      getPoints,
      aggregateOnly,
    ],
  );

  const design = useMemo(
    () =>
      buildStatsDesign({
        title: settings.title,
        table: activeTab,
        showBackgroundImage: settings.showBackgroundImage,
        backgroundOpacity: settings.backgroundOpacity,
        measuredWidth,
      }),
    [
      settings.title,
      activeTab,
      settings.showBackgroundImage,
      settings.backgroundOpacity,
      measuredWidth,
    ],
  );

  // The tables read the grid lines and voter names from the store, so they
  // count as content: a change re-exports the image.
  const contentKey = useMemo(
    () => ({
      statsSource,
      borderOpacity: settings.borderOpacity,
      showVotingCountriesNames: settings.showVotingCountriesNames,
    }),
    [statsSource, settings.borderOpacity, settings.showVotingCountriesNames],
  );

  const backgroundLevel: BackgroundLevel = !settings.showBackgroundImage
    ? 'off'
    : settings.backgroundOpacity > 0.45
    ? 'strong'
    : 'faint';
  const gridLevel: GridLevel =
    settings.borderOpacity > 0.75 ? 'strong' : 'faint';

  const tables = tableOptions ?? [];

  const primaryOptions =
    onTableChange && tables.length > 1 ? (
      <ShareGroup label={t('table')}>
        <ShareSegmented
          ariaLabel={t('table')}
          value={activeTab}
          onChange={onTableChange}
          options={tables.map((table) => ({
            value: table,
            label: tStats(TABLE_LABEL_KEYS[table]),
          }))}
        />
      </ShareGroup>
    ) : undefined;

  const moreOptions = (
    <>
      <ShareGroup
        label={t('text')}
        aside={
          settings.title !== defaultTitle && (
            <ShareLinkButton
              onClick={() => setSettings({ title: defaultTitle })}
            >
              {tc('reset')}
            </ShareLinkButton>
          )
        }
      >
        <ShareTextField
          label={tc('title')}
          value={settings.title}
          maxLength={100}
          onChange={(value) => setSettings({ title: value })}
        />
      </ShareGroup>

      <ShareGroup label={t('backgroundPicture')}>
        <ShareSegmented
          ariaLabel={t('backgroundPicture')}
          value={backgroundLevel}
          onChange={(level) =>
            setSettings(
              level === 'off'
                ? { showBackgroundImage: false }
                : {
                    showBackgroundImage: true,
                    backgroundOpacity: BACKGROUND_OPACITY[level],
                  },
            )
          }
          options={[
            { value: 'off', label: t('off') },
            { value: 'faint', label: t('faint') },
            { value: 'strong', label: t('strong') },
          ]}
        />
      </ShareGroup>

      <ShareGroup label={t('gridLines')}>
        <ShareSegmented
          ariaLabel={t('gridLines')}
          value={gridLevel}
          onChange={(level) =>
            setSettings({ borderOpacity: GRID_OPACITY[level] })
          }
          options={[
            { value: 'faint', label: t('faint') },
            { value: 'strong', label: t('strong') },
          ]}
        />
      </ShareGroup>

      {activeTab === StatsTableType.BREAKDOWN && (
        <ShareGroup label={t('show')}>
          <div className="grid grid-cols-2 gap-1.5">
            <ShareToggle
              label={t('voterNames')}
              pressed={settings.showVotingCountriesNames}
              onChange={(on) => setSettings({ showVotingCountriesNames: on })}
            />
          </div>
        </ShareGroup>
      )}
    </>
  );

  const fileTitle = settings.title || defaultTitle;

  return (
    <ShareImageModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('titleStats')}
      caption={selectedStage?.name}
      design={design}
      contentKey={contentKey}
      data={{ binding: design.data, stats: statsSource }}
      exportOptions={EXPORT_OPTIONS}
      onMeasured={handleMeasured}
      primaryOptions={primaryOptions}
      moreOptions={moreOptions}
      customizeSummary={t('customizeSummaryStats')}
      customizeOpen={settings.isCustomizationExpanded}
      onCustomizeOpenChange={(open) =>
        setSettings({ isCustomizationExpanded: open })
      }
      onOpenEditor={() => {
        // The editor computes the tables itself from the live stage this
        // modal shows (statsAccessors), so the design binds to that stage
        // rather than to a frozen copy.
        onClose();
        openEditor({
          design: toEditableDesign(design, {
            name: tg('statsDesign'),
            liveStageId: selectedStageId,
          }),
          draftId: null,
          selectId: 'stats',
        });
      }}
      saveFileName={() =>
        `${fileTitle} - ${tableTypeText} - ${voteTypeText} - DouzePoints.app - ${Date.now()}.png`
      }
      share={{
        fileName: `${fileTitle} - DouzePoints.app.png`,
        title: fileTitle,
        text: tStats(TABLE_LABEL_KEYS[activeTab]),
        url: buildShareUrl(activeContest ? { contest: activeContest._id } : {}),
      }}
    />
  );
};

export default ShareStatsModal;
