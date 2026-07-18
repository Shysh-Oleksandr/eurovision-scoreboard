import React, { ReactNode } from 'react';

import { Highlight } from './Highlight';
import { InlineTip } from './InlineTip';

interface SettingsRowProps {
  label: string;
  desc?: string;
  tipKey?: string;
  query?: string;
  control?: ReactNode;
  onRowClick?: () => void;
}

/**
 * Unified settings-row shell: label (+ optional ℹ tooltip and description) on the
 * left, a control on the right. The whole row is clickable when `onRowClick` is set.
 */
export const SettingsRow: React.FC<SettingsRowProps> = ({
  label,
  desc,
  tipKey,
  query,
  control,
  onRowClick,
}) => (
  <div
    className={`flex items-center gap-4 rounded-[10px] px-3 py-[11px] transition-colors ${
      onRowClick ? 'cursor-pointer hover:bg-white/[0.06]' : ''
    }`}
    onClick={onRowClick}
  >
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-[7px] text-[14.5px] font-semibold text-white">
        <span>
          <Highlight text={label} query={query} />
        </span>
        {tipKey && (
          <span
            className="flex"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <InlineTip tipKey={tipKey} />
          </span>
        )}
      </div>
      {desc && (
        <p className="mt-0.5 text-[12.5px] text-white/50">
          <Highlight text={desc} query={query} />
        </p>
      )}
    </div>
    {control && <div className="shrink-0">{control}</div>}
  </div>
);
