import { useTranslations } from 'next-intl';
import React from 'react';

import { Tooltip } from '@/components/common/Tooltip';

interface InlineTipProps {
  tipKey: string;
  position?: 'left' | 'right' | 'center';
}

/**
 * The ℹ tooltip trigger shown after a setting label. Wraps the shared `Tooltip`
 * (which portals + repositions) and resolves the copy via `t.rich` so tooltips
 * containing `<br>` render correctly.
 */
export const InlineTip: React.FC<InlineTipProps> = ({
  tipKey,
  position = 'left',
}) => {
  const t = useTranslations();

  return (
    <Tooltip
      position={position}
      content={
        <div className="font-medium">
          {t.rich(tipKey, { br: () => <br /> })}
        </div>
      }
    />
  );
};
