package app.douzepoints;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.Lifecycle;
import com.getcapacitor.Logger;
import com.getcapacitor.WebViewListener;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Keeps the app alive when the WebView's renderer process dies
 * (docs/native-apps.md §14). Capacitor answers "not handled" by default, and
 * the WebView then takes the whole app down with a SIGTRAP in its own
 * library: the Play vitals crash cluster of 1.0–1.2. Here the dead WebView is
 * dropped and the activity recreated, which builds a fresh bridge and loads
 * the page again; the persisted stores bring the user back to their contest.
 * A renderer that dies in the background (Android freeing memory) is
 * replaced on the next resume instead, so no new renderer starts while the
 * app is out of sight.
 *
 * Each death is recorded for the web side, which reports it to `/errors` on
 * the next page load (`DouzeDiagnostics.takeLastExit`,
 * src/native/crashWatch).
 *
 * A renderer that keeps dying is let through after MAX_RECOVERIES in
 * LOOP_WINDOW_MS: the app crashes as before, so a crash loop shows up in
 * Play vitals instead of the app reloading forever.
 */
final class RendererCrashRecovery extends WebViewListener {

    static final String PREFS = "douze_diagnostics";
    /** The last death, as JSON; DouzeDiagnosticsPlugin hands it to JS once. */
    static final String KEY_LAST_EVENT = "rendererGone";
    /** Times of the recent recoveries, as a JSON array, for the loop guard. */
    private static final String KEY_RECENT = "rendererGoneTimes";

    private static final int MAX_RECOVERIES = 3;
    private static final long LOOP_WINDOW_MS = 60_000;

    private final AppCompatActivity activity;
    private boolean recreateOnResume = false;

    RendererCrashRecovery(AppCompatActivity activity) {
        this.activity = activity;
    }

    @Override
    public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
        // Only ever called on Android 8+, where the detail exists.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false;

        try {
            long now = System.currentTimeMillis();
            boolean visible = activity.getLifecycle().getCurrentState().isAtLeast(Lifecycle.State.STARTED);
            SharedPreferences prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray recent = recentRecoveries(prefs, now);
            boolean giveUp = recent.length() >= MAX_RECOVERIES;

            JSONObject event = new JSONObject();
            event.put("at", now);
            event.put("didCrash", detail.didCrash());
            event.put("rendererPriority", detail.rendererPriorityAtExit());
            event.put("visible", visible);
            event.put("recovered", !giveUp);
            event.put("recentRecoveries", recent.length());

            if (!giveUp) recent.put(now);
            // commit(), not apply(): giving up crashes the app right after.
            prefs.edit().putString(KEY_LAST_EVENT, event.toString()).putString(KEY_RECENT, recent.toString()).commit();

            if (giveUp) {
                Logger.error("RendererCrashRecovery", "Renderer keeps dying, letting the app crash", null);
                return false;
            }

            // The WebView can't be used again: take it out of the layout and
            // free it before anything draws or calls into it.
            ViewParent parent = view.getParent();

            if (parent instanceof ViewGroup) ((ViewGroup) parent).removeView(view);
            view.destroy();

            if (visible) {
                activity.recreate();
            } else {
                recreateOnResume = true;
            }
            return true;
        } catch (Exception e) {
            // Fall back to the WebView's default: the app crashes as before.
            Logger.error("RendererCrashRecovery", "Recovery failed", e);
            return false;
        }
    }

    /** MainActivity.onResume: replaces a WebView lost in the background. */
    void onResume() {
        if (!recreateOnResume) return;
        recreateOnResume = false;
        activity.recreate();
    }

    private static JSONArray recentRecoveries(SharedPreferences prefs, long now) {
        JSONArray recent = new JSONArray();

        try {
            JSONArray saved = new JSONArray(prefs.getString(KEY_RECENT, "[]"));

            for (int index = 0; index < saved.length(); index++) {
                long at = saved.optLong(index, 0);

                if (now - at < LOOP_WINDOW_MS) recent.put(at);
            }
        } catch (Exception e) {
            // A malformed list counts as none.
        }
        return recent;
    }
}
