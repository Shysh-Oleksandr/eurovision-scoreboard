import { describe, expect, it } from 'vitest';

import { contestHostCountry, getHostingCountryLogo } from './hosting';

describe('contestHostCountry', () => {
  const barnsley = {
    code: 'custom-abc',
    name: 'Barnsley',
    flag: 'https://cdn.example/b.png',
  };

  it('keeps a standard host as its code', () => {
    expect(contestHostCountry({ hostingCountryCode: 'SE' })).toBe('SE');
  });

  it('draws a custom host from the contest, then from local entries', () => {
    expect(
      contestHostCountry({ hostingCountryCode: 'custom-abc', host: barnsley }),
    ).toEqual(barnsley);
    expect(
      contestHostCountry({ hostingCountryCode: 'custom-abc' }, [barnsley]),
    ).toBe(barnsley);
  });

  it('falls back to the globe for a custom host it cannot find', () => {
    const host = contestHostCountry({ hostingCountryCode: 'custom-zzz' });

    expect(getHostingCountryLogo(host)).toEqual({
      logo: '/flags/ww.svg',
      isExisting: false,
    });
  });

  it("uses a custom host's own flag", () => {
    expect(getHostingCountryLogo(barnsley)).toEqual({
      logo: barnsley.flag,
      isExisting: false,
    });
  });
});
