import { Folder, Plus } from 'lucide-react';
import React from 'react';

import { PencilIcon } from '@/assets/icons/PencilIcon';
import Badge from '@/components/common/Badge';
import { cn } from '@/helpers/utils';

export interface ResourceGroupRowItem {
  _id: string;
  name: string;
}

interface WidgetResourceGroupBadgesProps {
  groups: ResourceGroupRowItem[];
  selectedGroupId: string | null;
  onSelectAll: () => void;
  onSelectGroup: (id: string) => void;
  onAddGroup: () => void;
  onEditGroup: (group: ResourceGroupRowItem) => void;
  allLabel: string;
  addGroupAriaLabel: string;
  editGroupAriaLabel: string;
  className?: string;
}

const WidgetResourceGroupBadges: React.FC<WidgetResourceGroupBadgesProps> = ({
  groups,
  selectedGroupId,
  onSelectAll,
  onSelectGroup,
  onAddGroup,
  onEditGroup,
  allLabel,
  addGroupAriaLabel,
  editGroupAriaLabel,
  className = '',
}) => {
  return (
    <div
      className={cn(
        'flex items-center flex-wrap justify-start gap-2',
        className,
      )}
    >
      <Folder className="w-6 h-6 text-white/80 flex-none" />
      <Badge
        label={allLabel}
        onClick={onSelectAll}
        isActive={selectedGroupId === null}
      />
      {groups.map((g) => {
        const isActive = selectedGroupId === g._id;

        return (
          <div key={g._id} className="inline-flex items-center gap-1">
            <Badge
              label={g.name}
              onClick={() => onSelectGroup(g._id)}
              isActive={isActive}
              Icon
            >
              {isActive && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditGroup(g);
                  }}
                  className="p-1 rounded-full text-white/70 hover:text-white hover:bg-primary-900 transition-colors"
                  aria-label={editGroupAriaLabel}
                >
                  <PencilIcon className="w-4 h-4" />
                </div>
              )}
            </Badge>
          </div>
        );
      })}
      <button
        type="button"
        onClick={onAddGroup}
        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary-900 hover:bg-primary-800 text-white/80 hover:text-white transition-colors border border-white/10"
        aria-label={addGroupAriaLabel}
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
};

export default WidgetResourceGroupBadges;
