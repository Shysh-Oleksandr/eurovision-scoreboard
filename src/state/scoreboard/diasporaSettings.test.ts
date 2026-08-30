import { describe, expect, it } from 'vitest';

import { diasporaPresets } from './diaspora';
import { DEFAULT_DIASPORA_SETTINGS } from './diasporaSettings';

describe('diaspora settings split', () => {
  it('keeps the hardcoded default group ids in sync with the presets JSON', () => {
    // DEFAULT_DIASPORA_SETTINGS lives in the JSON-free module so the boot path
    // doesn't pull the 46 KB presets file in; this guards the literal against
    // preset edits that change which groups are defaultOn.
    const fromJson = diasporaPresets.groups
      .filter((g) => g.defaultOn)
      .map((g) => g.id);

    expect(DEFAULT_DIASPORA_SETTINGS.enabledGroupIds).toEqual(fromJson);
  });
});
