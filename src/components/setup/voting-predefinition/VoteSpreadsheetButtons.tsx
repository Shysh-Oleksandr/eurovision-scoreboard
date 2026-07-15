'use client';

import { Download, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useRef } from 'react';

import { Tooltip } from '@/components/common/Tooltip';

type VoteSpreadsheetButtonsProps = {
  onImport?: (file: File) => void | Promise<void>;
  onExport?: () => void;
  showImport?: boolean;
  disabled?: boolean;
  className?: string;
};

export const VoteSpreadsheetFormatTooltipContent: React.FC<{
  withDragDrop?: boolean;
}> = ({ withDragDrop = true }) => {
  const t = useTranslations('setup.votingPredefinition.spreadsheet');

  return (
    <div className="space-y-2 font-medium">
      <p>{t('tooltipIntro')}</p>
      <ul className="list-disc pl-4 space-y-1">
        <li>{t('tooltipRowFormat')}</li>
        <li>{t('tooltipSections')}</li>
        <li>{t('tooltipFlexible')}</li>
        {withDragDrop && <li>{t('tooltipDragDrop')}</li>}
      </ul>
    </div>
  );
};

export const VoteSpreadsheetButtons: React.FC<VoteSpreadsheetButtonsProps> = ({
  onImport,
  onExport,
  showImport = true,
  disabled = false,
  className = '',
}) => {
  const t = useTranslations('setup.votingPredefinition.spreadsheet');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = '';
    if (!file || !onImport) return;
    void onImport(file);
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {showImport && onImport && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            title={t('import')}
            aria-label={t('import')}
          >
            <Upload className="sm:w-4 sm:h-4 w-5 h-5" />
            <span className="hidden sm:inline">{t('import')}</span>
          </button>
        </>
      )}

      {onExport && (
        <button
          type="button"
          disabled={disabled}
          onClick={onExport}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          title={t('export')}
          aria-label={t('export')}
        >
          <Download className="sm:w-4 sm:h-4 w-5 h-5" />
          <span className="hidden sm:inline">{t('export')}</span>
        </button>
      )}

      <Tooltip
        position="right"
        classNameIcon="!mt-0"
        content={
          <VoteSpreadsheetFormatTooltipContent withDragDrop={showImport} />
        }
      >
        <span className="sr-only">{t('formatHelp')}</span>
      </Tooltip>
    </div>
  );
};

export default VoteSpreadsheetButtons;
