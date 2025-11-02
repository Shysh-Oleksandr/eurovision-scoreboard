import React, { useMemo, useState } from 'react';

import ThemePreviewCountryItemCompact from './ThemePreviewCountryItemCompact';

import Button from '@/components/common/Button';
import { formatDate } from '@/components/feedbackInfo/types';
import { useAuthStore } from '@/state/useAuthStore';
import { getCssVarsForCustomTheme } from '@/theme/themeUtils';
import { CustomTheme } from '@/types/customTheme';

interface ThemeListItemProps {
  theme: CustomTheme;
  variant: 'user' | 'public';
  onEdit?: (theme: CustomTheme) => void;
  onDelete?: (id: string) => void;
  onApply: (theme: CustomTheme) => void;
  onLike?: (id: string) => void;
  onDuplicate: (theme: CustomTheme) => void;
  isApplied?: boolean;
}

const ThemeListItem: React.FC<ThemeListItemProps> = ({
  theme,
  variant,
  onEdit,
  onDelete,
  onApply,
  // onLike,
  onDuplicate,
  isApplied,
}) => {
  const user = useAuthStore((state) => state.user);
  const isMyTheme = variant === 'user' || theme.userId.toString() === user?._id;

  const [points, setPoints] = useState(42);
  const [lastPoints, setLastPoints] = useState<number | null>(12);
  const [showDouzePointsAnimation, setShowDouzePointsAnimation] =
    useState(false);

  const handleAwardPoints = (value: number) => {
    setLastPoints(value);
    setPoints((prev) => prev + value);

    setShowDouzePointsAnimation(true);
    // Reset animation state after animation completes
    setTimeout(() => {
      setShowDouzePointsAnimation(false);
    }, 3000); // Animation duration
  };

  const cssVars = useMemo(() => getCssVarsForCustomTheme(theme), [theme]);

  return (
    <div
      className="bg-primary-950 bg-gradient-to-bl from-primary-950 to-primary-800/60 shadow-lg rounded-lg overflow-hidden border border-white/20 hover:border-white/40 transition-colors"
      style={cssVars as React.CSSProperties}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-lg truncate mb-1">
              <div className="flex items-center justify-between">
                <span className="truncate">{theme.name}</span>

                <span className="text-xs text-white/60">
                  {formatDate(theme.createdAt)}
                </span>
              </div>
            </h3>
            {theme.description && (
              <p className="text-white/70 text-sm line-clamp-2">
                {theme.description}
              </p>
            )}
          </div>
        </div>

        <div className="mb-2 md:gap-4 gap-2 flex justify-center sm:items-center items-start sm:flex-row-reverse flex-col">
          <ThemePreviewCountryItemCompact
            backgroundImage={theme.backgroundImageUrl || null}
            overrides={theme.overrides || {}}
            baseThemeYear={theme.baseThemeYear}
            points={points}
            lastPoints={lastPoints}
            showDouzePointsAnimation={showDouzePointsAnimation}
            isListItem
            onClick={() => handleAwardPoints(12)}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="primary"
            onClick={() => onApply(theme)}
            className="!py-2 !px-4 !text-base"
            disabled={isApplied}
          >
            {isApplied ? 'Applied' : 'Apply'}
          </Button>
          <Button
            variant="tertiary"
            onClick={() => onDuplicate(theme)}
            className="!py-2 !px-4 !text-base"
            disabled={!user}
          >
            Duplicate
          </Button>

          {isMyTheme && onEdit && (
            <Button
              variant="tertiary"
              onClick={() => onEdit(theme)}
              className="!py-2 !px-4 !text-base"
            >
              Edit
            </Button>
          )}

          {isMyTheme && onDelete && (
            <Button
              variant="destructive"
              onClick={() => {
                if (window.confirm(`Delete the "${theme.name}" theme?`)) {
                  onDelete(theme._id);
                }
              }}
              className="!py-2 !px-4 !text-base text-red-300 hover:text-red-200"
            >
              Delete
            </Button>
          )}

          {/* {variant === 'public' && !isMyTheme && onLike && (
            <Button
              variant="tertiary"
              onClick={() => onLike(theme._id)}
              className="!py-2 !px-4 !text-base"
              disabled={!user}
            >
              Like
            </Button>
          )} */}
        </div>
      </div>
    </div>
  );
};

export default ThemeListItem;
