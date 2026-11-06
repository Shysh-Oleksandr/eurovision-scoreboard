package app.douzepoints;

import android.content.Context;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationAttributes;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONObject;

/**
 * The app's own haptics engine (docs/haptics.md §2). Plays the step lists
 * src/native/haptics renders: composition primitives at absolute times, so
 * the delays between them are worked out here from the device's real
 * primitive lengths. Primitives the vibrator lacks are swapped for the
 * nearest one it has; without composition support (before Android 11, or no
 * primitives at all) each step becomes a predefined click or tick.
 *
 * Android has no live parameter control, so the live methods are no-ops;
 * the reveal's heartbeat carries it.
 */
@CapacitorPlugin(name = "DouzeHaptics")
public class DouzeHapticsPlugin extends Plugin {

    /** A composition is split where the next step is further away than this. */
    private static final int MAX_GAP_MS = 400;
    /** And when it reaches this many primitives (devices cap compositions). */
    private static final int MAX_PRIMITIVES = 16;
    /** Without composition, pulses closer than this are dropped. */
    private static final int MIN_PULSE_GAP_MS = 50;

    private static final String[] NAMES = {
        "click", "tick", "lowTick", "thud", "spin", "quickRise", "slowRise", "quickFall", "doubleClick"
    };

    private Vibrator vibrator;
    private final Handler handler = new Handler(Looper.getMainLooper());
    /** Primitive name → the primitive id this device plays for it, or -1. */
    private final Map<String, Integer> resolved = new HashMap<>();
    /** Primitive id → its length on this device, in ms. */
    private final Map<Integer, Integer> durations = new HashMap<>();
    private boolean hasComposition = false;

    private static final class Step {
        final String name;
        final float scale;
        final int at;

        Step(String name, float scale, int at) {
            this.name = name;
            this.scale = scale;
            this.at = at;
        }
    }

    @Override
    public void load() {
        Context context = getContext();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager manager = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            vibrator = manager != null ? manager.getDefaultVibrator() : null;
        } else {
            vibrator = getLegacyVibrator(context);
        }

        if (vibrator == null || !vibrator.hasVibrator()) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            for (String name : NAMES) {
                resolved.put(name, resolvePrimitive(name));
            }
            hasComposition = resolved.get("click") != -1 || resolved.get("tick") != -1;
        }
    }

    @SuppressWarnings("deprecation")
    private Vibrator getLegacyVibrator(Context context) {
        return (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
    }

    @PluginMethod
    public void getCapabilities(PluginCall call) {
        JSObject result = new JSObject();
        boolean supported = vibrator != null && vibrator.hasVibrator();

        result.put("supportsHaptics", supported);
        result.put("composition", hasComposition);
        result.put("amplitudeControl", supported && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && vibrator.hasAmplitudeControl());

        JSArray primitives = new JSArray();

        for (String name : NAMES) {
            Integer id = resolved.get(name);

            if (id != null && id != -1 && id == primitiveId(name)) primitives.put(name);
        }
        result.put("primitives", primitives);
        call.resolve(result);
    }

    @PluginMethod
    public void prepare(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void play(PluginCall call) {
        if (vibrator == null || !vibrator.hasVibrator()) {
            call.resolve();
            return;
        }

        List<Step> steps = parseSteps(call.getArray("steps"));

        // A new cue replaces whatever is still scheduled.
        handler.removeCallbacksAndMessages(null);

        if (!steps.isEmpty()) {
            if (hasComposition && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                playComposition(steps);
            } else {
                playPredefined(steps);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        handler.removeCallbacksAndMessages(null);
        if (vibrator != null) vibrator.cancel();
        call.resolve();
    }

    @PluginMethod
    public void startLive(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void updateLive(PluginCall call) {
        call.resolve();
    }

    @PluginMethod
    public void stopLive(PluginCall call) {
        call.resolve();
    }

    // ── Parsing ─────────────────────────────────────────────────────────────

    private static List<Step> parseSteps(JSArray array) {
        List<Step> steps = new ArrayList<>();

        if (array == null) return steps;

        for (int index = 0; index < array.length(); index++) {
            JSONObject raw = array.optJSONObject(index);

            if (raw == null) continue;

            String name = raw.optString("p", "click");
            float scale = (float) Math.min(1, Math.max(0, raw.optDouble("s", 0.5)));
            int at = Math.max(0, raw.optInt("at", 0));

            if (scale > 0) steps.add(new Step(name, scale, at));
        }
        steps.sort((a, b) -> Integer.compare(a.at, b.at));
        return steps;
    }

    // ── Composition (Android 11+) ───────────────────────────────────────────

    /** The platform id for a primitive name, or -1 when this SDK lacks it. */
    private static int primitiveId(String name) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return -1;

        switch (name) {
            case "click":
                return VibrationEffect.Composition.PRIMITIVE_CLICK;
            case "tick":
                return VibrationEffect.Composition.PRIMITIVE_TICK;
            case "quickRise":
                return VibrationEffect.Composition.PRIMITIVE_QUICK_RISE;
            case "slowRise":
                return VibrationEffect.Composition.PRIMITIVE_SLOW_RISE;
            case "quickFall":
                return VibrationEffect.Composition.PRIMITIVE_QUICK_FALL;
            default:
                break;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return -1;

        switch (name) {
            case "lowTick":
                return VibrationEffect.Composition.PRIMITIVE_LOW_TICK;
            case "thud":
                return VibrationEffect.Composition.PRIMITIVE_THUD;
            case "spin":
                return VibrationEffect.Composition.PRIMITIVE_SPIN;
            default:
                return -1;
        }
    }

    /** The nearest primitive to try when one is missing. */
    private static String substitute(String name) {
        switch (name) {
            case "lowTick":
            case "quickFall":
                return "tick";
            case "spin":
            case "slowRise":
                return "quickRise";
            case "tick":
            case "thud":
            case "quickRise":
            case "doubleClick": // simple mode's effect; a click where compositions play
                return "click";
            default:
                return null;
        }
    }

    private boolean isSupported(int id) {
        if (id == -1 || Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return false;
        return vibrator.areAllPrimitivesSupported(id);
    }

    /** Follows the substitution chain to a primitive this vibrator plays. */
    private int resolvePrimitive(String name) {
        String current = name;

        while (current != null) {
            int id = primitiveId(current);

            if (isSupported(id)) return id;
            current = substitute(current);
        }
        return -1;
    }

    private int durationOf(int id) {
        Integer known = durations.get(id);

        if (known != null) return known;

        int duration;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            int[] measured = vibrator.getPrimitiveDurations(id);
            duration = measured.length > 0 && measured[0] > 0 ? measured[0] : 20;
        } else {
            duration = id == VibrationEffect.Composition.PRIMITIVE_SLOW_RISE
                ? 300
                : id == VibrationEffect.Composition.PRIMITIVE_QUICK_RISE
                    ? 120
                    : id == VibrationEffect.Composition.PRIMITIVE_QUICK_FALL ? 90 : 15;
        }
        durations.put(id, duration);
        return duration;
    }

    private void playComposition(List<Step> steps) {
        VibrationEffect.Composition composition = null;
        int chunkStart = 0;
        int cursor = 0;
        int count = 0;

        for (Step step : steps) {
            Integer resolvedId = resolved.get(step.name);
            int id = resolvedId != null ? resolvedId : -1;

            if (id == -1) continue;

            int delay = Math.max(0, step.at - cursor);

            if (composition != null && (delay > MAX_GAP_MS || count >= MAX_PRIMITIVES)) {
                schedule(composition.compose(), chunkStart);
                composition = null;
            }
            if (composition == null) {
                composition = VibrationEffect.startComposition();
                chunkStart = step.at;
                cursor = step.at;
                count = 0;
                delay = 0;
            }
            composition.addPrimitive(id, step.scale, delay);
            cursor = Math.max(cursor, step.at) + durationOf(id);
            count++;
        }
        if (composition != null) schedule(composition.compose(), chunkStart);
    }

    // ── Without composition ─────────────────────────────────────────────────

    private void playPredefined(List<Step> steps) {
        // A long: with an int, `at - Integer.MIN_VALUE` overflowed to a
        // negative gap and every step was skipped.
        long lastAt = Long.MIN_VALUE / 2;

        for (Step step : steps) {
            // Pulses closer than this blur into one on a basic motor.
            if (step.at - lastAt < MIN_PULSE_GAP_MS) continue;

            VibrationEffect effect = fallbackFor(step);

            if (effect == null) continue;
            lastAt = step.at;
            schedule(effect, step.at);
        }
    }

    /**
     * Without composition: the device's own tuned click / tick / heavy click
     * for knocks, and a pulse for the rises, falls and spins (a basic motor
     * can't shape them, so their length carries the weight instead).
     */
    private VibrationEffect fallbackFor(Step step) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return null;

        boolean predefined = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q;

        switch (step.name) {
            case "tick":
            case "lowTick":
                if (step.scale < 0.15) return null;
                return predefined
                    ? VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK)
                    : oneShot(12, step.scale);
            case "click":
                if (predefined) {
                    return VibrationEffect.createPredefined(
                        step.scale >= 0.7 ? VibrationEffect.EFFECT_HEAVY_CLICK : VibrationEffect.EFFECT_CLICK
                    );
                }
                return oneShot(step.scale >= 0.7 ? 30 : 18, step.scale);
            case "doubleClick":
                return predefined
                    ? VibrationEffect.createPredefined(VibrationEffect.EFFECT_DOUBLE_CLICK)
                    : oneShot(40, step.scale);
            case "thud":
                if (predefined) {
                    return VibrationEffect.createPredefined(
                        step.scale >= 0.5 ? VibrationEffect.EFFECT_HEAVY_CLICK : VibrationEffect.EFFECT_CLICK
                    );
                }
                return oneShot(30, step.scale);
            default:
                return oneShot(pulseLength(step), step.scale);
        }
    }

    private static int pulseLength(Step step) {
        int base;

        switch (step.name) {
            case "slowRise":
                base = 80;
                break;
            case "spin":
                base = 60;
                break;
            case "quickRise":
                base = 50;
                break;
            default:
                base = 40;
                break;
        }
        return Math.round(base * (0.6f + 0.4f * step.scale));
    }

    private VibrationEffect oneShot(int lengthMs, float scale) {
        int amplitude = vibrator.hasAmplitudeControl()
            ? Math.max(1, Math.round(scale * 255))
            : VibrationEffect.DEFAULT_AMPLITUDE;

        return VibrationEffect.createOneShot(lengthMs, amplitude);
    }

    // ── Playing ─────────────────────────────────────────────────────────────

    private void schedule(VibrationEffect effect, int atMs) {
        if (atMs <= 0) {
            vibrate(effect);
        } else {
            handler.postDelayed(() -> vibrate(effect), atMs);
        }
    }

    @SuppressWarnings("deprecation")
    private void vibrate(VibrationEffect effect) {
        if (vibrator == null) return;

        // Media usage: game and animation haptics, governed by the system's
        // media vibration setting rather than touch feedback.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            vibrator.vibrate(effect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_MEDIA));
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(effect, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).build());
        }
    }
}
