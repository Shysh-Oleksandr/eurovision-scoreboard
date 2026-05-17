export function isGoogleAvatarUrl(url: string | null | undefined): boolean {
  if (!url) return false;

  try {
    const parsedUrl = new URL(url);

    return (
      parsedUrl.protocol === 'https:' &&
      parsedUrl.hostname === 'lh3.googleusercontent.com' &&
      /^\/a-?\//.test(parsedUrl.pathname)
    );
  } catch {
    return false;
  }
}
