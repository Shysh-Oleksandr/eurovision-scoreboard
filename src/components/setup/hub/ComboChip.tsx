import React from 'react';

import IconButtonTooltip from '@/components/common/IconButtonTooltip';
import { useGeneralStore } from '@/state/generalStore';

type ComboChipProps = {
  icon: React.ReactNode;
  title: string;
  active: boolean;
  disabled?: boolean;
  disabledTitle?: string;
  onClick: () => void;
};

/** 36px toggle chip docked to the right edge of a `ComboField`. */
const ComboChip = ({
  icon,
  title,
  active,
  disabled = false,
  disabledTitle,
  onClick,
}: ComboChipProps) => {
  const enableIconButtonTooltips = useGeneralStore(
    (state) => state.settings.enableIconButtonTooltips,
  );
  const tooltip = disabled && disabledTitle ? disabledTitle : title;

  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={tooltip}
      title={enableIconButtonTooltips ? undefined : tooltip}
      className={`dp-combo-chip ${
        active ? 'is-on' : ''
      } w-[30px] 2cols:w-9 flex-none grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {icon}
    </button>
  );

  if (!enableIconButtonTooltips) return button;

  return <IconButtonTooltip content={tooltip}>{button}</IconButtonTooltip>;
};

export default ComboChip;
