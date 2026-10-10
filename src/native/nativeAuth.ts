/**
 * Auth plumbing for the native apps (see docs/native-apps.md §7).
 *
 * The website signs in with a full-page redirect to the backend's Google
 * OAuth flow and keeps the refresh token in an httpOnly cookie on
 * api.douzepoints.app. Neither works in the apps: Google refuses OAuth inside
 * WebViews, and the WebView will not keep that cross-site cookie. So:
 * - sign-in uses the platform's Google SDK (`@capgo/capacitor-social-login`)
 *   and exchanges its ID token at `POST /auth/google/native` for an access +
 *   refresh token pair;
 * - the refresh token lives in the Keychain / Android Keystore
 *   (`@aparajita/capacitor-secure-storage`) and is sent as
 *   `Authorization: Bearer` to `/auth/refresh` and `/auth/logout`.
 *
 * Plugins are imported lazily so they stay out of the website's bundle.
 * Never return a plugin object from an async function: Capacitor plugin
 * proxies answer to every property, `then` included, so the promise would
 * treat the plugin as a thenable and call a native "then" method.
 */

/** OAuth "Web application" client: the ID token audience on both platforms. */
const GOOGLE_WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
/** OAuth "iOS" client for the app's bundle ID (unused on Android). */
const GOOGLE_IOS_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

const REFRESH_TOKEN_KEY = 'refresh-token';

const loadSecureStorage = () => import('@aparajita/capacitor-secure-storage');

export async function getRefreshToken(): Promise<string | null> {
  try {
    const { SecureStorage } = await loadSecureStorage();

    return await SecureStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to read the refresh token', error);

    return null;
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  const { SecureStorage } = await loadSecureStorage();

  await SecureStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export async function clearRefreshToken(): Promise<void> {
  try {
    const { SecureStorage } = await loadSecureStorage();

    await SecureStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear the refresh token', error);
  }
}

let googleInit: Promise<void> | null = null;

const loadSocialLogin = () => import('@capgo/capacitor-social-login');

/** Initializes the Google provider once (see the module note on proxies). */
async function ensureGoogle(): Promise<void> {
  const { SocialLogin } = await loadSocialLogin();

  if (!googleInit) {
    const { Capacitor } = await import('@capacitor/core');

    // Fail with a readable error instead of the iOS SDK's exception.
    if (
      !GOOGLE_WEB_CLIENT_ID ||
      (Capacitor.getPlatform() === 'ios' && !GOOGLE_IOS_CLIENT_ID)
    ) {
      throw new Error(
        'Google sign-in is not configured: set NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID and NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID (docs/native-apps.md)',
      );
    }

    googleInit = SocialLogin.initialize({
      google: {
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iOSClientId: GOOGLE_IOS_CLIENT_ID || undefined,
        iOSServerClientId: GOOGLE_WEB_CLIENT_ID,
        mode: 'online',
      },
    }).catch((error) => {
      googleInit = null;
      throw error;
    });
  }

  await googleInit;
}

const isCancellation = (error: unknown) =>
  /cancel/i.test(
    error instanceof Error ? error.message : String((error as any)?.message),
  );

/**
 * Shows the platform's Google account sheet and returns the ID token, or null
 * when the user dismissed it.
 */
export async function getGoogleIdToken(): Promise<string | null> {
  await ensureGoogle();
  const { SocialLogin } = await loadSocialLogin();

  try {
    const { result } = await SocialLogin.login({
      provider: 'google',
      options: { scopes: ['email', 'profile'] },
    });
    const idToken = result.responseType === 'online' ? result.idToken : null;

    if (!idToken) throw new Error('Google sign-in returned no ID token');

    return idToken;
  } catch (error) {
    if (isCancellation(error)) return null;
    throw error;
  }
}

/** Forget the Google account so the next sign-in shows the account sheet. */
export async function signOutOfGoogle(): Promise<void> {
  try {
    await ensureGoogle();
    const { SocialLogin } = await loadSocialLogin();

    await SocialLogin.logout({ provider: 'google' });
  } catch {
    // Not signed in, or not configured: nothing to forget.
  }
}
