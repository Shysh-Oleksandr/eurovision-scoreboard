package app.douzepoints;

import android.graphics.Color;
import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private RendererCrashRecovery rendererCrashRecovery;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-local plugins must be registered before the bridge starts.
        registerPlugin(MediaSaverPlugin.class);
        registerPlugin(DouzeHapticsPlugin.class);
        registerPlugin(DouzeDiagnosticsPlugin.class);
        super.onCreate(savedInstanceState);
        // After the bridge exists: the builder replaces the listener list
        // once the plugins have loaded, so a plugin can't add this in load().
        if (getBridge() != null) {
            rendererCrashRecovery = new RendererCrashRecovery(this);
            getBridge().addWebViewListener(rendererCrashRecovery);
        }
        // Draw behind transparent system bars on Android 14 and older too
        // (15+ enforces it), so the theme shows through as on iOS. Without
        // this, WebView 140+ gets the real insets as `--safe-*` while the
        // window still pads it: double padding and bars in windowBackground.
        // Light icons, no 3-button nav scrim: every theme is dark
        // (docs/native-apps.md §8).
        EdgeToEdge.enable(
            this,
            SystemBarStyle.dark(Color.TRANSPARENT),
            SystemBarStyle.dark(Color.TRANSPARENT)
        );
    }

    @Override
    public void onResume() {
        super.onResume();
        if (rendererCrashRecovery != null) rendererCrashRecovery.onResume();
    }
}
