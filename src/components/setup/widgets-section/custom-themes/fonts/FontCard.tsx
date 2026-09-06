import { useTranslations } from 'next-intl';
import React from 'react';

import { fontSampleText } from './fontPickerTypes';

import { fontToSnapshot } from '@/api/fonts';
import UserInfo from '@/components/common/UserInfo';
import { useAuthStore } from '@/state/useAuthStore';
import { getCustomFontFamilyCss } from '@/theme/customFonts';
import { useCustomFontFaces } from '@/theme/useCustomFontFaces';
import type { Font } from '@/types/font';

interface FontCardProps {
  font: Font;
  selected?: boolean;
  /** Extra chips after the name (e.g. "Public", "In your library"). */
  chips?: React.ReactNode;
  /** Right-aligned controls. */
  actions?: React.ReactNode;
  showCreator?: boolean;
  /** Expanded content (the editor) rendered under the summary. */
  children?: React.ReactNode;
}

export const weightsSummary = (font: Font): string => {
  if (font.isVariable) {
    const range = font.faces[0]?.wghtRange;

    return range ? `wght ${range[0]}–${range[1]}` : 'wght';
  }

  return font.faces.map((f) => f.weight).join(' · ');
};

/** Compact library row: name and sample rendered in the font itself, meta, actions. */
const FontCard: React.FC<FontCardProps> = ({
  font,
  selected = false,
  chips,
  actions,
  showCreator = false,
  children,
}) => {
  const t = useTranslations('widgets.themes.fonts');
  const userCountry = useAuthStore((s) => s.user?.country);
  const snapshot = fontToSnapshot(font);
  const fontFamily = getCustomFontFamilyCss(snapshot, 'montserrat');
  const sampleText = fontSampleText(font.creator?.country || userCountry);

  useCustomFontFaces(snapshot);

  return (
    <div
      className={`rounded-[14px] border p-3 sm:p-4 space-y-3 transition-colors ${
        selected
          ? 'border-white/70 bg-white/[0.1]'
          : 'border-white/10 bg-black/20'
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className="text-white text-lg font-bold truncate"
              style={{ fontFamily, fontSynthesis: 'none' }}
            >
              {font.name}
            </h4>
            <span className="text-[11px] font-bold text-white/70 bg-black/[0.28] rounded-full px-2.5 py-[3px] whitespace-nowrap">
              {font.isVariable ? t('variableChip') : weightsSummary(font)}
            </span>
            {chips}
          </div>
          <p
            className="text-sm text-white/80 mt-1 truncate"
            style={{ fontFamily, fontSynthesis: 'none' }}
          >
            {sampleText}
          </p>
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-white/60 mt-1.5">
            {typeof font.usedByThemesCount === 'number' && (
              <span>
                {t('usedByNThemes', { count: font.usedByThemesCount })}
              </span>
            )}
            {font.forksCount > 0 && (
              <span>{t('copies', { count: font.forksCount })}</span>
            )}
            {font.forkedFromName && (
              <span className="truncate">
                {t('forkedFrom', { name: font.forkedFromName })}
              </span>
            )}
          </div>
          {showCreator && font.creator && (
            <div className="mt-2">
              <UserInfo user={font.creator} size="sm" />
            </div>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

export default FontCard;
