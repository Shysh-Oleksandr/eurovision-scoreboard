let cached: boolean | null = null;

/**
 * macOS and iOS/iPadOS: ⌘ is the command key there, Ctrl elsewhere. False
 * on the server.
 */
export const isApplePlatform = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  if (cached === null) {
    const platform =
      (navigator as Navigator & { userAgentData?: { platform?: string } })
        .userAgentData?.platform ||
      navigator.platform ||
      navigator.userAgent;

    cached = /mac|iphone|ipad|ipod/i.test(platform);
  }

  return cached;
};
