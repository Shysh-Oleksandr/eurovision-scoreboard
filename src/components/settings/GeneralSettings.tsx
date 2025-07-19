import React from 'react';

import { useGeneralStore } from '../../state/generalStore';
import { Checkbox } from '../common/Checkbox';
import { CollapsibleSection } from '../common/CollapsibleSection';

export const GeneralSettings: React.FC = () => {
  const alwaysShowRankings = useGeneralStore(
    (state) => state.alwaysShowRankings,
  );
  const setAlwaysShowRankings = useGeneralStore(
    (state) => state.setAlwaysShowRankings,
  );

  return (
    <div className="flex flex-col gap-4">
      <CollapsibleSection title="Visuals" defaultExpanded>
        <Checkbox
          id="show-place-number"
          labelClassName="w-full"
          label="Always show rankings"
          checked={alwaysShowRankings}
          onChange={(e) => setAlwaysShowRankings(e.target.checked)}
        />
      </CollapsibleSection>
    </div>
  );
};
