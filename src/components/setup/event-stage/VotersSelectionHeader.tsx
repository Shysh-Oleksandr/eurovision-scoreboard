import { Split } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useRef } from 'react';

import { ListRestartIcon } from '@/assets/icons/ListRestartIcon';
import { RestartIcon } from '@/assets/icons/RestartIcon';
import ShuffleIcon from '@/assets/icons/ShuffleIcon';
import SortAZIcon from '@/assets/icons/SortAZIcon';
import SortZAIcon from '@/assets/icons/SortZAIcon';
import Button from '@/components/common/Button';
import { useReadableForegroundFromCssVar } from '@/theme/useReadableForegroundFromCssVar';

interface VotersSelectionHeaderProps {
  onReset: () => void;
  onClearAll: () => void;
  onSort: (sort: 'az' | 'za' | 'shuffle') => void;
  handleFilter: (
    action: 'inStage' | 'otherStage' | 'allParticipants' | 'yearData',
  ) => void;
  votersAmount: number;
  disableLoadYearData: boolean;
  /** Per-channel voter counts; shown only when they differ. */
  channelCounts?: { jury: number; televote: number };
  /** Voter channels editing toggle; omitted when the mode has one channel. */
  showChannelControls?: boolean;
  onToggleChannelControls?: () => void;
  /** Rendered between the header row and the quick-fill row. */
  note?: React.ReactNode;
}

const VotersSelectionHeader: React.FC<VotersSelectionHeaderProps> = ({
  onReset,
  onClearAll,
  onSort,
  votersAmount,
  handleFilter,
  disableLoadYearData,
  channelCounts,
  showChannelControls = false,
  onToggleChannelControls,
  note,
}) => {
  const t = useTranslations();
  const tCommon = useTranslations('common');

  const showCounts =
    channelCounts && channelCounts.jury !== channelCounts.televote;
  const hasChannelsButton = Boolean(onToggleChannelControls);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex sm:flex-row flex-col sm:items-start sm:justify-between gap-2.5">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-white">
            {t('setup.eventStageModal.votingCountries', {
              count: votersAmount,
            })}
          </h3>
          <p className="text-sm text-white/50 flex flex-wrap items-center gap-x-2 gap-y-1">
            {showChannelControls ? (
              <>
                <span className="hidden sm:inline">
                  {t('setup.eventStageModal.voterChannelsHint')}
                </span>
                <span className="sm:hidden">
                  {t('setup.eventStageModal.voterChannelsHintShort')}
                </span>
              </>
            ) : (
              <span>{t('setup.eventStageModal.dragAndDropToReorder')}</span>
            )}
            {showCounts && (
              <span className="inline-flex items-center gap-[7px] pl-[9px] border-l border-white/[0.18] font-bold text-white/70 whitespace-nowrap">
                <span className="uppercase text-[12.5px] font-extrabold tracking-[0.04em] text-white/45">
                  {t('setup.eventStageModal.jury')}
                </span>
                {channelCounts.jury}
                <span className="w-[3px] h-[3px] rounded-full bg-white/30" />
                <span className="uppercase text-[12.5px] font-extrabold tracking-[0.04em] text-white/45">
                  {t('setup.eventStageModal.televote')}
                </span>
                {channelCounts.televote}
              </span>
            )}
          </p>
        </div>

        {/* Phones: the toolbar gets its own full-width row of 44px buttons. */}
        <div
          className={`flex-none grid gap-[5px] sm:flex sm:items-center sm:gap-2 ${
            hasChannelsButton ? 'grid-cols-6' : 'grid-cols-5'
          }`}
        >
          <ActionButton
            onClick={() => onSort('az')}
            title={tCommon('sortAZ')}
            icon={<SortAZIcon className="w-5 h-5" />}
          />
          <ActionButton
            onClick={() => onSort('za')}
            title={tCommon('sortZA')}
            icon={<SortZAIcon className="w-5 h-5" />}
          />
          <ActionButton
            onClick={() => onSort('shuffle')}
            title={tCommon('shuffle')}
            icon={<ShuffleIcon className="w-5 h-5" />}
          />
          <ActionButton
            onClick={onReset}
            title={tCommon('resetList')}
            icon={<ListRestartIcon className="w-5 h-5" />}
          />
          <ActionButton
            onClick={onClearAll}
            title={tCommon('clearAll')}
            icon={<RestartIcon className="w-5 h-5" />}
          />
          {onToggleChannelControls && (
            <>
              {/* Hairline: this button changes the list's mode, it doesn't act on it. */}
              <span className="hidden sm:block w-px h-[26px] mx-[3px] bg-white/[0.14]" />
              <ChannelsToggleButton
                isActive={showChannelControls}
                onClick={onToggleChannelControls}
                title={
                  showChannelControls
                    ? t('setup.eventStageModal.voterChannelsDone')
                    : t('setup.eventStageModal.voterChannels')
                }
              />
            </>
          )}
        </div>
      </div>

      {note}

      <div className="grid grid-cols-2 gap-[7px] sm:flex sm:flex-wrap sm:gap-2">
        <Button
          className="!py-2 normal-case"
          variant="tertiary"
          onClick={() => handleFilter('yearData')}
          disabled={disableLoadYearData}
          label={t('common.loadYearData')}
        />
        <Button
          className="!py-2 normal-case"
          variant="tertiary"
          onClick={() => handleFilter('inStage')}
          label={t('setup.eventStageModal.inStageOnly')}
        />
        <Button
          className="!py-2 normal-case"
          variant="tertiary"
          onClick={() => handleFilter('otherStage')}
          label={t('setup.eventStageModal.otherStageOnly')}
        />
        <Button
          className="!py-2 normal-case"
          variant="tertiary"
          onClick={() => handleFilter('allParticipants')}
          label={t('setup.eventStageModal.allParticipants')}
        />
      </div>
    </div>
  );
};

const ACTION_BUTTON_CLASS =
  '!p-0 h-11 w-full flex items-center justify-center sm:!p-2.5 sm:h-auto sm:w-auto';

const ActionButton = ({
  onClick,
  title,
  icon,
}: {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
}) => {
  return (
    <Button
      onClick={onClick}
      className={ACTION_BUTTON_CLASS}
      aria-label={title}
      title={title}
    >
      {icon}
    </Button>
  );
};

/** Toggle button: ghost when off, active-tab gradient when on. */
const ChannelsToggleButton = ({
  isActive,
  onClick,
  title,
}: {
  isActive: boolean;
  onClick: () => void;
  title: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const activeColor = useReadableForegroundFromCssVar(ref, '--twc-primary-700');

  return (
    <div ref={ref} className="contents">
      <Button
        onClick={onClick}
        className={ACTION_BUTTON_CLASS}
        aria-label={title}
        aria-pressed={isActive}
        title={title}
        style={
          isActive
            ? {
                color: activeColor,
                background:
                  'linear-gradient(180deg, hsl(var(--twc-primary-700)), hsl(var(--twc-primary-800)))',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 14px rgba(0,0,0,0.35)',
              }
            : undefined
        }
      >
        <Split className="w-5 h-5" />
      </Button>
    </div>
  );
};

export default VotersSelectionHeader;
