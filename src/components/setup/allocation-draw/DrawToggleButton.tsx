'use client';
import { Dices, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useCallback, useState } from 'react';
import { toast } from 'react-toastify';

import { useAllocationDrawContext } from './AllocationDrawContext';
import { enterDrawMode, leaveDrawMode } from './drawMode';
import { useDrawUiStore } from './drawUiStore';
import { codesInDrawSemis } from './useAllocationDraw';

import AnchoredMenu, {
  AnchoredMenuEntry,
} from '@/components/common/AnchoredMenu';
import Button from '@/components/common/Button';
import { useContestField } from '@/components/setup/hub/hooks/useContestField';
import { useCountriesStore } from '@/state/countriesStore';

/**
 * Turning draw mode on / off from the contest card. Semis that already hold
 * countries ask what to do with them; leaving with countries still waiting
 * asks too (see `DrawModeDialogs`).
 */
export const useDrawToggle = () => {
  const t = useTranslations('setup.allocationDraw');
  const draw = useAllocationDrawContext();
  const openDialog = useDrawUiStore((s) => s.openDialog);

  const toggle = useCallback(() => {
    if (!draw.available) return;

    if (draw.enabled) {
      if (draw.waitingCodes.length > 0) {
        openDialog('leave');
      } else {
        leaveDrawMode('restore');
        toast.success(t('toastDrawOff'));
      }

      return;
    }

    const { configuredEventStages, eventAssignments } =
      useCountriesStore.getState();
    const inSemis = codesInDrawSemis(
      configuredEventStages,
      eventAssignments,
      draw.rules,
    ).length;

    if (inSemis > 0) {
      openDialog('enter');
    } else {
      enterDrawMode(false);
      toast.success(t('toastDrawOn'));
    }
  }, [
    draw.available,
    draw.enabled,
    draw.waitingCodes.length,
    draw.rules,
    openDialog,
    t,
  ]);

  const reason =
    draw.unavailableReason === 'gfOnly'
      ? t('gfOnlyReason')
      : draw.unavailableReason === 'fewSemis'
      ? t('fewSemisReason')
      : null;
  const shortReason =
    draw.unavailableReason === 'gfOnly'
      ? t('phoneOffGfOnly')
      : draw.unavailableReason === 'fewSemis'
      ? t('phoneNeedsTwoSemis')
      : null;

  return {
    enabled: draw.enabled,
    available: draw.available,
    unavailableReason: draw.unavailableReason,
    reason,
    shortReason,
    waitingCount: draw.waitingCodes.length,
    toggle,
  };
};

interface DrawToggleButtonProps {
  /** Tablet width: short label. */
  compact: boolean;
  size: 'sm' | 'md';
}

/** The "Allocation draw" toggle on tablet / desktop; a disabled toggle explains itself on tap. */
const DrawToggleButton: React.FC<DrawToggleButtonProps> = ({
  compact,
  size,
}) => {
  const t = useTranslations('setup.allocationDraw');
  const { enabled, available, unavailableReason, reason, toggle } =
    useDrawToggle();
  const { handleGfOnlyChange } = useContestField();
  const [reasonAnchor, setReasonAnchor] = useState<HTMLElement | null>(null);

  const reasonItems: AnchoredMenuEntry[] = [
    { variant: 'note', title: t('needsTwoSemis'), text: reason ?? undefined },
    ...(unavailableReason === 'gfOnly'
      ? [
          {
            label: t('turnOffGfOnly'),
            icon: <Trophy className="size-4" />,
            onClick: handleGfOnlyChange,
          },
        ]
      : []),
  ];

  return (
    <>
      <Button
        variant="surface"
        size={size}
        title={t('title')}
        aria-label={t('title')}
        aria-pressed={enabled}
        Icon={<Dices className="size-[17px]" />}
        className={`${enabled ? 'is-on' : ''} ${
          available ? '' : 'opacity-50'
        } whitespace-nowrap`}
        onClick={(e) => {
          if (available) {
            toggle();

            return;
          }

          const target = e.currentTarget;

          setReasonAnchor((prev) => (prev ? null : target));
        }}
      >
        {compact ? t('shortTitle') : t('title')}
      </Button>
      <AnchoredMenu
        open={!!reasonAnchor}
        anchor={reasonAnchor}
        onClose={() => setReasonAnchor(null)}
        items={reasonItems}
        placement="bottom-end"
        ariaLabel={t('title')}
      />
    </>
  );
};

export default DrawToggleButton;
