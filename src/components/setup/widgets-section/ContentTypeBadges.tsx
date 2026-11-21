import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useRef } from 'react';

import type { UserContentType } from '@/api/userContent';
import { ThemeIcon } from '@/assets/icons/ThemeIcon';
import { TrophyIcon } from '@/assets/icons/TrophyIcon';
import { fitStepAttributes, useFitStep } from '@/hooks/useFitStep';
import { playHaptic } from '@/native/haptics';

export const CONTENT_TYPE_OPTIONS: {
  id: UserContentType;
  labelKey: string;
  Icon?: React.ReactNode;
}[] = [
  { id: 'all', labelKey: 'widgets.contentType.all' },
  {
    id: 'themes',
    labelKey: 'widgets.contentType.themes',
    Icon: <ThemeIcon className="w-4 h-4 flex-none" />,
  },
  {
    id: 'contests',
    labelKey: 'widgets.contentType.contests',
    Icon: <TrophyIcon className="w-4 h-4 flex-none" />,
  },
  {
    id: 'designs',
    labelKey: 'widgets.contentType.designs',
    Icon: <Sparkles className="w-4 h-4 flex-none" />,
  },
];

/**
 * Icons and labels on one row; then labels only; then two rows of two
 * (long translations in a narrow column).
 */
const TYPE_STEPS = [{ seg: 'full' }, { seg: 'text' }, { seg: 'grid' }] as const;

interface ContentTypeBadgesProps {
  value: UserContentType;
  onChange: (type: UserContentType) => void;
  options?: { id: UserContentType; labelKey: string; Icon?: React.ReactNode }[];
  className?: string;
}

/**
 * All / Themes / Contests / Designs as the simulation's segmented well
 * (`dp-sim-seg`): the chosen one on `--p-750` with an accent ring.
 */
const ContentTypeBadges: React.FC<ContentTypeBadgesProps> = ({
  value,
  onChange,
  options = CONTENT_TYPE_OPTIONS,
  className = '',
}) => {
  const t = useTranslations();
  const ref = useRef<HTMLDivElement>(null);
  const step = useFitStep(ref, TYPE_STEPS);

  return (
    <div
      ref={ref}
      role="radiogroup"
      {...fitStepAttributes(TYPE_STEPS[step])}
      className={`dp-type-seg dp-sim-seg ${className}`}
    >
      {options.map((opt) => {
        const isOn = value === opt.id;

        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isOn}
            onClick={() => {
              if (isOn) return;
              playHaptic({ id: 'selection' });
              onChange(opt.id);
            }}
            className={isOn ? 'is-on' : 'text-white/70 hover:text-white'}
          >
            {opt.Icon}
            <span>{t(opt.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ContentTypeBadges;
