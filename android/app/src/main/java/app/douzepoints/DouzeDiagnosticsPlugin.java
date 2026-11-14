package app.douzepoints;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * How the previous launch ended, for the web side's crash reports
 * (src/native/crashWatch, docs/native-apps.md §14):
 *
 * - whether the app was in the foreground when its process ended, saved
 *   with commit() at every resume and pause. The page's own record can lag:
 *   the WebView reports "hidden" about two seconds after the app leaves
 *   the screen, and its localStorage reaches the disk later still, so a
 *   swipe-away right after leaving would look like a crash;
 * - the renderer death RendererCrashRecovery recorded, if any.
 *
 * Keep WebView types out of this class: Capacitor reflects over plugin
 * methods, and Android 7 can't resolve RenderProcessGoneDetail.
 */
@CapacitorPlugin(name = "DouzeDiagnostics")
public class DouzeDiagnosticsPlugin extends Plugin {

    private static final String KEY_FOREGROUND = "foreground";

    /** Read before this launch's first resume overwrites it; null at first. */
    private Boolean previousForeground;
    private boolean lastExitTaken = false;

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(RendererCrashRecovery.PREFS, Context.MODE_PRIVATE);
    }

    @Override
    public void load() {
        try {
            SharedPreferences prefs = prefs();

            if (prefs.contains(KEY_FOREGROUND)) previousForeground = prefs.getBoolean(KEY_FOREGROUND, false);
        } catch (Exception e) {
            Logger.error("DouzeDiagnostics", "Reading the last exit failed", e);
        }
    }

    @Override
    protected void handleOnResume() {
        saveForeground(true);
    }

    @Override
    protected void handleOnPause() {
        saveForeground(false);
    }

    private void saveForeground(boolean foreground) {
        try {
            // commit(): the process may be gone before an apply() lands.
            prefs().edit().putBoolean(KEY_FOREGROUND, foreground).commit();
        } catch (Exception e) {
            Logger.error("DouzeDiagnostics", "Saving the foreground state failed", e);
        }
    }

    /**
     * `{ foreground?, rendererGone? }`: `foreground` once per launch (a
     * reload of the page gets nothing), `rendererGone` once per death.
     */
    @PluginMethod
    public void takeLastExit(PluginCall call) {
        JSObject result = new JSObject();

        // Capacitor turns an exception in a plugin method into an app crash.
        try {
            if (!lastExitTaken) {
                lastExitTaken = true;
                if (previousForeground != null) result.put("foreground", previousForeground.booleanValue());
            }

            SharedPreferences prefs = prefs();
            String raw = prefs.getString(RendererCrashRecovery.KEY_LAST_EVENT, null);

            if (raw != null) {
                prefs.edit().remove(RendererCrashRecovery.KEY_LAST_EVENT).apply();
                result.put("rendererGone", new JSObject(raw));
            }
        } catch (Exception e) {
            Logger.error("DouzeDiagnostics", "takeLastExit failed", e);
        }
        call.resolve(result);
    }
}
